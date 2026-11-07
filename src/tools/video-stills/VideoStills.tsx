import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import JSZip from 'jszip';
import { downloadBlob } from '../../utils/download';
import {
  collectionName, exportAll, exportSelected, getSelectedGroups, isAbort, isVideoFile,
  selectedCount, selectedZipName, type TransferGroup,
  type TransferResult, type VideoCollection, type VideoFrame,
} from './engine';
import { extractVideo } from './decoder';
import './video-stills.css';

type Pending = { id: string; file: File; contactSheet: 0 | 4 | 6 | 9 };
type Props = { onTransfer: (groups: TransferGroup[]) => Promise<TransferResult> };

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
async function makeZip(entries: { path: string; blob: Blob }[], onProgress: (value: number) => void): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) zip.file(entry.path, entry.blob);
  return zip.generateAsync({ type: 'blob' }, progress => onProgress(Math.round(progress.percent)));
}

export function VideoStills({ onTransfer }: Props) {
  const [collections, setCollections] = useState<VideoCollection[]>([]);
  const collectionsRef = useRef<VideoCollection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFrame, setActiveFrame] = useState(0);
  const [contactSheet, setContactSheet] = useState<0 | 4 | 6 | 9>(0);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragged, setDragged] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const alive = useRef(true);
  const pending = useRef<Pending[]>([]);
  const running = useRef(false);
  const generation = useRef(0);
  const activeAbort = useRef<AbortController | null>(null);
  const idCounter = useRef(0);
  const urls = useRef(new Set<string>());
  const input = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const commit = useCallback((fn: (current: VideoCollection[]) => VideoCollection[]) => {
    if (!alive.current) return;
    collectionsRef.current = fn(collectionsRef.current);
    setCollections(collectionsRef.current);
  }, []);
  const createUrl = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current++;
      pending.current = [];
      activeAbort.current?.abort();
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current.clear();
    };
  }, []);

  async function processQueue() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const version = generation.current;
    try {
      while (pending.current.length && version === generation.current && alive.current) {
        const job = pending.current.shift()!;
        const controller = new AbortController();
        activeAbort.current = controller;
        setError('');
        setUploadProgress(`Opening ${job.file.name}`);
        try {
          await extractVideo(job.file, controller.signal, (frame, progress) => {
            if (version !== generation.current || controller.signal.aborted) return;
            const url = createUrl(frame.blob);
            const item: VideoFrame = { ...frame, url, checked: true };
            commit(all => all.map(group => group.id === job.id
              ? { ...group, frames: [...group.frames, item], completed: progress.done } : group));
            setUploadProgress(`Extracting ${job.file.name} · ${progress.done}/${progress.total}`);
          }, total => {
            commit(all => all.map(group => group.id === job.id ? { ...group, total } : group));
          }, job.contactSheet);
          if (version === generation.current && !controller.signal.aborted) {
            commit(all => all.map(group => group.id === job.id ? { ...group, status: 'ready' } : group));
          }
        } catch (cause) {
          if (version === generation.current) {
            const canceled = controller.signal.aborted || isAbort(cause);
            commit(all => all.map(group => group.id === job.id
              ? { ...group, status: canceled ? 'canceled' : 'failed', message: canceled ? 'Canceled' : describe(cause) }
              : group));
            if (!canceled) setError(`Could not extract ${job.file.name}: ${describe(cause)}`);
          }
        } finally {
          if (activeAbort.current === controller) activeAbort.current = null;
        }
      }
    } finally {
      running.current = false;
      if (alive.current) {
        // A new video may be added just after Clear canceled the previous generation.
        // Always restart that new queue even when this worker belonged to the old generation.
        if (pending.current.length) void processQueue();
        else if (version === generation.current) {
          setBusy(false);
          setUploadProgress('');
        }
      }
    }
  }

  function addFiles(files: File[]) {
    const valid = files.filter(isVideoFile);
    if (valid.length < files.length) setError(`${files.length - valid.length} non-video file(s) skipped.`);
    if (!valid.length) return;
    const jobs = valid.map(file => ({ id: `video-${Date.now()}-${++idCounter.current}`, file, contactSheet }));
    commit(all => [...all, ...jobs.map(job => ({
      id: job.id, name: collectionName(job.file.name), sourceName: job.file.name,
      frames: [] as VideoFrame[], total: 0, completed: 0, status: 'processing' as const,
    }))]);
    pending.current.push(...jobs);
    void processQueue();
  }
  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragged(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function toggleFrame(groupId: string, index: number, checked: boolean) {
    commit(all => all.map(group => group.id === groupId ? {
      ...group, frames: group.frames.map((frame, at) => at === index ? { ...frame, checked } : frame),
    } : group));
  }
  function toggleAll(groupId: string, checked: boolean) {
    commit(all => all.map(group => group.id === groupId ? {
      ...group, frames: group.frames.map(frame => ({ ...frame, checked })),
    } : group));
  }
  function clear() {
    generation.current++;
    activeAbort.current?.abort();
    pending.current = [];
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    commit(() => []);
    setBusy(false);
    setActiveId(null);
    setConfirmClear(false);
    setNotice('Workspace cleared.');
    setError('');
  }
  async function download(entries: { path: string; blob: Blob }[], filename: string) {
    if (!entries.length) { setError('Select at least one frame to download.'); return; }
    setZipProgress(0);
    setError('');
    try {
      downloadBlob(await makeZip(entries, percent => setZipProgress(percent)), filename, urls.current);
    } catch (cause) { setError(`Download failed: ${describe(cause)}`); }
    finally { if (alive.current) setZipProgress(null); }
  }
  async function send(onlyId?: string) {
    const groups = getSelectedGroups(collectionsRef.current, onlyId);
    if (!groups.length) { setError('Select at least one still to send.'); return; }
    setTransferring(true);
    setError('');
    setNotice('');
    try {
      const outcome = await onTransfer(groups);
      if (alive.current) {
        setActiveId(null);
        setNotice(`${outcome.imported} stills sent to Storyboard.`);
        if (outcome.rejected) setError(`${outcome.rejected} frame(s) could not be decoded.`);
      }
    } catch (cause) { if (alive.current) setError(`Could not send stills: ${describe(cause)}`); }
    finally { if (alive.current) setTransferring(false); }
  }

  const current = collections.find(group => group.id === activeId);
  const checked = current?.frames.filter(frame => frame.checked).length ?? 0;
  const totalSelected = selectedCount(collections);
  const downloadable = collections.some(group => group.frames.some(frame => frame.checked));
  useEffect(() => {
    if (!activeId) return;
    closeButton.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); setActiveId(null); return; }
      if (event.ctrlKey && event.key.toLowerCase() === 'a') {
        event.preventDefault(); toggleAll(activeId!, true); return;
      }
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        const target = event.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        event.preventDefault();
        setActiveFrame(index => Math.max(0, Math.min((collectionsRef.current.find(group => group.id === activeId)?.frames.length ?? 1) - 1,
          index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1))));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId]);

  return (
    <section className="video-stills" aria-label="Video Stills">
      <div className="vs-workbench-side">
      <div className="vs-toolbar">
        <div className="vs-drop" onDragOver={event => { event.preventDefault(); setDragged(true); }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragged(false); }}
          onDrop={onDrop} data-dragging={dragged}>
          <button type="button" onClick={() => input.current?.click()}>Add Videos</button>
          <span>or drop video files here</span>
          <input ref={input} type="file" accept="video/*,.mp4,.webm,.mov,.m4v,.ogg,.ogv,.avi,.mkv" multiple hidden onChange={onFileInput} aria-label="Choose video files" />
        </div>
        <button type="button" disabled={!totalSelected || transferring} onClick={() => void send()}>Send to Board</button>
        <button type="button" disabled={!downloadable || zipProgress !== null} onClick={() => void download(exportAll(collectionsRef.current), 'video_extras.zip')}>Download All</button>
        <button className="vs-danger" type="button" disabled={!collections.length} onClick={() => setConfirmClear(true)}>Clear</button>
      </div>
      <div className="vs-options">
        <label><input type="checkbox" checked={contactSheet !== 0} onChange={e => setContactSheet(e.target.checked ? 4 : 0)} /> Create contact sheet</label>
        {contactSheet !== 0 && <label>Layout <select aria-label="Contact sheet layout" value={contactSheet} onChange={event => setContactSheet(Number(event.target.value) as 4 | 6 | 9)}>
          <option value="4">2 × 2</option><option value="6">3 × 2</option><option value="9">3 × 3</option>
        </select></label>}
        <span>One JPEG still per second of video · Original frame dimensions</span>
      </div>
      {busy && <div className="vs-status" role="status">{uploadProgress || 'Processing videos…'} <button type="button" onClick={() => activeAbort.current?.abort()}>Cancel current</button></div>}
      {zipProgress !== null && <div className="vs-status" role="status">Creating ZIP: {zipProgress}%</div>}
      {error && <p className="vs-error" role="alert">{error}</p>}
      {notice && <p className="vs-notice" role="status">{notice}</p>}
      </div>
      <div className="vs-content">
        <div className="vs-list-heading"><h2>Video collections</h2><span>{collections.length} videos</span></div>
        {!collections.length && <div className="vs-empty">Upload videos to extract still frames. Processing stays on this device.</div>}
        <div className="vs-stacks">
          {collections.map(group => <button type="button" key={group.id} className="vs-stack" disabled={!group.frames.length}
            onClick={() => { setActiveId(group.id); setActiveFrame(0); }} aria-label={`Inspect stills from ${group.name}`}>
            <div className="vs-stack-thumb">{group.frames.length ? <img src={group.frames[0].url} alt="" /> : <span>VIDEO</span>}</div>
            <div className="vs-stack-meta"><strong title={group.sourceName}>{group.name}</strong><span>{group.status === 'processing' ? `Processing ${group.completed}/${group.total || '…'}` : group.status === 'ready' ? `${group.frames.length} items` : group.message || group.status}</span></div>
            <span className="vs-inspect">{group.frames.length ? 'Review' : ''}</span>
          </button>)}
        </div>
      </div>
      {current && <div className="vs-overlay" role="dialog" aria-modal="true" aria-label={`Frames from ${current.name}`}>
        <div className="vs-modal">
          <header className="vs-modal-head">
            <div><h2>{current.name}</h2><span>{current.frames.length} items · {checked} selected</span></div>
            <div className="vs-actions">
              <label className="vs-selectall"><input type="checkbox" checked={!!current.frames.length && checked === current.frames.length}
                onChange={event => toggleAll(current.id, event.target.checked)} aria-label="Select all frames" /> Select all</label>
              <button type="button" disabled={!checked || zipProgress !== null} onClick={() => void download(exportSelected(current), selectedZipName(current))}>Download selected</button>
              <button type="button" disabled={!getSelectedGroups([current]).length || transferring} onClick={() => void send(current.id)}>Send to Board</button>
              <button type="button" ref={closeButton} onClick={() => setActiveId(null)} aria-label="Close frame library">Close</button>
            </div>
          </header>
          <div className="vs-detail-content">
            <div className="vs-frame-list" aria-label="Extracted still frames">
              {current.frames.map((frame, index) => <div className={'vs-frame-row' + (index === activeFrame ? ' is-current' : '')} key={frame.num}>
                <button type="button" onClick={() => setActiveFrame(index)} aria-label={`Preview ${frame.type === 'storyboard' ? 'contact sheet' : `frame ${frame.num}`}`} aria-current={index === activeFrame}>
                  <img src={frame.url} alt="" /><span>{frame.type === 'storyboard' ? 'Contact sheet' : `#${frame.num}`}</span>
                </button>
                <input type="checkbox" checked={frame.checked} onChange={event => toggleFrame(current.id, index, event.target.checked)} aria-label={`Select ${frame.type === 'storyboard' ? 'contact sheet' : `frame ${frame.num}`}`} />
              </div>)}
            </div>
            <div className="vs-frame-preview"><span>Frame preview</span>
              {current.frames[activeFrame] && <img src={current.frames[activeFrame].url} alt={`${current.name}, ${current.frames[activeFrame].type === 'storyboard' ? 'contact sheet' : `frame ${current.frames[activeFrame].num}`}`} />}
              <span>Original frame · JPEG</span>
            </div>
          </div>
          <footer className="vs-modal-foot">Use ← → keys to move between frames. Ctrl+A selects all. Esc closes.</footer>
        </div>
      </div>}
      {confirmClear && <div className="vs-confirm" role="alertdialog" aria-modal="true" aria-label="Clear workspace?">
        <div><h2>Clear workspace?</h2><p>This removes all loaded videos and extracted stills. This cannot be undone.</p>
          <div><button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
            <button type="button" className="vs-danger" onClick={clear}>Clear all</button></div>
        </div>
      </div>}
    </section>
  );
}
