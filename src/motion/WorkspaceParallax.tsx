import { useEffect } from 'react';
import type { ToolId } from '../tools';

/**
 * The Forge has real, independent native scroll panels. Attach decorative
 * motion only to the ACTIVE tool's named panel(s); never control wheel input,
 * add smooth-scrolling libraries, or move previews, cards, text or controls.
 *
 * Osmo-inspired parallax: two graphite sketches drift at different fractions
 * of the panel's scrollTop. Each panel writes just two transform variables via
 * a single passive, rAF-coalesced scroll listener. No React frame renders.
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

export function WorkspaceParallax({ activeTool }: Props) {
  useEffect(() => {
    if (!activeTool) return;

    const wrapper = document.querySelector<HTMLElement>('.sketch-main-area .native-tool:not([hidden])');
    if (!wrapper) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const panels = [...new Set(PANELS[activeTool].flatMap(selector =>
      [...wrapper.querySelectorAll<HTMLElement>(selector)]
    ))];

    const disposers = panels.map((panel) => {
      const originalPosition = panel.style.position;
      const addPosition = getComputedStyle(panel).position === 'static';
      if (addPosition) panel.style.position = 'relative';

      panel.classList.add('forge-parallax-scroll');
      let raf = 0;
      let disposed = false;
      const update = () => {
        raf = 0;
        if (disposed) return;
        if (reduced.matches) {
          panel.style.removeProperty('--forge-parallax-near');
          panel.style.removeProperty('--forge-parallax-far');
          panel.classList.add('forge-parallax-disabled');
          return;
        }
        panel.classList.remove('forge-parallax-disabled');
        // Clamp drift, never translate contents or allow limitless movement.
        const progress = Math.max(0, Math.min(340, panel.scrollTop));
        panel.style.setProperty('--forge-parallax-near', Math.round(progress * .56) + 'px');
        panel.style.setProperty('--forge-parallax-far', Math.round(progress * .27) + 'px');
      };
      const onScroll = () => {
        if (!raf && !disposed) raf = window.requestAnimationFrame(update);
      };

      panel.addEventListener('scroll', onScroll, { passive: true });
      reduced.addEventListener('change', onScroll);
      update();

      return () => {
        disposed = true;
        panel.removeEventListener('scroll', onScroll);
        reduced.removeEventListener('change', onScroll);
        if (raf) window.cancelAnimationFrame(raf);
        panel.classList.remove('forge-parallax-scroll', 'forge-parallax-disabled');
        panel.style.removeProperty('--forge-parallax-near');
        panel.style.removeProperty('--forge-parallax-far');
        if (addPosition) panel.style.position = originalPosition;
      };
    });

    return () => { disposers.forEach(dispose => dispose()); };
  }, [activeTool]);

  return null;
}
