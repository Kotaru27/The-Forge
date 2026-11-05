import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import JSZip from 'jszip';
import { downloadBlob } from '../../utils/download';
import {
  allEntries, DEFAULT_FORMAT, isAbortError, isPdfFile, selectedEntries,
  singlePageFilename, type ConvertedDocument, type PdfOutputFormat,
} from './engine';
import { convertPdf } from './renderer';
import './pdf-to-image.css';

type Page = { num: number; blob: Blob; url: string; checked: boolean };
type Document = Omit<ConvertedDocument, 'pages'> & {
  id: number;
  file: File;
  total: number;
  pages: Page[];
  state: 'processing' | 'ready' | 'failed' | 'canceled';
  error?: string;
};
type Pending = { file: File; format: PdfOutputFormat };
type UndoSnapshot = { documents: Document[]; pending: Pending[] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error');
}

async function zipFiles(
  files: { path: string; blob: Blob }[],
  onProgress: (percent: number) => void,
): Promise<Blob> {
  const archive = new JSZip();
  for (const file of files) archive.file(file.path, file.blob);
  return archive.generateAsync({ type: 'blob' }, progress => onProgress(Math.round(progress.percent)));
}

export function PdfToImage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const documentsRef = useRef<Document[]>([]);
  const [format, setFormat] = useState<PdfOutputFormat>(DEFAULT_FORMAT);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const aliveRef = useRef(true);
  const generationRef = useRef(0);
  const nextId = useRef(1);
  const workingRef = useRef(false);
  const pendingRef = useRef<Pending[]>([]);
  const activeAbortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef(new Set<string>());

  function changeDocuments(update: (current: Document[]) => Document[]) {
    if (!aliveRef.current) return;
    documentsRef.current = update(documentsRef.current);
    setDocuments(documentsRef.current);
  }
  function createUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }
  function revokePreviewUrls() {
    for (const doc of documentsRef.current) for (const page of doc.pages) {
      URL.revokeObjectURL(page.url);
      urlsRef.current.delete(page.url);
    }
  }

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      generationRef.current += 1;
      pendingRef.current = [];
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      urlsRef.current.forEach(url => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    };
  }, []);

  // One PDF is rendered at a time: predictable progress, bounded memory,
  // and no cross-document page or state mixups when adding more files.
  async function processQueue() {
    if (workingRef.current) return;
    workingRef.current = true;
    setBusy(true);
    const generation = generationRef.current;
    try {
      while (pendingRef.current.length && generation === generationRef.current && aliveRef.current) {
        const next = pendingRef.current.shift()!;
        const id = nextId.current++;
        const controller = new AbortController();
        activeAbortRef.current = controller;
        changeDocuments(current => [...current, {
          id, file: next.file, name: next.file.name, format: next.format,
          total: 0, pages: [], state: 'processing',
        }]);
        setProgress(`Opening ${next.file.name}`);
        setProgressPercent(0);
        try {
          await convertPdf(next.file, next.format, controller.signal, total => {
            if (generation !== generationRef.current) return;
            changeDocuments(current => current.map(doc => doc.id === id ? { ...doc, total } : doc));
          }, ({ num, blob }, { total }) => {
            if (generation !== generationRef.current || controller.signal.aborted) return;
            const url = createUrl(blob);
            changeDocuments(current => current.map(doc => doc.id === id
              ? { ...doc, pages: [...doc.pages, { num, blob, url, checked: true }] }
              : doc));
            setProgress(`Rendering ${next.file.name} · Page ${num}/${total}`);
            setProgressPercent(Math.round(num / total * 100));
          });
          if (generation === generationRef.current) {
            changeDocuments(current => current.map(doc => doc.id === id ? { ...doc, state: 'ready' } : doc));
          }
        } catch (cause) {
          if (generation === generationRef.current) {
            const canceled = controller.signal.aborted || isAbortError(cause);
            changeDocuments(current => current.map(doc => doc.id === id
              ? { ...doc, state: canceled ? 'canceled' : 'failed', error: canceled ? undefined : errorMessage(cause) }
              : doc));
            if (!canceled) setError(`Couldn't process ${next.file.name}: ${errorMessage(cause)}`);
            else setProgress('Conversion canceled');
          }
        } finally {
          if (activeAbortRef.current === controller) activeAbortRef.current = null;
        }
      }
    } finally {
      workingRef.current = false;
      if (generation === generationRef.current && aliveRef.current) {
        setBusy(false);
      }
      // A Clear followed immediately by Undo may queue a new generation while
      // the canceled renderer is still closing. Start it once this loop exits.
      if (pendingRef.current.length && aliveRef.current) void processQueue();
    }
  }

  function addFiles(files: File[]) {
    const accepted = files.filter(isPdfFile);
    const skipped = files.length - accepted.length;
    if (!accepted.length) {
      setError('Please choose PDF files.');
      return;
    }
    setError(skipped ? `${skipped} non-PDF file${skipped === 1 ? '' : 's'} skipped.` : '');
    setUndoSnapshot(null);
    pendingRef.current.push(...accepted.map(file => ({ file, format })));
    void processQueue();
  }
  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.currentTarget.value = '';
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }
  function cancel() {
    pendingRef.current = [];
    activeAbortRef.current?.abort();
    setProgress('Canceling conversion…');
  }

  function confirmClear() {
    // Retain the blobs, selected page flags and original File objects for Undo.
    const snapshot: UndoSnapshot = { documents: documentsRef.current, pending: [...pendingRef.current] };
    generationRef.current += 1;
    pendingRef.current = [];
    activeAbortRef.current?.abort();
    revokePreviewUrls();
    documentsRef.current = [];
    setDocuments([]);
    setDetailId(null);
    setError('');
    setProgress('');
    setProgressPercent(0);
    setShowClearConfirm(false);
    setUndoSnapshot(snapshot);
    setBusy(false);
  }
  function undoClear() {
    if (!undoSnapshot) return;
    // Work in progress is restarted from its original file. Finished results
    // are restored from their original blobs without re-rendering or lost edits.
    const toReprocess: Pending[] = [...undoSnapshot.pending];
    const restored: Document[] = [];
    for (const doc of undoSnapshot.documents) {
      if (doc.state === 'processing') {
        toReprocess.push({ file: doc.file, format: doc.format });
        continue;
      }
      restored.push({
        ...doc,
        pages: doc.pages.map(page => ({ ...page, url: createUrl(page.blob) })),
      });
    }
    documentsRef.current = restored;
    setDocuments(restored);
    setUndoSnapshot(null);
    setProgress('Clear undone — PDF pages and selections restored.');
    pendingRef.current.push(...toReprocess);
    if (toReprocess.length) void processQueue();
  }

  const active = documents.find(doc => doc.id === detailId) ?? null;
  function changeChecked(documentId: number, num: number, checked: boolean) {
    changeDocuments(current => current.map(doc => doc.id === documentId ? {
      ...doc, pages: doc.pages.map(page => page.num === num ? { ...page, checked } : page),
    } : doc));
  }
  function changeAllChecked(documentId: number, checked: boolean) {
    changeDocuments(current => current.map(doc => doc.id === documentId ? {
      ...doc, pages: doc.pages.map(page => ({ ...page, checked })),
    } : doc));
  }
  async function doDownload(entries: { path: string; blob: Blob }[], name: string) {
    if (!entries.length) { setError('No pages selected.'); return; }
    if (downloading) return;
    setDownloading(true);
    setError('');
    try {
      const zip = await zipFiles(entries, percent => setProgress(`Preparing ZIP · ${percent}%`));
      downloadBlob(zip, name, urlsRef.current);
      setProgress(`${entries.length} image${entries.length === 1 ? '' : 's'} added to ${name}`);
    } catch (cause) {
      setError(`Unable to create ZIP: ${errorMessage(cause)}`);
    } finally {
      setDownloading(false);
    }
  }
  function downloadSelected() {
    if (!active) return;
    void doDownload(selectedEntries(active), `${active.name}_images.zip`);
  }
  function downloadAll() {
    void doDownload(allEntries(documents), 'pdf-images.zip');
  }
  function savePage(doc: Document, page: Page) {
    downloadBlob(page.blob, singlePageFilename(doc, page.num), urlsRef.current);
  }

  useEffect(() => {
    if (detailId === null) return;
    closeRef.current?.focus();
  }, [detailId]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setDetailId(null); return; }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'a') { event.preventDefault(); changeAllChecked(active!.id, true); }
      if (key === 's') { event.preventDefault(); downloadSelected(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const pageCount = documents.reduce((sum, doc) => sum + doc.pages.length, 0);
  const selectCount = active?.pages.filter(page => page.checked).length ?? 0;
  const allSelected = active != null && active.pages.length > 0 && selectCount === active.pages.length;
  const anySelection = selectCount > 0 && !allSelected;

  return <section className="pdf-workspace" aria-label="PDF to Image">
    <aside className="pdf-setup" aria-label="PDF settings">
      <h2>PDF to Image</h2>
      <p className="pdf-muted">Convert PDF pages into PNG or JPG images.</p>
      <div className={`pdf-drop${dragging ? ' is-dragging' : ''}`} onDrop={onDrop}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={event => { event.preventDefault(); setDragging(false); }}>
        <input type="file" ref={inputRef} accept=".pdf,application/pdf" multiple
          aria-label="Upload PDF files" onChange={onUpload} />
        <button type="button" onClick={() => inputRef.current?.click()}>Add PDF Files</button>
        <span>or drop PDF files here</span>
      </div>
      <label className="pdf-field">Output format
        <select value={format} onChange={event => setFormat(event.target.value as PdfOutputFormat)}>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPG</option>
        </select>
      </label>
      <p className="pdf-muted">PNG for sharp detail · JPG for smaller files.</p>
      {busy && <button className="pdf-cancel" type="button" onClick={cancel}>Cancel processing</button>}
      <button className="pdf-secondary" type="button" disabled={downloading || documents.length === 0}
        onClick={() => setShowClearConfirm(true)}>Clear all</button>
      {undoSnapshot && <div className="pdf-undo" role="status">PDFs cleared. <button onClick={undoClear} type="button">Undo</button></div>}
      <p className="pdf-muted pdf-local-note">Processed on your device.</p>
    </aside>

    <div className="pdf-results">
      <div className="pdf-results-head">
        <div><h2>Converted documents</h2><p className="pdf-muted">
          {documents.length} document{documents.length === 1 ? '' : 's'} · {pageCount} converted page{pageCount === 1 ? '' : 's'}
        </p></div>
        <button type="button" className="pdf-primary" aria-label="Download all converted PDF pages as a ZIP archive"
          disabled={busy || downloading || pageCount === 0} onClick={downloadAll}>
          {downloading ? 'Preparing ZIP…' : `Download all (${pageCount})`}
        </button>
      </div>
      {(busy || progress) && <div className="pdf-progress" role="status">
        <div className="pdf-progress-label"><span>{progress}</span>{busy && <span>{progressPercent}%</span>}</div>
        {busy && <div className="pdf-progress-track"><div style={{ width: `${progressPercent}%` }} /></div>}
      </div>}
      {error && <p role="alert" className="pdf-error">{error}</p>}
      <div className="pdf-list">
        {documents.length === 0 && <div className="pdf-empty">No PDFs uploaded</div>}
        {documents.map(doc => <button type="button" key={doc.id} className="pdf-doc-card"
          aria-label={`Inspect PDF ${doc.name}`} onClick={() => setDetailId(doc.id)}>
          <div className="pdf-doc-thumb">
            {doc.pages.length ? <img src={doc.pages[0].url} alt={`First page of ${doc.name}`} /> : <span>PDF</span>}
          </div>
          <div className="pdf-doc-details">
            <strong title={doc.name}>{doc.name}</strong>
            <span>{doc.pages.length}{doc.total ? `/${doc.total}` : ''} pages · {doc.format === 'image/jpeg' ? 'JPG' : 'PNG'}</span>
            {doc.state === 'failed' && <small role="alert">Error: {doc.error}</small>}
            {doc.state === 'processing' && <small>Processing…</small>}
            {doc.state === 'canceled' && <small>Conversion canceled</small>}
          </div>
        </button>)}
      </div>
    </div>

    {active && <div className="pdf-detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDetailId(null); }}>
      <div className="pdf-detail" role="dialog" aria-modal="true" aria-label={`Pages from ${active.name}`}>
        <header className="pdf-detail-head">
          <div><h2>{active.name}</h2><p className="pdf-muted">{active.pages.length} pages · {selectCount} selected</p></div>
          <div className="pdf-detail-actions">
            <label className="pdf-select-all"><input aria-label="Select all pages" type="checkbox" checked={allSelected}
              ref={element => { if (element) element.indeterminate = anySelection; }}
              onChange={event => changeAllChecked(active.id, event.target.checked)} /> Select All (Ctrl+A)</label>
            <button type="button" disabled={downloading || selectCount === 0} onClick={downloadSelected}>
              {downloading ? 'Preparing…' : 'Download Selected (Ctrl+S)'}
            </button>
            <button ref={closeRef} type="button" aria-label="Close PDF pages" onClick={() => setDetailId(null)}>Close</button>
          </div>
        </header>
        <div className="pdf-page-grid">
          {active.pages.length === 0 && <p className="pdf-muted">No converted pages yet.</p>}
          {active.pages.map(page => <article className="pdf-page-card" key={page.num}>
            <div className="pdf-page-preview"><img src={page.url} alt={`Page ${page.num}`} /></div>
            <div className="pdf-page-foot">
              <label><input type="checkbox" checked={page.checked}
                aria-label={`Select page ${page.num}`}
                onChange={event => changeChecked(active.id, page.num, event.target.checked)} />
                Page {String(page.num).padStart(2, '0')}</label>
              <button type="button" aria-label={`Download page ${page.num}`} onClick={() => savePage(active, page)}>Save</button>
            </div>
          </article>)}
        </div>
      </div>
    </div>}
    {showClearConfirm && <div className="pdf-confirm-backdrop">
      <div className="pdf-confirm" role="dialog" aria-modal="true" aria-label="Clear all PDFs">
        <h2>Clear all PDFs?</h2>
        <p>Remove all converted documents and pages? You can undo this action.</p>
        <div className="pdf-confirm-actions">
          <button type="button" onClick={() => setShowClearConfirm(false)}>Cancel</button>
          <button type="button" className="pdf-primary" onClick={confirmClear}>Clear all</button>
        </div>
      </div>
    </div>}
  </section>;
}
