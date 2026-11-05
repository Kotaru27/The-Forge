import { getDocument, GlobalWorkerOptions, type RenderTask, type PDFDocumentLoadingTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { abortError, isAbortError, JPEG_QUALITY, PAGE_SCALE, type PdfOutputFormat } from './engine';

// Vite copies the real worker into the build, including GitHub Pages subpaths.
// Never rely on a global CDN worker or a version that differs from pdfjs-dist.
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type RenderedPage = { num: number; blob: Blob };
export type RenderProgress = { page: number; total: number };

function canvasToBlob(canvas: HTMLCanvasElement, format: PdfOutputFormat): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) reject(new Error('Unable to encode this PDF page.'));
      else resolve(blob);
    }, format, JPEG_QUALITY);
  });
}

/** Render pages individually to avoid keeping all full-size canvases in memory. */
export async function convertPdf(
  file: File,
  format: PdfOutputFormat,
  signal: AbortSignal,
  onTotal: (total: number) => void,
  onPage: (page: RenderedPage, progress: RenderProgress) => void,
): Promise<void> {
  if (signal.aborted) throw abortError();
  const data = new Uint8Array(await file.arrayBuffer());
  if (signal.aborted) throw abortError();

  let loading: PDFDocumentLoadingTask | null = null;
  let rendering: RenderTask | null = null;
  const cancel = () => {
    try { rendering?.cancel(); } catch { /* cancel is best-effort */ }
    if (loading) void loading.destroy().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });

  try {
    loading = getDocument({ data, isEvalSupported: false });
    if (signal.aborted) throw abortError();
    const doc = await loading.promise;
    if (signal.aborted) throw abortError();
    onTotal(doc.numPages);
    for (let num = 1; num <= doc.numPages; num++) {
      if (signal.aborted) throw abortError();
      // Yield between pages to allow the Cancel control to remain responsive.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (signal.aborted) throw abortError();
      const page = await doc.getPage(num);
      if (signal.aborted) throw abortError();
      const viewport = page.getViewport({ scale: PAGE_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      if (canvas.width === 0 || canvas.height === 0) throw new Error('This page has invalid dimensions.');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to create an image canvas.');
      try {
        // Explicit white background matches the original export behavior.
        rendering = page.render({ canvas, canvasContext: context, viewport, background: 'rgb(255,255,255)' });
        await rendering.promise;
        if (signal.aborted) throw abortError();
        const blob = await canvasToBlob(canvas, format);
        if (signal.aborted) throw abortError();
        onPage({ num, blob }, { page: num, total: doc.numPages });
      } finally {
        rendering = null;
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } catch (error) {
    if (signal.aborted || isAbortError(error)) throw abortError();
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
    if (loading) {
      try { await loading.destroy(); } catch { /* already canceled or finished */ }
    }
  }
}
