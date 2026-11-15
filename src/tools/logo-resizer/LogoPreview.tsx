import { memo, useEffect, useRef } from 'react';
import { drawLogoPreview } from './renderer';
import type { LogoAsset, LogoSettings } from './types';

type Props = { asset: LogoAsset; settings: LogoSettings; className?: string };
export const LogoPreview = memo(function LogoPreview({ asset, settings, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<() => void>(() => {});
  const inViewRef = useRef(false);
  const revisionRef = useRef(0);
  const paintedRevisionRef = useRef(0);
  const idleRef = useRef<number | null>(null);

  // Visibility is a rendering boundary, not a request to redraw on every
  // scroll-out/scroll-in cycle. Each asset/settings revision is painted once.
  useEffect(() => {
    const revision = ++revisionRef.current;
    drawRef.current = () => {
      const canvas = ref.current;
      if (!canvas || paintedRevisionRef.current === revision) return;
      drawLogoPreview(canvas, asset, settings);
      paintedRevisionRef.current = revision;
    };

    const gallery = ref.current?.closest('.logo-gallery');
    if (!gallery || inViewRef.current) {
      drawRef.current();
    } else if (ref.current?.closest('.native-tool:not([hidden])') &&
               typeof window.requestIdleCallback === 'function') {
      // Prewarm offscreen thumbnails only when the browser has spare frame
      // time, so the first visit during wheel scrolling is usually cached.
      const prewarm = (deadline: IdleDeadline) => {
        idleRef.current = null;
        if (paintedRevisionRef.current === revision || inViewRef.current) return;
        if (deadline.timeRemaining() < 5) {
          idleRef.current = window.requestIdleCallback(prewarm);
          return;
        }
        drawRef.current();
      };
      idleRef.current = window.requestIdleCallback(prewarm);
    }
    return () => {
      if (idleRef.current !== null) {
        window.cancelIdleCallback(idleRef.current);
        idleRef.current = null;
      }
    };
  }, [asset, settings]);

  useEffect(() => {
    const canvas = ref.current;
    const gallery = canvas?.closest('.logo-gallery');
    if (!canvas || !gallery || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      inViewRef.current = visible;
      if (visible) {
        if (idleRef.current !== null) {
          window.cancelIdleCallback(idleRef.current);
          idleRef.current = null;
        }
        drawRef.current();
      }
    }, { root: gallery, rootMargin: '300px 0px' });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  // Animate the displayed frame, never the actual canvas pixels used by CTK/Pica exports.
  const focused = className.split(' ').includes('logo-detail-preview');
  const maxSide = focused ? 280 : 250;
  const scale = Math.min(1, maxSide / Math.max(settings.width, settings.height));
  const width = Math.max(1, Math.round(settings.width * scale));
  const height = Math.max(1, Math.round(settings.height * scale));
  return <span className={`logo-preview-frame ${className}`} style={{ width, height }}>
    <canvas aria-label={`Preview of ${asset.filename || asset.source.name}`} className="logo-preview" ref={ref}/>
  </span>;
});
