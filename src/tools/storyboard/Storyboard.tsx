import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import JSZip from 'jszip';
import { downloadBlob } from '../../utils/download';
import { boardExportNames, DEFAULT_BOARD_SETTINGS, DEFAULT_FIT_SETTINGS,
  exportName, folderGroups, MAX_BOARD_FRAMES, MAX_FILE_BYTES, naturalCompare, safeBoardName,
  uniqueBoardName, validateStills, validBoardSettings, type BoardSettings, type CanvasSource,
  type FitSettings, type StoryBoard, type StoryFrame, type StoryMode, type StoryboardRef } from './engine';
import { encodeCanvas, renderBoard, renderFit } from './renderer';
import type { TransferGroup, TransferResult } from '../video-stills/engine';
import './storyboard.css';

type ConfirmAction = { title: string; text: string; onConfirm: () => void } | null;
let nextId = 0;
function id(): string { return `board-${Date.now()}-${++nextId}`; }
function makeBoard(name: string): StoryBoard {
  return { id: id(), name, images: [], settings: { ...DEFAULT_BOARD_SETTINGS }, defaultColumnsPending: true };
}
function describe(error: unknown): string { return error instanceof Error ? error.message : String(error); }

async function loadImage(file: Blob, name: string, owned: Set<string>): Promise<StoryFrame> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw Error('File is empty or over 100 MB.');
  if (!file.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(name)) {
    throw Error('Unsupported image type.');
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(Error('Image could not be opened.'));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw Error('Invalid image dimensions.');
    owned.add(url);
    return { id: id(), file, name, image: img, url };
  } catch (cause) {
    URL.revokeObjectURL(url);
    throw cause;
  }
}
/** Match original CTK import behavior: capture one frame at up to 1 second into a video. */
async function loadVideo(file: Blob, name: string): Promise<StoryFrame> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw Error('Video is empty or over 100 MB.');
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.muted = true;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      let done = false;
      const timer = window.setTimeout(() => finish(null), 15_000);
      function finish(result: HTMLImageElement | null) {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        result ? resolve(result) : reject(Error('Could not read a video frame.'));
      }
      video.onerror = () => finish(null);
      video.onloadedmetadata = () => {
        if (!Number.isFinite(video.duration) || !video.videoWidth || !video.videoHeight) return finish(null);
        try { video.currentTime = Math.min(1, Math.max(0, video.duration / 2)); }
        catch { finish(null); }
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return finish(null);
          ctx.drawImage(video, 0, 0);
          const img = new Image();
          img.onload = () => finish(img); img.onerror = () => finish(null);
          img.src = canvas.toDataURL('image/jpeg');
        } catch { finish(null); }
      };
      video.src = url;
    });
    return { id: id(), file, name, image };
  } finally {
    video.pause(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url);
  }
}
async function loadSource(file: Blob, name: string, owned: Set<string>): Promise<StoryFrame> {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|ogv|avi|mkv)$/i.test(name)
    ? loadVideo(file, name) : loadImage(file, name, owned);
}

export const Storyboard = forwardRef<StoryboardRef, Record<string, never>>(function Storyboard(_props, ref) {
  const [mode, setMode] = useState<StoryMode>('story');
  const [boards, setBoards] = useState<StoryBoard[]>(() => [makeBoard('Board_1')]);
  const boardsRef = useRef(boards);
  const [activeId, setActiveId] = useState<string>(() => boards[0].id);
  const activeRef = useRef(activeId);
  const [boardLayout, setBoardLayout] = useState<'compact' | 'list'>('compact');
  const [fitSettings, setFitSettings] = useState<FitSettings>({ ...DEFAULT_FIT_SETTINGS });
  const [fitSource, setFitSource] = useState<{ kind: 'board' | 'upload'; image: CanvasSource; name: string; url?: string } | null>(null);
  const [fitMessage, setFitMessage] = useState('Upload a storyboard image or use the current Grid Board.');
  const [fitReady, setFitReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [dragging, setDragging] = useState(false);
  const [previewSize, setPreviewSize] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const boardPreview = useRef<HTMLDivElement>(null);
  const fitPreview = useRef<HTMLCanvasElement>(null);
  const fitFileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const imagesInput = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const lastBoardCanvas = useRef<HTMLCanvasElement | null>(null);
  const lastFitCanvas = useRef<HTMLCanvasElement | null>(null);
  const keepAlive = useRef(true);

  const commitBoards = useCallback((change: (before: StoryBoard[]) => StoryBoard[]) => {
    const updated = change(boardsRef.current);
    boardsRef.current = updated;
    if (keepAlive.current) setBoards(updated);
  }, []);
  const selectBoard = useCallback((value: string) => { activeRef.current = value; setActiveId(value); }, []);
  const disposeFrame = useCallback((frame: StoryFrame) => {
    if (frame.url && urls.current.delete(frame.url)) URL.revokeObjectURL(frame.url);
  }, []);

  useEffect(() => {
    keepAlive.current = true;
    if (folderInput.current) {
      folderInput.current.setAttribute('webkitdirectory', '');
      folderInput.current.setAttribute('directory', '');
    }
    return () => {
      keepAlive.current = false;
      urls.current.forEach(url => URL.revokeObjectURL(url));
      urls.current.clear();
    };
  }, []);

  const active = boards.find(board => board.id === activeId) || boards[0];
  const other = boards.filter(board => board.images.length);

  useEffect(() => {
    if (!active?.images.length) {
      lastBoardCanvas.current = null;
      boardPreview.current?.replaceChildren();
      setPreviewSize('');
      return;
    }
    try {
      const canvas = renderBoard(active.images, active.settings);
      lastBoardCanvas.current = canvas;
      if (canvas && boardPreview.current) {
        boardPreview.current.replaceChildren(canvas);
        canvas.title = 'Open full-size board preview';
        canvas.onclick = () => setLightbox(canvas.toDataURL('image/jpeg', .95));
        setPreviewSize(`${canvas.width} × ${canvas.height}`);
      }
    } catch (cause) { setError('Board preview: ' + describe(cause)); }
  }, [active]);

  useEffect(() => {
    const source = fitSource?.kind === 'board' ? lastBoardCanvas.current : fitSource?.image ?? null;
    try {
      const rendered = renderFit(source, fitSettings);
      lastFitCanvas.current = rendered.canvas;
      if (fitPreview.current) {
        const ctx = fitPreview.current.getContext('2d');
        fitPreview.current.width = rendered.canvas.width;
        fitPreview.current.height = rendered.canvas.height;
        ctx?.drawImage(rendered.canvas, 0, 0);
      }
      setFitReady(rendered.ready);
      setFitMessage(rendered.message);
    } catch (cause) { setFitReady(false); setFitMessage('Fit preview: ' + describe(cause)); }
  }, [fitSource, fitSettings, active]);

  function updateBoardSettings(patch: Partial<BoardSettings>) {
    commitBoards(old => old.map(board => board.id === activeId ? {
      ...board, settings: { ...board.settings, ...patch },
      defaultColumnsPending: patch.cols === undefined ? board.defaultColumnsPending : false,
    } : board));
  }
  function updateFitSettings(patch: Partial<FitSettings>) { setFitSettings(before => ({ ...before, ...patch })); }
  function newBoard() {
    const project = makeBoard(uniqueBoardName(`Board_${boardsRef.current.length + 1}`, boardsRef.current));
    commitBoards(old => [...old, project]);
    selectBoard(project.id);
    setError('');
  }
  function renameBoard(name: string) {
    const cleaned = safeBoardName(name);
    commitBoards(old => old.map(board => board.id === activeId ? { ...board, name: cleaned } : board));
  }
  function deleteBoard(board: StoryBoard) {
    setConfirm({ title: 'Delete this board?', text: 'This board and all of its frames will be permanently removed.', onConfirm: () => {
      board.images.forEach(disposeFrame);
      const index = boardsRef.current.findIndex(item => item.id === board.id);
      const next = boardsRef.current.filter(item => item.id !== board.id);
      if (!next.length) next.push(makeBoard('Board_1'));
      commitBoards(() => next);
      selectBoard(next[Math.max(0, index - 1)]?.id || next[0].id);
    }});
  }
  function clearBoard() {
    setConfirm({ title: 'Clear storyboard?', text: 'This removes every frame from the current board. This action cannot be undone.', onConfirm: () => {
      active?.images.forEach(disposeFrame);
      commitBoards(old => old.map(board => board.id === activeId ? { ...board, images: [] } : board));
      setMessage('Current board cleared.');
    }});
  }
  function removeFrame(index: number, board = active) {
    const frame = board?.images[index];
    if (!frame) return;
    disposeFrame(frame);
    commitBoards(old => old.map(item => item.id === board.id ? { ...item, images: item.images.filter((_, i) => i !== index) } : item));
  }
  function moveFrame(index: number, direction: number, board = active) {
    if (!board) return;
    const next = index + direction;
    if (next < 0 || next >= board.images.length) return;
    commitBoards(old => old.map(item => item.id === board.id ? {
      ...item, images: item.images.map((frame, at, all) => at === index ? all[next] : at === next ? all[index] : frame),
    } : item));
  }

  async function appendFiles(files: File[], target: StoryBoard, name = ''): Promise<{ accepted: number; rejected: number }> {
    let accepted = 0, rejected = 0;
    for (const file of files) {
      const project = boardsRef.current.find(board => board.id === target.id);
      if (!project || project.images.length >= MAX_BOARD_FRAMES) { rejected++; continue; }
      try {
        const frame = await loadSource(file, file.name, urls.current);
        // An import may finish after a user deletes its board.
        if (!boardsRef.current.some(board => board.id === target.id)) { disposeFrame(frame); rejected++; continue; }
        commitBoards(old => old.map(board => board.id === target.id ? {
          ...board, images: [...board.images, frame].slice(0, MAX_BOARD_FRAMES),
          defaultColumnsPending: board.images.length < 3 ? false : board.defaultColumnsPending,
        } : board));
        accepted++;
      } catch { rejected++; }
    }
    if (accepted && name) {
      commitBoards(old => old.map(board => board.id === target.id && /^Board_\d+$/.test(board.name)
        ? { ...board, name: uniqueBoardName(name, old, board.id) } : board));
    }
    return { accepted, rejected };
  }
  async function importFiles(files: File[], directory = false) {
    if (!files.length || busy) return;
    setBusy('Importing assets'); setError(''); setMessage('');
    let accepted = 0, rejected = 0;
    try {
      const groups = directory ? folderGroups(files) : [];
      if (!groups.length) {
        const result = await appendFiles(files, active);
        accepted = result.accepted; rejected = result.rejected;
      } else {
        const blank = boardsRef.current.find(board => board.id === activeRef.current);
        const reuse = blank && !blank.images.length && /^Board_\d+$/.test(blank.name) ? blank : null;
        let firstId = '';
        for (const group of groups) {
          const target = !firstId && reuse ? reuse : makeBoard(uniqueBoardName(group.name, boardsRef.current));
          if (!boardsRef.current.some(board => board.id === target.id)) commitBoards(old => [...old, target]);
          const result = await appendFiles(group.files, target, group.name);
          accepted += result.accepted; rejected += result.rejected;
          if (result.accepted && !firstId) firstId = target.id;
          if (!result.accepted && target !== reuse) commitBoards(old => old.filter(board => board.id !== target.id));
        }
        if (firstId) selectBoard(firstId);
      }
      setMessage(`${accepted} asset${accepted === 1 ? '' : 's'} imported.`);
      if (rejected) setError(`${rejected} unsupported, damaged, oversized or over-limit file(s) skipped.`);
    } finally { if (keepAlive.current) setBusy(''); }
  }
  function selectFiles(event: ChangeEvent<HTMLInputElement>, directory = false) {
    const files = [...(event.target.files || [])]; event.target.value = '';
    void importFiles(files, directory);
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (mode === 'story') void importFiles(files);
    if (mode === 'fit' && files[0]) void loadFitFile(files[0]);
  }

  const importStills = useCallback(async (groups: TransferGroup[]): Promise<TransferResult> => {
    validateStills(groups);
    let imported = 0, rejected = 0, created = 0;
    let firstId: string | null = null;
    for (const group of groups) {
      if (!group.frames.length) continue;
      let target = boardsRef.current.find(board => board.stillsSourceId === group.id);
      const missing = group.frames.filter(frame => !target?.images.some(img => img.stillsSourceId === group.id && img.stillsFrameNum === frame.num));
      if (!missing.length) continue;
      let newBoard = false;
      if (!target) {
        const blank = boardsRef.current.find(board => board.id === activeRef.current && !board.images.length && /^Board_\d+$/.test(board.name) && !board.stillsSourceId);
        target = blank || makeBoard(uniqueBoardName(group.name, boardsRef.current));
        if (!blank) commitBoards(old => [...old, target!]);
        newBoard = true;
        const title = uniqueBoardName(group.name, boardsRef.current, target.id);
        const targetId = target.id;
        commitBoards(old => old.map(board => board.id === targetId ? {...board, name: title, stillsSourceId: group.id} : board));
      }
      const targetId = target.id;
      const before = boardsRef.current.find(board => board.id === targetId)?.images.length || 0;
      for (const frame of missing) {
        if ((boardsRef.current.find(board => board.id === targetId)?.images.length || 0) >= MAX_BOARD_FRAMES) {rejected++;continue;}
        try {
          const file = new File([frame.blob], `${group.name} #${frame.num}.jpg`, { type: frame.blob.type || 'image/jpeg' });
          const loaded = await loadImage(file, file.name, urls.current);
          loaded.stillsSourceId = group.id; loaded.stillsFrameNum = frame.num;
          commitBoards(old => old.map(board => board.id === targetId ? { ...board, images: [...board.images, loaded] } : board));
          imported++;
        } catch { rejected++; }
      }
      if ((boardsRef.current.find(board => board.id === targetId)?.images.length || 0) > before) {
        if (newBoard) created++;
        if (!firstId) firstId = targetId;
      } else if (newBoard) {
        commitBoards(old => old.map(board => board.id === targetId ? {...board, stillsSourceId: undefined} : board));
      }
    }
    if (firstId) selectBoard(firstId);
    setMode('story');
    if (rejected) setError(`${rejected} frame(s) could not be decoded.`);
    setMessage(`${imported} stills sent to Storyboard.`);
    return { imported, created, rejected, mode: 'story' };
  }, [commitBoards, selectBoard]);
  useImperativeHandle(ref, () => ({ importStills, openMode: setMode }), [importStills]);

  async function saveBoard() {
    if (!active?.images.length) return;
    try {
      const canvas = renderBoard(active.images, active.settings);
      if (!canvas) throw Error('Board is empty.');
      downloadBlob(await encodeCanvas(canvas, 'image/jpeg'), `${exportName(active.name)}.jpg`);
    } catch (cause) {setError('Storyboard export failed: ' + describe(cause));}
  }
  async function saveAllBoards() {
    const filled = boardsRef.current.filter(board => board.images.length);
    if (!filled.length || busy) return;
    setBusy('Preparing storyboard ZIP'); setError(''); setProgress('');
    try {
      const zip = new JSZip();
      const names = boardExportNames(filled);
      let failed = 0, succeeded = 0;
      for (let i = 0; i < filled.length; i++) {
        try {
          const canvas = renderBoard(filled[i].images, filled[i].settings);
          if (!canvas) throw Error('Empty board');
          zip.file(names[i], await encodeCanvas(canvas, 'image/jpeg'));
          succeeded++;
        } catch (cause) {failed++; console.warn('Skipped invalid storyboard:', filled[i].name, cause);}
        setProgress(`${i + 1} of ${filled.length} boards`);
      }
      if (!succeeded) throw Error('No boards could be exported.');
      downloadBlob(await zip.generateAsync({type:'blob'}), 'boards.zip');
      setMessage(`${succeeded} board(s) exported.`);
      if (failed) setError(`${failed} invalid boards skipped.`);
    } catch (cause) {setError('Storyboard ZIP failed: ' + describe(cause));}
    finally {setBusy('');setProgress('');}
  }
  async function loadFitFile(file: File) {
    if (!file?.type.startsWith('image/')) {setError('Please upload a PNG, JPG or WebP image.');return;}
    try {
      const frame = await loadImage(file, file.name, urls.current);
      if (fitSource?.url && urls.current.delete(fitSource.url)) URL.revokeObjectURL(fitSource.url);
      setFitSource({kind: 'upload', image: frame.image, name: file.name, url: frame.url});
      setError('');
    } catch {setError('That image could not be opened. Choose another image.');}
  }
  function useCurrentBoard() {
    if (!active?.images.length) {setError('Add images to the Grid Board first.');return;}
    try {
      const canvas = renderBoard(active.images, active.settings);
      if (!canvas) throw Error('Grid Board is empty');
      if (fitSource?.url && urls.current.delete(fitSource.url)) URL.revokeObjectURL(fitSource.url);
      setFitSource({kind:'board', image:canvas, name: active.name});
      setError('');
    } catch (cause) {setError('Could not use Grid Board: ' + describe(cause));}
  }
  function clearFitSource() {
    if (fitSource?.url && urls.current.delete(fitSource.url)) URL.revokeObjectURL(fitSource.url);
    setFitSource(null);setFitReady(false);
  }
  async function saveFit(format: 'png' | 'jpeg') {
    if (!fitReady || !lastFitCanvas.current) return;
    try {
      const ext = format === 'png' ? 'png' : 'jpg';
      downloadBlob(await encodeCanvas(lastFitCanvas.current, format === 'png' ? 'image/png' : 'image/jpeg'),
        `fit_to_platform_${1033 * fitSettings.resolution}x${195 * fitSettings.resolution}.${ext}`);
    } catch (cause) {setError('Fit export failed: ' + describe(cause));}
  }

  return (
    <section className="storyboard-tool" aria-label="Storyboard">
      <div className="sb-topline">
        <div role="tablist" aria-label="Storyboard modes" className="sb-modes">
          {([['story','Grid Board'],['fit','Fit to Platform']] as const).map(([key,label]) =>
            <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? 'active' : ''} type="button" onClick={() => setMode(key)}>{label}</button>)}
        </div>
        <div className="sb-toolbar">
          {mode === 'story' && <>
            <button type="button" onClick={() => imagesInput.current?.click()}>Add Assets</button>
            <button type="button" onClick={() => folderInput.current?.click()}>Add Folder</button>
            <button disabled={!active?.images.length || !!busy} type="button" onClick={() => void saveBoard()}>Save JPG</button>
            <button disabled={!other.length || !!busy} type="button" onClick={() => void saveAllBoards()}>Download All ZIP</button>
            <button className="danger" disabled={!active?.images.length} type="button" onClick={clearBoard}>Clear</button>
          </>}
          {mode === 'fit' && <>
            <button type="button" onClick={() => fitFileInput.current?.click()}>Upload Image</button>
            <button type="button" onClick={useCurrentBoard}>Use Grid Board</button>
            <button type="button" disabled={!fitReady} onClick={() => void saveFit('png')}>Save PNG</button>
            <button type="button" disabled={!fitReady} onClick={() => void saveFit('jpeg')}>Save JPG</button>
          </>}
        </div>
        <input ref={imagesInput} type="file" accept="image/*,video/*" multiple hidden aria-label="Choose storyboard assets" onChange={event => selectFiles(event)} />
        <input ref={folderInput} type="file" multiple hidden aria-label="Choose storyboard folder" onChange={event => selectFiles(event, true)} />
        <input ref={fitFileInput} type="file" accept="image/png,image/jpeg,image/webp,image/*" hidden aria-label="Choose fit source image" onChange={event => { const file = event.target.files?.[0];event.target.value = ''; if(file)void loadFitFile(file); }} />
      </div>
      <div className="sb-feedback" aria-live="polite">
        {busy && <span role="status">{busy}{progress ? ` · ${progress}` : ''}</span>}
        {message && <span role="status">{message}</span>}
        {error && <span className="sb-error" role="alert">{error}</span>}
      </div>
      <div className="sb-layout" onDragOver={event => {event.preventDefault();setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={onDrop} data-dragging={dragging}>
        {mode === 'story' && <>
          <aside className="sb-controls">
            <div className="sb-section-head"><strong>Boards ({boards.length})</strong><button type="button" onClick={newBoard}>+ New Board</button></div>
            <div className="sb-view-choice"><button aria-pressed={boardLayout === 'compact'} onClick={() => setBoardLayout('compact')}>Compact</button><button aria-pressed={boardLayout === 'list'} onClick={() => setBoardLayout('list')}>List</button></div>
            {boardLayout === 'compact' ? <div className="sb-project-switch">
              <select aria-label="Choose a storyboard" value={activeId} onChange={event => selectBoard(event.target.value)}>{boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}</select>
              <button type="button" aria-label="Delete selected storyboard" onClick={() => deleteBoard(active)}>Delete</button>
            </div> : <div className="sb-project-list">{boards.map(board => <div className="sb-project-row" key={board.id}><button aria-current={board.id === activeId ? 'page' : undefined} type="button" onClick={() => selectBoard(board.id)}>{board.name}</button><button type="button" aria-label={'Delete board ' + board.name} onClick={() => deleteBoard(board)}>×</button></div>)}</div>}
            <label>Board Name <input value={active?.name || ''} aria-label="Board Name" onChange={event => renameBoard(event.target.value)} maxLength={80} /></label>
            <div className="sb-section-head"><strong>Board settings</strong></div>
            <div className="sb-fields">
              <label>Columns <select aria-label="Columns" value={active?.settings.cols || 0} onChange={event => updateBoardSettings({ cols: Number(event.target.value) })}>
                <option value="0">Auto</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
              </select></label>
              <label className="sb-check"><input aria-label="Auto width" type="checkbox" checked={active?.settings.autoWidth ?? true} onChange={event => updateBoardSettings({ autoWidth:event.target.checked })} />Auto width</label>
              {!active?.settings.autoWidth && <label>Width <input aria-label="Board width" type="number" min={64} max={8192} value={active?.settings.width ?? 1920} onChange={event => updateBoardSettings({ width:Number(event.target.value) })} /></label>}
            </div>
            <details><summary>More layout settings</summary><div className="sb-fields">
              <label>Gap <input aria-label="Board gap" type="number" min={0} max={1000} value={active?.settings.gap ?? 0} onChange={event => updateBoardSettings({ gap:Number(event.target.value) })} /></label>
              <label>Image fit <select aria-label="Board image fit" value={active?.settings.fitMode} onChange={event => updateBoardSettings({fitMode:event.target.value as BoardSettings['fitMode']})}><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
              <label>Background <input aria-label="Board background" type="color" value={active?.settings.bgColor || '#ffffff'} onChange={event => updateBoardSettings({bgColor:event.target.value})} /></label>
            </div></details>
            <div className="sb-section-head"><strong>Added Assets ({active?.images.length || 0})</strong></div>
            <div className="sb-asset-list">{active?.images.map((frame, i) => <div className="sb-frame" key={frame.id}>
              <img src={frame.url || (frame.image as HTMLImageElement).src} alt="" />
              <span title={frame.name}>{String(i+1).padStart(2,'0')} · {frame.name}</span>
              <button type="button" aria-label={'Move up ' + frame.name} disabled={i === 0} onClick={() => moveFrame(i,-1)}>↑</button>
              <button type="button" aria-label={'Move down ' + frame.name} disabled={i === active.images.length - 1} onClick={() => moveFrame(i,1)}>↓</button>
              <button type="button" className="danger" aria-label={'Remove ' + frame.name} onClick={() => removeFrame(i)}>×</button>
            </div>)}</div>
          </aside>
          <main className="sb-stage" aria-label="Grid Board preview">
            {previewSize && <span className="sb-dimensions">{previewSize}</span>}
            <div className="sb-canvas" ref={boardPreview} />
            {!active?.images.length && <p>Drop images or videos here, or choose Add Folder to create boards from folders.</p>}
            {active && !validBoardSettings(active.settings) && <p className="sb-error">Invalid board settings. Adjust width, columns or gap.</p>}
          </main>
        </>}
        {mode === 'fit' && <>
          <aside className="sb-controls">
            <strong>Storyboard Source</strong>
            <p className="sb-caption" role="status">{fitSource ? `${fitSource.kind === 'board' ? 'Current Board' : 'Uploaded'}: ${fitSource.name}` : 'No storyboard selected. Upload an image or use the current Grid Board.'}</p>
            <button type="button" disabled={!fitSource} className="danger" onClick={clearFitSource}>Remove Source Image</button>
            <label>Statement · Shown in all 3 circles <textarea aria-label="Fit statement" maxLength={400} rows={5} value={fitSettings.statement} onChange={event => updateFitSettings({statement:event.target.value})} /></label>
            <details><summary>Image and typography</summary><div className="sb-fields">
              <label>Image fit <select aria-label="Fit image mode" value={fitSettings.imageFit} onChange={event => updateFitSettings({imageFit:event.target.value as FitSettings['imageFit']})}><option value="contain">Contain</option><option value="cover">Cover</option></select></label>
              <label>Image size ({fitSettings.imageSize}%)<input aria-label="Fit image size" type="range" min={60} max={98} value={fitSettings.imageSize} onChange={event => updateFitSettings({imageSize:Number(event.target.value)})} /></label>
              <label>Maximum text size ({fitSettings.fontSize} px)<input aria-label="Fit text size" type="range" min={12} max={24} value={fitSettings.fontSize} onChange={event => updateFitSettings({fontSize:Number(event.target.value)})} /></label>
              <label>Output resolution <select aria-label="Fit resolution" value={fitSettings.resolution} onChange={event => updateFitSettings({resolution:Number(event.target.value) as FitSettings['resolution']})}><option value="1">1033 × 195</option><option value="2">2066 × 390</option><option value="3">3099 × 585</option></select></label>
              <button type="button" onClick={() => setFitSettings({...DEFAULT_FIT_SETTINGS})}>Reset Preset Settings</button>
            </div></details>
          </aside>
          <main className="sb-stage sb-fit-stage" aria-label="Fit to Platform preview">
            <div className="sb-fit-head">FIT TO PLATFORM / LIVE PREVIEW <span>{1033 * fitSettings.resolution} × {195 * fitSettings.resolution}</span></div>
            <canvas ref={fitPreview} aria-label="Three pairs of overlapping storyboard and statement circles" role="img" />
            <p className={fitReady ? 'sb-caption' : 'sb-error'} role="status">{fitMessage}</p>
          </main>
        </>}
      </div>
      {confirm && <div className="sb-overlay" role="presentation"><div role="alertdialog" aria-modal="true" aria-label={confirm.title} className="sb-dialog"><h2>{confirm.title}</h2><p>{confirm.text}</p><div className="sb-dialog-actions"><button onClick={() => setConfirm(null)}>Cancel</button><button className="danger" onClick={() => {confirm.onConfirm();setConfirm(null);}}>Confirm</button></div></div></div>}
      {lightbox && <div className="sb-overlay" onClick={() => setLightbox(null)} role="presentation"><div className="sb-lightbox"><button onClick={() => setLightbox(null)} type="button">Close preview</button><img src={lightbox} alt="Full-size board preview" /></div></div>}
    </section>
  );
});
