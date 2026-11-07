import { memo, useLayoutEffect, useRef } from 'react';
import { drawLogoPreview } from './renderer';
import type { LogoAsset, LogoSettings } from './types';

type Props = { asset: LogoAsset; settings: LogoSettings; className?: string };
export const LogoPreview = memo(function LogoPreview({ asset, settings, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Animate the displayed frame, never the exported bitmap.

  const focused = className.split(' ').includes('logo-detail-preview');
  const maxSide = focused ? 208 : 250;
  // Focus Mode can enlarge the display of a small output canvas; never alter export pixels.
  const scale = focused
    ? Math.min(4, maxSide / Math.max(settings.width, settings.height))
    : Math.min(1, maxSide / Math.max(settings.width, settings.height));
  const width = Math.max(1, Math.round(settings.width * scale));
  const height = Math.max(1, Math.round(settings.height * scale));
  const previewScale = focused ? scale * Math.min(window.devicePixelRatio || 1, 2) : 1;
  useLayoutEffect(() => {
    if (!ref.current) return;
    drawLogoPreview(ref.current, asset, settings, previewScale);
  }, [asset, settings, previewScale]);
  return <span className={`logo-preview-frame ${className}`} style={{ width, height }}>
    <canvas aria-label={`Preview of ${asset.filename || asset.source.name}`} className="logo-preview" ref={ref}/>
  </span>;
});
