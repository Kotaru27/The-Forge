export type LogoFormat = 'png' | 'jpeg';
export type LogoServer = 's3' | 'aldi';

export interface LogoSettings {
  width: number;
  height: number;
  fontSize: string;
  fontFamily: string;
  fontColor: string;
  bold: boolean;
  syncFilename: boolean;
  padding: number;
  imageOffset: number;
  format: LogoFormat;
}

export interface LogoAsset {
  id: string;
  source: File;
  url: string;
  image: HTMLImageElement;
  filename: string;
  label: string;
  fontSizeOverride: number | null;
  paddingOverride: number | null;
  imageOffset: number;
  textOffset: number;
}

export type LogoEdits = Pick<LogoAsset, 'filename' | 'label' | 'fontSizeOverride' | 'paddingOverride' | 'imageOffset' | 'textOffset'>;

export const LOGO_PRESETS = [
  { width: 150, height: 150, label: '150 × 150' },
  { width: 200, height: 200, label: '200 × 200' },
  { width: 200, height: 150, label: '200 × 150' },
  { width: 250, height: 250, label: '250 × 250' },
] as const;

export const DEFAULT_LOGO_SETTINGS: LogoSettings = {
  width: 200,
  height: 200,
  fontSize: '',
  fontFamily: 'Arial',
  fontColor: '#000000',
  bold: false,
  syncFilename: true,
  padding: 0,
  imageOffset: 0,
  format: 'png',
};

export const LOGO_FONTS = [
  'Arial', 'Century Gothic', 'Calibri', 'Comic Sans MS', 'Courier New',
  'Georgia', 'Impact', 'Lucida Console', 'Palatino Linotype', 'Segoe UI',
  'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'sans-serif',
] as const;

export function sanitizeLogoFilename(value: string): string {
  // Matches original Core.Utils.sanitize, with control characters removed for safe downloads.
  return (value || '').replace(/\s+/g, '_').replace(/[\\/:*?"<>|\x00-\x1f]/g, '');
}

export function filenameFromSource(file: File): string {
  return sanitizeLogoFilename(file.name.replace(/\.[^/.]+$/, '').substring(0, 30));
}

export function validateLogoDimensions(width: number, height: number): boolean {
  return Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1 && width <= 8192 && height <= 8192;
}

export function uniqueExportNames<T extends { filename: string }>(assets: readonly T[], ext: 'png' | 'jpg'): string[] {
  const used = new Set<string>();
  return assets.map((asset, index) => {
    const stem = sanitizeLogoFilename(asset.filename || `logo_${index + 1}`) || `logo_${index + 1}`;
    let candidate = stem;
    let suffix = 2;
    while (used.has(`${candidate}.${ext}`.toLowerCase())) candidate = `${stem}_${suffix++}`;
    used.add(`${candidate}.${ext}`.toLowerCase());
    return `${candidate}.${ext}`;
  });
}

export function outputExtension(format: LogoFormat): 'png' | 'jpg' {
  return format === 'jpeg' ? 'jpg' : 'png';
}

export function effectiveFontSize(settings: LogoSettings, override: number | null): number {
  if (override !== null && Number.isFinite(override)) return override;
  const parsed = parseInt(settings.fontSize, 10);
  return Number.isNaN(parsed) ? 28 : Math.max(8, Math.min(parsed, 200));
}
