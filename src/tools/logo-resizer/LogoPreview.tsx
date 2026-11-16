import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { drawLogoPreview, getLogoPreviewBitmap } from './renderer';
import type { LogoAsset, LogoSettings } from './types';

type Props = { asset: LogoAsset; settings: LogoSettings; className?: string };
type PreviewJob = { run: () => void; visible: boolean };

// One shared scheduler: visible previews start one per animation frame; offscreen
// work is submitted only in browser idle time. Gallery scrolling updates
// one module-local timestamp, never React state or wheel behavior.
const queued = new Map<HTMLCanvasElement, PreviewJob>();
let visibleFrame = 0;
let idleTask = 0;

// Do not place canvas painting inside the frame budget while the user is
// actively wheel/trackpad scrolling through a populated gallery. Resume after
// a short quiet period; unchanged canvases stay cached and immediately visible.
const SCROLL_QUIET_MS = 120;
let lastGalleryScrollAt = Number.NEGATIVE_INFINITY;
let resumeTask = 0;

export function noteLogoGalleryScroll() {
  lastGalleryScrollAt = window.performance.now();
}
function galleryIsScrolling() {
  return window.performance.now() - lastGalleryScrollAt < SCROLL_QUIET_MS;
}
function scheduleAfterScroll() {
  if (resumeTask || !queued.size) return;
  const remaining = Math.max(16, SCROLL_QUIET_MS - (window.performance.now() - lastGalleryScrollAt));
  resumeTask = window.setTimeout(() => {
    resumeTask = 0;
    ensureScheduled();
  }, remaining);
}

function nextVisible() {
  visibleFrame = 0;
  if (galleryIsScrolling()) {
    scheduleAfterScroll();
    return;
  }
  for (const [canvas, job] of queued) {
    if (!job.visible) continue;
    queued.delete(canvas);
    job.run();
    break;
  }
  ensureScheduled();
}
function nextIdle(deadline?: IdleDeadline) {
  idleTask = 0;
  if (galleryIsScrolling()) {
    scheduleAfterScroll();
    return;
  }
  if (deadline && deadline.timeRemaining() < 5) {
    ensureScheduled();
    return;
  }
  for (const [canvas, job] of queued) {
    if (job.visible) continue;
    queued.delete(canvas);
    job.run();
    break;
  }
  ensureScheduled();
}
function ensureScheduled() {
  if (galleryIsScrolling()) {
    scheduleAfterScroll();
    return;
  }
  const jobs = [...queued.values()];
  if (!visibleFrame && jobs.some(job => job.visible)) {
    visibleFrame = window.requestAnimationFrame(nextVisible);
  }
  if (!idleTask && jobs.some(job => !job.visible)) {
    idleTask = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(nextIdle)
      : window.setTimeout(() => nextIdle(), 90);
  }
}
function requestPreview(canvas: HTMLCanvasElement, run: () => void, visible: boolean) {
  const existing = queued.get(canvas);
  queued.set(canvas, { run, visible: visible || !!existing?.visible });
  ensureScheduled();
}
function cancelPreview(canvas: HTMLCanvasElement) {
  queued.delete(canvas);
}

export const LogoPreview = memo(function LogoPreview({ asset, settings, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const renderRef = useRef<() => void>(() => {});
  const inViewRef = useRef(false);
  const revisionRef = useRef(0);
  const paintedRevisionRef = useRef(0);
  const previousSizeRef = useRef<{ width: number; height: number } | null>(null);

  const focused = className.split(' ').includes('logo-detail-preview');
  // Only the inspector receives an enlarged, high-DPI canvas preview.
  // Thumbnail sizes and the real image-export renderer stay unchanged.
  const maxSide = focused ? 320 : 250;
  const scale = focused
    ? Math.min(1.6, maxSide / Math.max(settings.width, settings.height))
    : Math.min(1, maxSide / Math.max(settings.width, settings.height));
  const width = Math.max(1, Math.round(settings.width * scale));
  const height = Math.max(1, Math.round(settings.height * scale));

  // Keep the small-batch resize cue; transform is compositor-only.
  useLayoutEffect(() => {
    const previous = previousSizeRef.current;
    previousSizeRef.current = { width, height };
    const frame = frameRef.current;
    if (!previous || !frame || focused ||
        frame.closest('.logo-bulk-workspace') ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        (previous.width === width && previous.height === height)) return;
    frame.animate([
      { transform: 'scale(' + previous.width / width + ', ' + previous.height / height + ')' },
      { transform: 'scale(1, 1)' },
    ], { duration: 240, easing: 'cubic-bezier(.16, 1, .3, 1)' });
  }, [width, height, focused]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const revision = ++revisionRef.current;
    const density = Math.min(2, window.devicePixelRatio || 1);
    const previewWidth = Math.max(1, Math.round(width * density));
    const previewHeight = Math.max(1, Math.round(height * density));
    renderRef.current = () => {
      if (paintedRevisionRef.current === revision) return;
      // Resizing/decoding a source is asynchronous. Its promise can resolve
      // alongside dozens of others, which previously burst-painted canvases
      // in one microtask turn and stole a wheel-scroll frame. Queue the FINAL
      // canvas paint through the same shared frame/idle budget instead.
      void getLogoPreviewBitmap(asset).then(bitmap => {
        if (revisionRef.current !== revision || paintedRevisionRef.current === revision ||
            !canvas.isConnected) return;
        requestPreview(canvas, () => {
          if (revisionRef.current !== revision || paintedRevisionRef.current === revision ||
              !canvas.isConnected) return;
          drawLogoPreview(canvas, asset, settings,
            { width: previewWidth, height: previewHeight }, bitmap);
          paintedRevisionRef.current = revision;
        }, inViewRef.current || !gallery);
      });
    };
    const gallery = canvas.closest('.logo-gallery');
    if (!gallery || inViewRef.current) {
      requestPreview(canvas, renderRef.current, true);
    } else if (canvas.closest('.native-tool:not([hidden])')) {
      requestPreview(canvas, renderRef.current, false);
    }
    return () => cancelPreview(canvas);
  // Filename, download format and filename-sync edits do not affect pixels.
  // Only image/geometry/text changes invalidate the bitmap canvas.
  }, [
    asset.image, asset.source, asset.label, asset.fontSizeOverride,
    asset.paddingOverride, asset.imageOffset, asset.textOffset,
    settings.width, settings.height, settings.padding, settings.imageOffset,
    settings.fontSize, settings.fontFamily, settings.fontColor, settings.bold,
    width, height,
  ]);

  useEffect(() => {
    const canvas = ref.current;
    const gallery = canvas?.closest('.logo-gallery');
    if (!canvas || !gallery) return;
    if (typeof IntersectionObserver === 'undefined') {
      inViewRef.current = true;
      requestPreview(canvas, renderRef.current, true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      inViewRef.current = visible;
      if (visible && paintedRevisionRef.current !== revisionRef.current) {
        requestPreview(canvas, renderRef.current, true);
      }
    }, { root: gallery, rootMargin: '300px 0px' });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      cancelPreview(canvas);
    };
  }, []);

  return <span ref={frameRef} className={'logo-preview-frame ' + className}
    style={focused ? { width, height: 'auto', aspectRatio: `${width} / ${height}` } : { width, height }}>
    <canvas aria-label={'Preview of ' + (asset.filename || asset.source.name)}
      className="logo-preview" ref={ref} />
  </span>;
});
