import { memo, useEffect, useRef } from 'react';
import { drawLogoPreview } from './renderer';
import type { LogoAsset, LogoSettings } from './types';

type Props = { asset: LogoAsset; settings: LogoSettings; className?: string };
export const LogoPreview = memo(function LogoPreview({ asset, settings, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    drawLogoPreview(ref.current, asset, settings);
  }, [asset, settings]);
  // Animate only the on-screen dimensions. The real canvas and export renderer
  // retain exact pixel dimensions, Pica settings, and CTK's white background.
  const focusPreview = className.split(' ').includes('logo-detail-preview');
  const limit = focusPreview ? 280 : 250;
  const scale = Math.min(1, limit / Math.max(settings.width, settings.height));
  const displayWidth = Math.max(1, Math.round(settings.width * scale));
  const displayHeight = Math.max(1, Math.round(settings.height * scale));
  return (
    <span
      className={`logo-preview-frame ${className}`}
      style={{ width: displayWidth, height: displayHeight }}
    >
      <canvas
        aria-label={`Preview of ${asset.filename || asset.source.name}`}
        className="logo-preview"
        ref={ref}
      />
    </span>
  );
});
