
/* The Forge / Logo Studio interaction layer. Hooks existing CTK controls; processing untouched. */
(() => {
  'use strict';
  const mount = () => {
    const section = document.getElementById('section-logo');
    const grid = document.getElementById('logoGrid');
    const width = document.getElementById('exportWidth');
    const height = document.getElementById('exportHeight');
    if (!section || !grid || !width || !height || grid.dataset.forgeStudioReady) return;
    grid.dataset.forgeStudioReady = 'true';
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panel = width.closest('.control-group');
    const presets = [[150, 150], [200, 200], [200, 150], [250, 250]];
    const presetArea = document.createElement('div');
    presetArea.className = 'forge-presets';
    const presetLabel = document.createElement('div');
    presetLabel.className = 'forge-presets-label';
    presetLabel.textContent = 'QUICK DIMENSIONS';
    const presetList = document.createElement('div');
    presetList.className = 'forge-presets-list';
    const presetButtons = presets.map(([w, h]) => {
      const button = document.createElement('button');
      button.className = 'forge-preset';
      button.type = 'button';
      button.textContent = w + ' × ' + h;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        width.value = String(w);
        height.value = String(h);
        width.dispatchEvent(new Event('input', { bubbles: true }));
        height.dispatchEvent(new Event('input', { bubbles: true }));
        applyDimensions();
      });
      presetList.appendChild(button);
      return button;
    });
    presetArea.append(presetLabel, presetList);
    const sizeInputs = width.closest('.tiny-row');
    if (panel && sizeInputs) panel.insertBefore(presetArea, sizeInputs);

    const heading = document.createElement('div');
    heading.className = 'forge-stage-toolbar';
    heading.innerHTML = '<div class="forge-stage-title"><strong>Asset board</strong><span>02 / YOUR OUTPUTS</span></div><div class="forge-stage-side"><span class="forge-stage-count" aria-live="polite">0 ASSETS</span><span class="forge-stage-hint">Drop artwork anywhere on the board</span></div>';
    grid.prepend(heading);

    const drop = document.createElement('div');
    drop.className = 'forge-stage-drop';
    drop.setAttribute('aria-hidden', 'true');
    drop.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 16V3m0 0L7 8m5-5 5 5M4 16v4h16v-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg><strong>Drop to import artwork</strong><span>PNG · JPG · SVG · PPTX · XLSX</span>';
    grid.appendChild(drop);
    const badge = heading.querySelector('.forge-stage-count');
    let previousCount = -1;
    let paintQueued = false;
    const applyDimensions = () => {
      const w = Number(width.value);
      const h = Number(height.value);
      const aspect = w > 0 && h > 0 ? Math.max(0.63, Math.min(2.1, w / h)) : 1;
      grid.style.setProperty('--forge-logo-ratio', String(aspect));
      presetButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(w === presets[i][0] && h === presets[i][1])));
    };
    const prepareCard = (card, index, animate) => {
      if (!(card instanceof HTMLElement) || !card.classList.contains('logo-card-item')) return;
      const preview = card.querySelector('.card-preview-area');
      if (preview instanceof HTMLElement && !preview.hasAttribute('tabindex')) {
        preview.tabIndex = 0;
        preview.setAttribute('role', 'button');
        preview.setAttribute('aria-label', 'Open this logo in the asset inspector');
        preview.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            preview.click();
          }
        });
      }
      if (animate && !reducedMotion() && typeof card.animate === 'function') {
        card.animate(
          [{ opacity: 0, transform: 'translate3d(0, 17px, 0) scale(.978)' }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }],
          { duration: 560, delay: Math.min(index * 45, 250), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
        );
      }
    };
    const paint = () => {
      paintQueued = false;
      // The CTK clear action replaces grid children. Restore non-processing UI after reset.
      if (!grid.contains(heading)) grid.prepend(heading);
      if (!grid.contains(drop)) grid.appendChild(drop);
      const cards = Array.from(grid.querySelectorAll(':scope > .logo-card-item'));
      cards.forEach((card, index) => prepareCard(card, index, false));
      if (cards.length !== previousCount) {
        badge.textContent = cards.length + (cards.length === 1 ? ' ASSET' : ' ASSETS');
        if (previousCount >= 0 && !reducedMotion() && typeof badge.animate === 'function') {
          badge.animate([{ opacity: .5, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 290, easing: 'ease-out' });
        }
        previousCount = cards.length;
      }
      applyDimensions();
    };
    const schedulePaint = () => {
      if (!paintQueued) {
        paintQueued = true;
        requestAnimationFrame(paint);
      }
    };
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        Array.from(change.addedNodes).forEach((node, index) => prepareCard(node, index, true));
      }
      schedulePaint();
    });
    observer.observe(grid, { childList: true });
    width.addEventListener('input', schedulePaint);
    height.addEventListener('input', schedulePaint);
    const dimensionOverlay = document.getElementById('logoDimensionOverlay');
    if (dimensionOverlay) {
      new MutationObserver(() => {
        if (!dimensionOverlay.hidden) {
          const w = dimensionOverlay.querySelector('#logoDimWidth');
          const h = dimensionOverlay.querySelector('#logoDimHeight');
          if (w) w.value = width.value || '200';
          if (h) h.value = height.value || '200';
        } else schedulePaint();
      }).observe(dimensionOverlay, { attributes: true, attributeFilter: ['hidden'] });
    }
    // Keep native input semantics while making the full canvas an import target.
    const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
    let dragDepth = 0;
    grid.addEventListener('dragenter', (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepth++;
      grid.classList.add('is-dragging');
    });
    grid.addEventListener('dragover', (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    grid.addEventListener('dragleave', (e) => {
      if (!isFileDrag(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) grid.classList.remove('is-dragging');
    });
    grid.addEventListener('drop', (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepth = 0;
      grid.classList.remove('is-dragging');
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length && typeof Tools !== 'undefined' && Tools.Logo && typeof Tools.Logo.handleFiles === 'function') Tools.Logo.handleFiles(files);
    });
    // Surface slider values visually without replacing their original event handlers.
    for (const id of ['globalPadding', 'globalImgPos']) {
      const input = document.getElementById(id);
      const header = input?.closest('[style*="flex-direction: column"]')?.querySelector('.label-header');
      if (!input || !header || header.querySelector('.forge-slider-value')) continue;
      const value = document.createElement('span');
      value.className = 'forge-slider-value';
      value.setAttribute('aria-hidden', 'true');
      const update = () => { value.textContent = input.value + 'px'; };
      input.addEventListener('input', update);
      header.appendChild(value);
      update();
    }
    schedulePaint();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
