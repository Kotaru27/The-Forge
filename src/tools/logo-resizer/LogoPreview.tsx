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
  return <canvas aria-label={`Preview of ${asset.filename || asset.source.name}`} className={`logo-preview ${className}`} ref={ref} />;
});
