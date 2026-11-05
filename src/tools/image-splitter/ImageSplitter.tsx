import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import JSZip from 'jszip';
import { DEFAULT_COLUMNS, getExportFiles, isImageFile, safeColumns, splitIntoColumns, type FilePiece } from './engine';
import './image-splitter.css';

type ImageItem = {
  id: number;
  file: File;
  url: string;
  checked: boolean;
  pieces: FilePiece[];
  status: 'ready' | 'done';
};
type Snapshot = { columns: number; items: Omit<ImageItem, 'url'>[] };

export function ImageSplitter() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [busy, setBusy] = useState<'splitting' | 'zipping' | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<Snapshot | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const ownedUrls = useRef(new Set<string>());
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);

  function createUrl(file: File) {
    const url = URL.createObjectURL(file);
    ownedUrls.current.add(url);
    return url;
  }
  function releaseAllUrls() {
    ownedUrls.current.forEach(url => URL.revokeObjectURL(url));
    ownedUrls.current.clear();
  }
  useEffect(() => () => { // Works even when navigating to another tool.
    ownedUrls.current.forEach(url => URL.revokeObjectURL(url));
    ownedUrls.current.clear();
  }, []);

  function addFiles(files: File[]) {
    if (busy) return;
    const accepted = files.filter(isImageFile);
    if (!accepted.length) {
      setError('Please choose image files.');
      return;
    }
    const next = accepted.map(file => ({ id: nextId.current++, file, url: createUrl(file), checked: true, pieces: [], status: 'ready' as const }));
    setItems(previous => [...previous, ...next]);
    setUndoSnapshot(null);
    setError(accepted.length < files.length ? `${files.length - accepted.length} unsupported file(s) skipped.` : '');
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = ''; // A second upload of the same file must work.
  }
  function dropFiles(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  }
  function changeColumns(value: string) {
    const number = safeColumns(value);
    setColumns(number);
    // A previous export must never silently use a different number of columns.
    setItems(previous => previous.map(item => ({ ...item, pieces: [], status: 'ready' })));
    setError('');
  }
  function toggleItem(id: number, checked: boolean) {
    setItems(previous => previous.map(item => item.id === id ? { ...item, checked } : item));
  }
  async function process() {
    if (busy || !items.some(item => item.checked)) return;
    setBusy('splitting');
    setError('');
    const prepared = [...items];
    const total = prepared.filter(item => item.checked).length;
    let completed = 0;
    try {
      for (let index = 0; index < prepared.length; index++) {
        const item = prepared[index];
        if (!item.checked) continue;
        setProgress(`Splitting ${completed + 1} of ${total}: ${item.file.name}`);
        const pieces = await splitIntoColumns(item.file, columns);
        prepared[index] = { ...item, pieces, status: 'done' };
        completed++;
        setItems([...prepared]);
      }
      setProgress(`${completed} image${completed === 1 ? '' : 's'} split into ${columns} columns.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not split an image.');
      setProgress(`${completed} of ${total} image(s) processed.`);
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    if (busy || !items.some(item => item.pieces.length)) return;
    setBusy('zipping');
    setError('');
    try {
      const zip = new JSZip();
      const files = getExportFiles(items);
      files.forEach(file => zip.file(file.name, file.blob));
      const archive = await zip.generateAsync({ type: 'blob' }, metadata => setProgress(`Creating ZIP: ${Math.round(metadata.percent)}%`));
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'split_images.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setProgress(`${files.length} file${files.length === 1 ? '' : 's'} exported.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create ZIP.');
    } finally {
      setBusy(null);
    }
  }

  function confirmReset() {
    const snapshot: Snapshot = {
      columns,
      items: items.map(({ id, file, checked, pieces, status }) => ({ id, file, checked, pieces, status })),
    };
    releaseAllUrls();
    setItems([]);
    setColumns(DEFAULT_COLUMNS);
    setProgress('');
    setError('');
    setUndoSnapshot(snapshot);
    setShowConfirm(false);
  }
  function undoReset() {
    if (!undoSnapshot) return;
    setColumns(undoSnapshot.columns);
    setItems(undoSnapshot.items.map(item => ({ ...item, url: createUrl(item.file) })));
    setUndoSnapshot(null);
    setProgress('Reset undone — your selections and split results are restored.');
  }

  const readyForDownload = items.some(item => item.pieces.length > 0);
  const selectedCount = items.filter(item => item.checked).length;
  const partsCount = items.reduce((sum, item) => sum + (item.checked && item.pieces.length ? item.pieces.length : 1), 0);

  return <section className="split-workspace" aria-label="Image Splitter">
    <div className="split-settings">
      <h2>Image Splitter</h2>
      <p className="split-muted">Cut images into vertical sections.</p>
      <div className={`split-drop${dragActive ? ' is-dragging' : ''}`}
        onDrop={dropFiles}
        onDragOver={event => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={event => { event.preventDefault(); setDragActive(false); }}>
        <input ref={inputRef} aria-label="Upload images" type="file" accept="image/*" multiple disabled={Boolean(busy)} onChange={selectFiles} />
        <button type="button" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>Add Images</button>
        <span>or drop images here</span>
      </div>
      <label className="split-field">Number of columns
        <input aria-label="Number of columns" type="number" min={1} max={50} step={1} value={columns} disabled={Boolean(busy)} onChange={event => changeColumns(event.target.value)} />
      </label>
      <p className="split-muted">1–50 columns · one horizontal row · left to right.</p>
      <button className="split-secondary" disabled={Boolean(busy) || selectedCount === 0} onClick={() => void process()} type="button">{busy === 'splitting' ? 'Splitting…' : 'Split Images'}</button>
      <button className="split-primary" disabled={Boolean(busy) || !readyForDownload} onClick={() => void download()} type="button">{busy === 'zipping' ? 'Creating ZIP…' : 'Download Zip'}</button>
      <button className="split-clear" disabled={Boolean(busy) || !items.length} onClick={() => setShowConfirm(true)} type="button">Clear workspace</button>
      {progress && <p className="split-progress" role="status">{progress}</p>}
      {error && <p className="split-error" role="alert">{error}</p>}
      {undoSnapshot && <div className="split-undo" role="status">Workspace cleared. <button type="button" onClick={undoReset}>Undo reset</button></div>}
    </div>
    <div className="split-results">
      <div className="split-results-head"><div><h2>Your split images</h2><p className="split-muted">{items.length} image{items.length === 1 ? '' : 's'} · {selectedCount} selected · {items.length ? partsCount : 0} planned exports</p></div></div>
      <div className="split-card-grid">
        {items.length === 0 && <div className="split-empty">No images uploaded</div>}
        {items.map(item => <article className="split-card" key={item.id}>
          <div className="split-image-stage"><div className="split-image-wrap">
            <img src={item.url} alt={`Preview ${item.file.name}`} />
            <div className="split-grid-overlay" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }, (_, index) => <span key={index} />)}
            </div>
          </div></div>
          <div className="split-card-meta"><span className="split-filename" title={item.file.name}>{item.file.name}</span><span className="split-status">{item.status === 'done' ? `Done (${item.pieces.length})` : 'Ready'}</span></div>
          <label className="split-selection"><input type="checkbox" checked={item.checked} disabled={Boolean(busy)} onChange={event => toggleItem(item.id, event.target.checked)} /> Split this image</label>
        </article>)}
      </div>
    </div>
    {showConfirm && <div className="split-dialog-backdrop" role="presentation"><div className="split-dialog" role="dialog" aria-modal="true" aria-label="Reset Image Splitter">
      <h2>Reset splitter?</h2><p>This removes the images and resets the number of columns. You can undo this action.</p>
      <div className="split-dialog-actions"><button type="button" onClick={() => setShowConfirm(false)}>Cancel</button><button type="button" className="split-primary" onClick={confirmReset}>Reset</button></div>
    </div></div>}
  </section>;
}
