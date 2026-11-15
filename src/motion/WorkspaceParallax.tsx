import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ToolId } from '../tools';

/**
 * Select the actual NATIVE scroll panels inside each workroom. Some inner
 * panels (e.g., Ad Downloader's queue) mount only after files are imported;
 * their always-present workspace is still an active parallax target.
 */
const PANELS: Record<ToolId, readonly string[]> = {
  'logo-resizer': ['.logo-gallery', '.logo-detail'],
  'pdf-to-image': ['.pdf-list', '.pdf-setup'],
  'image-splitter': ['.split-card-grid', '.split-settings'],
  'video-stills': ['.vs-stacks', '.vs-workbench-side'],
  'storyboard': ['.sb-stage', '.sb-controls'],
  'link-generator': ['.link-filename-preview', '.link-generator'],
  'ad-downloader': ['.adw-table-wrap', '.adw-workspace'],
};

type Props = { activeTool: ToolId | null };

/**
 * Osmo-inspired two-depth parallax without a virtual scrolling stack.
 *
 * Portal the lightweight ARTWORK into the active native panel(s), then
 * transform the two actual DOM layers directly in a single passive-scroll
 * rAF. No React renders per frame, no inherited CSS variable invalidation,
 * no changes to wheel input, layout, previews, data or control elements.
 */
export function WorkspaceParallax({ activeTool }: Props) {
  const [panels, setPanels] = useState<HTMLElement[]>([]);

  useLayoutEffect(() => {
    if (!activeTool) {
      setPanels([]);
      return;
    }
    const wrapper = document.querySelector<HTMLElement>('.sketch-main-area .native-tool:not([hidden])');
    const targets = wrapper
      ? [...new Set(PANELS[activeTool].flatMap(selector =>
        [...wrapper.querySelectorAll<HTMLElement>(selector)]
      ))]
      : [];
    setPanels(targets);
  }, [activeTool]);

  useEffect(() => {
    if (!activeTool || !panels.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const disposers = panels.map(panel => {
      const near = panel.querySelector<HTMLElement>('.forge-parallax-near');
      const far = panel.querySelector<HTMLElement>('.forge-parallax-far');
      if (!near || !far) return () => {};

      const previousPosition = panel.style.position;
      const changedPosition = getComputedStyle(panel).position === 'static';
      if (changedPosition) panel.style.position = 'relative';
      panel.classList.add('forge-parallax-scroll');

      let frame = 0;
      let disposed = false;
      const paint = () => {
        frame = 0;
        if (disposed) return;
        if (reduced.matches) {
          panel.classList.add('forge-parallax-disabled');
          near.style.transform = '';
          far.style.transform = '';
          return;
        }
        panel.classList.remove('forge-parallax-disabled');
        const distance = Math.max(0, Math.min(340, panel.scrollTop));
        near.style.transform = 'translate3d(0,' + Math.round(distance * .56) + 'px,0)';
        far.style.transform = 'translate3d(0,' + Math.round(distance * .27) + 'px,0)';
      };
      const onScroll = () => {
        if (!frame && !disposed) frame = window.requestAnimationFrame(paint);
      };
      panel.addEventListener('scroll', onScroll, { passive: true });
      reduced.addEventListener('change', onScroll);
      paint();

      return () => {
        disposed = true;
        panel.removeEventListener('scroll', onScroll);
        reduced.removeEventListener('change', onScroll);
        if (frame) window.cancelAnimationFrame(frame);
        panel.classList.remove('forge-parallax-scroll', 'forge-parallax-disabled');
        near.style.transform = '';
        far.style.transform = '';
        if (changedPosition) panel.style.position = previousPosition;
      };
    });
    return () => { disposers.forEach(dispose => dispose()); };
  }, [activeTool, panels]);

  return (
    <>
      {panels.map((panel, index) => createPortal(
        <div className="forge-parallax-art" aria-hidden="true" data-parallax-panel={activeTool || undefined}>
          <span className="forge-parallax-near" />
          <span className="forge-parallax-far" />
        </div>,
        panel,
        'forge-parallax-' + index,
      ))}
    </>
  );
}
