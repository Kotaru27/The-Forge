/**
 * PDF-to-image conversion contracts from CTK.
 * Keep processing at 2× PDF page size, PNG / 90%-quality JPEG, and ZIP names
 * compatible with the original PDF tool and its presentation companion.
 */
export type PdfOutputFormat = 'image/png' | 'image/jpeg';
export type ConvertedPage = { num: number; blob: Blob; checked: boolean };
export type ConvertedDocument = {
  name: string;
  format: PdfOutputFormat;
  pages: ConvertedPage[];
};
export type ArchiveFile = { path: string; blob: Blob };

export const PAGE_SCALE = 2;
export const JPEG_QUALITY = 0.9;
export const DEFAULT_FORMAT: PdfOutputFormat = 'image/png';
export const MAX_PDF_RASTER_SIDE = 8192;
export const MAX_PDF_RASTER_PIXELS = 32 * 1024 * 1024;

/** Reject hostile PDF page dimensions before allocating any browser canvas. */
export function assertPdfRasterSize(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || width > MAX_PDF_RASTER_SIDE ||
      height > MAX_PDF_RASTER_SIDE || width * height > MAX_PDF_RASTER_PIXELS) {
    throw Error('PDF page exceeds the safe browser canvas size limit.');
  }
}

export function isPdfFile(file: Pick<File, 'type' | 'name'>): boolean {
  return file.type.toLowerCase() === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function extensionFor(format: PdfOutputFormat): 'png' | 'jpg' {
  return format === 'image/jpeg' ? 'jpg' : 'png';
}

/** Remove unsafe archive path characters; never trust a user's PDF filename. */
export function safePdfBaseName(name: string): string {
  const normalized = String(name || 'document').replace(/\.pdf$/i, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/^\.+$/, 'document')
    .slice(0, 80);
  return normalized || 'document';
}

/** Matches the original single-page Save button name: document_001.jpg. */
export function singlePageFilename(doc: Pick<ConvertedDocument, 'name' | 'format'>, num: number): string {
  return `${safePdfBaseName(doc.name)}_${String(num).padStart(3, '0')}.${extensionFor(doc.format)}`;
}

/** Matches the original selected-pages ZIP: page number without a document folder. */
export function selectedEntries(doc: ConvertedDocument): ArchiveFile[] {
  return doc.pages.filter(page => page.checked).map(page => ({
    path: `${page.num}.${extensionFor(doc.format)}`,
    blob: page.blob,
  }));
}

/**
 * Matches CTK's Download All ZIP layout. Multi-document archives have
 * numbered folders, so same-name documents never overwrite each other.
 */
export function allEntries(documents: ConvertedDocument[]): ArchiveFile[] {
  const included = documents.filter(doc => doc.pages.length > 0);
  return included.flatMap((doc, index) => {
    const prefix = included.length > 1
      ? `${String(index + 1).padStart(2, '0')}_${safePdfBaseName(doc.name)}/`
      : '';
    return doc.pages.map(page => ({
      path: `${prefix}${String(page.num).padStart(3, '0')}.${extensionFor(doc.format)}`,
      blob: page.blob,
    }));
  });
}

export function abortError(): DOMException {
  return new DOMException('Processing canceled', 'AbortError');
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
