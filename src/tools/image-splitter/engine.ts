/** The original splitter cuts one horizontal row into N left-to-right columns. */
export const MIN_COLUMNS = 1;
export const MAX_COLUMNS = 50;
export const DEFAULT_COLUMNS = 2;

export type Cut = { startX: number; width: number; index: number };
export type FilePiece = { blob: Blob; extension: string };
export type ExportSource = { file: File; checked: boolean; pieces: FilePiece[] };
export type ExportFile = { name: string; blob: Blob };

export function safeColumns(value: number | string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_COLUMNS;
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, Math.trunc(parsed)));
}

/** Whole-pixel cut boundaries preserve every original column, including remainders. */
export function getCuts(width: number, columns: number): Cut[] {
  if (!Number.isSafeInteger(width) || width < 1) throw new Error('Image width is invalid.');
  if (!Number.isSafeInteger(columns) || columns < MIN_COLUMNS || columns > MAX_COLUMNS) {
    throw new Error('Choose between 1 and 50 columns.');
  }
  if (columns > width) throw new Error(`This image is only ${width}px wide; choose at most ${width} columns.`);
  return Array.from({ length: columns }, (_, index) => {
    const startX = Math.floor(index * width / columns);
    return { index, startX, width: Math.floor((index + 1) * width / columns) - startX };
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name);
}

export function outputMime(file: File): 'image/png' | 'image/jpeg' | 'image/webp' {
  const type = file.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/webp') return type;
  if (type === 'image/png') return type;
  // Browser Canvas cannot encode SVG, GIF, BMP or AVIF reliably. Use real PNG bytes and extension.
  return 'image/png';
}

export function pieceExtension(blob: Blob, file: File): string {
  switch (blob.type.toLowerCase()) {
    case 'image/jpeg': return /\.jpeg$/i.test(file.name) ? 'jpeg' : 'jpg';
    case 'image/webp': return 'webp';
    default: return 'png';
  }
}

export function originalExtension(file: File): string {
  const suffix = file.name.match(/\.([a-z\d]{1,12})$/i)?.[1]?.toLowerCase();
  if (suffix) return suffix;
  return file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
}

/** Keep original ZIP behavior: every uploaded file appears, unselected files stay whole. */
export function getExportFiles(items: ExportSource[]): ExportFile[] {
  const results: ExportFile[] = [];
  for (const item of items) {
    if (item.checked && item.pieces.length) {
      for (const piece of item.pieces) {
        results.push({ name: `${results.length + 1}.${piece.extension}`, blob: piece.blob });
      }
    } else {
      results.push({ name: `${results.length + 1}.${originalExtension(item.file)}`, blob: item.file });
    }
  }
  return results;
}

export async function splitIntoColumns(file: File, columns: number): Promise<FilePiece[]> {
  const url = URL.createObjectURL(file);
  let image: HTMLImageElement | null = null;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Cannot read image: ${file.name}`));
      element.src = url;
    });
    const height = image.naturalHeight;
    if (!Number.isSafeInteger(height) || height < 1) throw new Error(`Invalid image height: ${file.name}`);
    const cuts = getCuts(image.naturalWidth, columns);
    const preferredMime = outputMime(file);
    const pieces: FilePiece[] = [];
    for (const cut of cuts) {
      const canvas = document.createElement('canvas');
      canvas.width = cut.width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing is not supported in this browser.');
      // Integer source/destination dimensions prevent softened edges and dropped pixels.
      context.drawImage(image, cut.startX, 0, cut.width, height, 0, 0, cut.width, height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to create image part.')), preferredMime, 0.95);
      });
      pieces.push({ blob, extension: pieceExtension(blob, file) });
      canvas.width = 0;
      canvas.height = 0;
    }
    return pieces;
  } finally {
    // Releasing the temporary decoder URL does not affect the UI thumbnail URL.
    image = null;
    URL.revokeObjectURL(url);
  }
}
