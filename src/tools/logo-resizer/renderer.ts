import pica from 'pica';
import type { LogoAsset, LogoSettings } from './types';
import { effectiveFontSize } from './types';

const picaRunner = pica();

export function logoGeometry(asset: LogoAsset, settings: LogoSettings) {
  const width = settings.width;
  const height = settings.height;
  const pad = asset.paddingOverride ?? settings.padding;
  const availableWidth = Math.max(1, width - pad * 2);
  const availableHeight = Math.max(1, height - pad * 2);
  const naturalWidth = asset.image.naturalWidth;
  const naturalHeight = asset.image.naturalHeight;
  if (naturalWidth < 1 || naturalHeight < 1) throw new Error(`Cannot read image dimensions: ${asset.source.name}`);
  const scaleRaw = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
  const isSvg = asset.source.type === 'image/svg+xml' || /\.svg$/i.test(asset.source.name);
  const scale = isSvg ? scaleRaw : Math.min(scaleRaw, 1);
  const displayWidth = naturalWidth * scale;
  const displayHeight = naturalHeight * scale;
  const imageOffset = asset.imageOffset !== 0 ? asset.imageOffset : settings.imageOffset;
  return {
    width, height, displayWidth, displayHeight, isSvg,
    x: (width - displayWidth) / 2,
    y: (height - displayHeight) / 2 + (imageOffset / 100) * height,
  };
}

function drawText(context: CanvasRenderingContext2D, asset: LogoAsset, settings: LogoSettings) {
  if (!asset.label) return;
  const size = effectiveFontSize(settings, asset.fontSizeOverride);
  context.fillStyle = settings.fontColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `${settings.bold ? '700' : '400'} ${size}px "${settings.fontFamily || 'Arial'}"`;
  const lines = asset.label.split('\n');
  const lineHeight = size * 1.25;
  const center = (settings.height * asset.textOffset) / 100;
  const firstLineY = center - (lineHeight * lines.length) / 2 + lineHeight / 2;
  lines.forEach((line, index) => context.fillText(line, settings.width / 2, firstLineY + index * lineHeight));
}

function paintWhite(context: CanvasRenderingContext2D, settings: LogoSettings) {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, settings.width, settings.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
}

/** Same placement, background, text, and no-raster-upscaling rules as CTK. */
export function drawLogoPreview(canvas: HTMLCanvasElement, asset: LogoAsset, settings: LogoSettings, displayScale = 1): void {
  // Presentation-only supersampling: exports still use the exact requested dimensions.
  const scale = Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;
  canvas.width = Math.max(1, Math.round(settings.width * scale));
  canvas.height = Math.max(1, Math.round(settings.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.setTransform(scale, 0, 0, scale, 0, 0);
  paintWhite(context, settings);
  const g = logoGeometry(asset, settings);
  let imageSource: CanvasImageSource = asset.image;
  let imageWidth = asset.image.naturalWidth;
  let imageHeight = asset.image.naturalHeight;
  // Keep CTK's staged downscaling for small previews.
  if (!g.isSvg && g.displayWidth > 0 && g.displayHeight > 0 &&
      g.displayWidth / imageWidth < 0.5 && g.displayHeight / imageHeight < 0.5) {
    let stage = document.createElement('canvas');
    stage.width = imageWidth;
    stage.height = imageHeight;
    stage.getContext('2d')?.drawImage(asset.image, 0, 0);
    while (imageWidth * 0.5 > g.displayWidth && imageHeight * 0.5 > g.displayHeight) {
      const nextWidth = Math.max(1, Math.floor(imageWidth * 0.5));
      const nextHeight = Math.max(1, Math.floor(imageHeight * 0.5));
      if (nextWidth >= imageWidth && nextHeight >= imageHeight) break;
      const next = document.createElement('canvas');
      next.width = nextWidth;
      next.height = nextHeight;
      const nextContext = next.getContext('2d');
      if (!nextContext) break;
      nextContext.imageSmoothingEnabled = true;
      nextContext.imageSmoothingQuality = 'high';
      nextContext.drawImage(stage, 0, 0, nextWidth, nextHeight);
      stage = next;
      imageWidth = nextWidth;
      imageHeight = nextHeight;
    }
    imageSource = stage;
  }
  context.drawImage(imageSource, 0, 0, imageWidth, imageHeight, g.x, g.y, g.displayWidth, g.displayHeight);
  drawText(context, asset, settings);
}

/** Preserves CTK's Pica resize parameters for final exports. */
export async function drawLogoExport(canvas: HTMLCanvasElement, asset: LogoAsset, settings: LogoSettings): Promise<void> {
  canvas.width = settings.width;
  canvas.height = settings.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  paintWhite(context, settings);
  const g = logoGeometry(asset, settings);
  if (g.displayWidth > 0 && g.displayHeight > 0) {
    const scaled = document.createElement('canvas');
    scaled.width = Math.max(1, Math.round(g.displayWidth));
    scaled.height = Math.max(1, Math.round(g.displayHeight));
    if (!g.isSvg) {
      await picaRunner.resize(asset.image, scaled, {
        unsharpAmount: 80,
        unsharpRadius: 0.6,
        unsharpThreshold: 2,
      });
    } else {
      scaled.getContext('2d')?.drawImage(asset.image, 0, 0, g.displayWidth, g.displayHeight);
    }
    context.drawImage(scaled, g.x, g.y, g.displayWidth, g.displayHeight);
  }
  drawText(context, asset, settings);
}

export async function logoToBlob(asset: LogoAsset, settings: LogoSettings): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await drawLogoExport(canvas, asset, settings);
  const mimeType = settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not export this logo')), mimeType, 0.95);
  });
}
