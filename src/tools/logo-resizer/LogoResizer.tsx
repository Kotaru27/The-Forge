import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type CSSProperties } from 'react';
import JSZip from 'jszip';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { downloadBlob } from '../../utils/download';
import { LogoPreview } from './LogoPreview';
import { LogoResizerIcon } from './LogoResizerIcon';
import { logoToBlob } from './renderer';
import { extractOfficeImages } from './office';
import { generateLogoLinks } from './links';
import {
  DEFAULT_LOGO_SETTINGS, LOGO_FONTS, LOGO_PRESETS,
  filenameFromSource, outputExtension, sanitizeLogoFilename, uniqueExportNames,
  validateLogoDimensions, type LogoAsset, type LogoServer, type LogoSettings,
} from './types';
import './logo-resizer.css';
import './logo-resizer-v7.css';

let nextLogoId = 0;
const isOffice = (file: File) => /\.(pptx|xlsx|xlsm)$/i.test(file.name);
const isImage = (file: File) => file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name);
const dimensions = (w: number, h: number) => ({ width: String(w), height: String(h) });
type Snapshot = { cards: LogoAsset[]; settings: LogoSettings };
type WorkProgress = { phase: string; done: number; total: number };
const rangeStyle = (value: number, min: number, max: number): CSSProperties => ({
  '--v7-fill': `${Math.max(0, Math.min(100, (value - min) / (max - min) * 100))}%`,
} as CSSProperties);


async function loadAsset(file: File): Promise<LogoAsset> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Cannot open ${file.name}`));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error(`Image has no dimensions: ${file.name}`);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return {
    id: `logo-${++nextLogoId}`,
    source: file,
    url,
    image,
    filename: filenameFromSource(file),
    label: '',
    fontSizeOverride: null,
    paddingOverride: null,
    imageOffset: 0,
    textOffset: 90,
  };
}

export function LogoResizer() {
  const [settings, setSettings] = useState<LogoSettings>({ ...DEFAULT_LOGO_SETTINGS });
  const [draft, setDraft] = useState(() => dimensions(200, 200));
  const [cards, setCards] = useState<LogoAsset[]>([]);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const [focused, setFocused] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<File[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const snapshotTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showLinks, setShowLinks] = useState(false);
  const [brands, setBrands] = useState('');
  const [server, setServer] = useState<LogoServer>('s3');
  const [folder, setFolder] = useState('');
  const [links, setLinks] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const [confirmNoLogos, setConfirmNoLogos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const [notice, setNotice] = useState('');
  const [workProgress, setWorkProgress] = useState<WorkProgress | null>(null);
  const focusOrigin = useRef<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const focusWasOpen = useRef(false);
  const prefersReducedMotion = Boolean(useReducedMotion());

  useEffect(() => {
    return () => {
      cardsRef.current.forEach(asset => URL.revokeObjectURL(asset.url));
      snapshotRef.current?.cards.forEach(asset => URL.revokeObjectURL(asset.url));
      if (snapshotTimer.current) window.clearTimeout(snapshotTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const resetDrag = () => { dragDepth.current = 0; setDragActive(false); };
    window.addEventListener('dragend', resetDrag);
    window.addEventListener('drop', resetDrag);
    return () => {
      window.removeEventListener('dragend', resetDrag);
      window.removeEventListener('drop', resetDrag);
    };
  }, []);

  const patchSettings = useCallback((patch: Partial<LogoSettings>) => {
    setSettings(current => ({ ...current, ...patch }));
  }, []);
  const patchCard = useCallback((id: string, patch: Partial<LogoAsset>) => {
    setCards(current => current.map(asset => asset.id === id ? { ...asset, ...patch } : asset));
  }, []);

  function setSize(width: number, height: number) {
    setDraft(dimensions(width, height));
    patchSettings({ width, height });
  }
  function updateDimension(key: 'width' | 'height', value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    const w = Number(next.width), h = Number(next.height);
    if (validateLogoDimensions(w, h)) patchSettings({ width: w, height: h });
  }
  function askToUpload(files: FileList | File[]) {
    if (busy) return;
    const candidates = Array.from(files).filter(file => file.size > 0);
    if (!candidates.length) return;
    setPending(candidates);
    setError('');
  }
  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) askToUpload(event.target.files);
    event.target.value = '';
  }
  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (event.dataTransfer.files.length) askToUpload(event.dataTransfer.files);
  }
  function onGalleryDragEnter(event: DragEvent<HTMLElement>) {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }
  function onGalleryDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }
  async function importPending() {
    if (!pending) return;
    const width = Number(draft.width), height = Number(draft.height);
    if (!validateLogoDimensions(width, height)) {
      setError('Enter a width and height between 1 and 8192 pixels.');
      return;
    }
    patchSettings({ width, height });
    const uploads = pending;
    setPending(null);
    setBusy(true);
    setError('');
    setNotice('');
    setWorkProgress({ phase: 'Importing assets', done: 0, total: uploads.length });
    const loaded: LogoAsset[] = [];
    const failures: string[] = [];
    try {
      for (let index = 0; index < uploads.length; index++) {
        const file = uploads[index];
        setProgress(`Importing ${index + 1} of ${uploads.length}: ${file.name}`);
        setWorkProgress({ phase: 'Importing assets', done: index, total: uploads.length });
        try {
          const sources = isOffice(file)
            ? await extractOfficeImages(file, message => setProgress(`${file.name}: ${message}`))
            : isImage(file) ? [file] : [];
          if (!sources.length) failures.push(`${file.name}: no supported images found`);
          for (let j = 0; j < sources.length; j++) {
            setProgress(`Loading image ${j + 1} of ${sources.length}: ${file.name}`);
            try { loaded.push(await loadAsset(sources[j])); }
            catch (cause) { failures.push(cause instanceof Error ? cause.message : String(cause)); }
          }
        } catch (cause) {
          failures.push(`${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      }
      if (loaded.length) {
        setCards(previous => [...loaded.reverse(), ...previous]);
        setNotice(`Added ${loaded.length} ${loaded.length === 1 ? 'logo' : 'logos'} to your workboard.`);
      }
      if (failures.length) setError(failures.join('\n'));
    } finally {
      setProgress('');
      setWorkProgress(null);
      setBusy(false);
    }
  }

  async function exportOne(asset: LogoAsset) {
    setBusy(true);
    setError('');
    setProgress(`Exporting ${asset.filename || asset.source.name}`);
    setNotice('');
    setWorkProgress(null);
    try {
      const blob = await logoToBlob(asset, settings);
      downloadBlob(blob, `${sanitizeLogoFilename(asset.filename || 'logo') || 'logo'}.${outputExtension(settings.format)}`);
      setNotice('Image download started.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      setProgress('');
      setWorkProgress(null);
    }
  }
  async function exportZip() {
    if (!cards.length || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    setWorkProgress({ phase: 'Rendering logos', done: 0, total: cards.length });
    try {
      const zip = new JSZip();
      const names = uniqueExportNames(cards, outputExtension(settings.format));
      for (let i = 0; i < cards.length; i++) {
        setProgress(`Rendering ${i + 1} / ${cards.length} logos`);
        zip.file(names[i], await logoToBlob(cards[i], settings));
        setWorkProgress({ phase: 'Rendering logos', done: i + 1, total: cards.length });
      }
      setProgress('Compressing ZIP archive');
      setWorkProgress({ phase: 'Compressing ZIP', done: 0, total: 100 });
      let lastPercent = -1;
      const zipBlob = await zip.generateAsync({ type: 'blob' }, meta => {
        const percent = Math.round(meta.percent);
        if (percent !== lastPercent) {
          lastPercent = percent;
          setWorkProgress({ phase: 'Compressing ZIP', done: percent, total: 100 });
        }
      });
      downloadBlob(zipBlob, 'batch_logos.zip');
      setNotice(`ZIP download started — ${cards.length} ${cards.length === 1 ? 'logo' : 'logos'}.`);
    } catch (cause) {
      setError(`Export failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(false);
      setProgress('');
      setWorkProgress(null);
    }
  }
  function removeAsset(asset: LogoAsset) {
    setCards(previous => previous.filter(item => item.id !== asset.id));
    URL.revokeObjectURL(asset.url);
    if (focused === asset.id) {
      const index = cards.findIndex(item => item.id === asset.id);
      setFocused(cards.filter(item => item.id !== asset.id)[Math.min(index, cards.length - 2)]?.id || null);
    }
  }
  function expireUndo() {
    if (snapshotTimer.current) window.clearTimeout(snapshotTimer.current);
    snapshotTimer.current = null;
    snapshotRef.current?.cards.forEach(item => URL.revokeObjectURL(item.url));
    snapshotRef.current = null;
    setSnapshot(null);
  }
  function clearAll() {
    if (busy) return;
    expireUndo();
    const saved = { cards, settings };
    snapshotRef.current = saved;
    setSnapshot(saved);
    setCards([]);
    setFocused(null);
    setConfirmClear(false);
    setSettings({ ...DEFAULT_LOGO_SETTINGS });
    setDraft(dimensions(200, 200));
    snapshotTimer.current = window.setTimeout(expireUndo, 60_000);
  }
  function undoClear() {
    const saved = snapshotRef.current;
    if (!saved) return;
    if (snapshotTimer.current) window.clearTimeout(snapshotTimer.current);
    snapshotTimer.current = null;
    snapshotRef.current = null;
    setSnapshot(null);
    setCards(current => [...saved.cards, ...current]);
    setSettings(saved.settings);
    setDraft(dimensions(saved.settings.width, saved.settings.height));
  }
  function openFocus(id: string) {
    focusOrigin.current = id;
    setFocused(id);
  }
  function closeFocus() {
    const restoreId = focusOrigin.current;
    setFocused(null);
    window.requestAnimationFrame(() => {
      const origin = [...document.querySelectorAll<HTMLButtonElement>('.logo-preview-button')].find(button => button.dataset.previewId === restoreId);
      (origin ?? document.querySelector<HTMLButtonElement>('.forge-v5-import .forge-v5-action'))?.focus();
    });
  }
  function navigateFocus(direction: number) {
    if (!focused || !cards.length) return;
    const index = cards.findIndex(asset => asset.id === focused);
    setFocused(cards[(index + direction + cards.length) % cards.length].id);
  }
  useEffect(() => {
    if (!focused || pending || confirmClear || showLinks) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        if (event.key !== 'Escape') return;
      }
      if (event.key === 'Escape') closeFocus();
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigateFocus(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); navigateFocus(1); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
    // Focus navigation must follow the currently visible list.
  }, [focused, cards, pending, confirmClear, showLinks]);

  useEffect(() => {
    // Focus once on opening, not on every Previous/Next navigation or field edit.
    if (focused && !focusWasOpen.current) editorRef.current?.focus({ preventScroll: true });
    focusWasOpen.current = Boolean(focused);
  }, [focused]);

  // Treat confirmation and link dialogs as real keyboard-contained surfaces.
  useEffect(() => {
    if (!pending && !confirmClear && !showLinks) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selectFocusable = () => [...document.querySelectorAll<HTMLElement>(
      '.logo-modal[role="dialog"] button, .logo-modal[role="dialog"] input, .logo-modal[role="dialog"] select, .logo-modal[role="dialog"] textarea'
    )].filter(element => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
    const frame = window.requestAnimationFrame(() => selectFocusable()[0]?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmNoLogos) setConfirmNoLogos(false);
        else if (pending) setPending(null);
        else if (confirmClear) setConfirmClear(false);
        else setShowLinks(false);
      } else if (event.key === 'Tab') {
        const items = selectFocusable();
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        else if (!items.includes(document.activeElement as HTMLElement)) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [Boolean(pending), confirmClear, showLinks, confirmNoLogos]);

  const detail = cards.find(asset => asset.id === focused) ?? null;
  // Avoid expensive FLIP measurements and staggered animation on large logo batches.
  const animateGallery = !prefersReducedMotion && cards.length <= 18;
  const layoutChange = `${cards.length}:${focused ?? ''}`;
  const updateLabel = (asset: LogoAsset, value: string) => {
    patchCard(asset.id, {
      label: value,
      ...(settings.syncFilename && value.trim()
        ? { filename: sanitizeLogoFilename(value.trim().substring(0, 30)) } : {}),
    });
  };
  function openLinkDialog() {
    setLinks('');
    setBrands('');
    setLinkMessage(`${cards.length} logos loaded.`);
    setShowLinks(true);
  }
  function makeLinks(forceEmpty = false) {
    if (!brands.trim()) { setLinkMessage('Please enter at least one brand name.'); return; }
    if (!cards.length && !forceEmpty) { setConfirmNoLogos(true); return; }
    try {
      const text = generateLogoLinks({
        brands: brands.split(/\r?\n/),
        filenames: cards.map(asset => asset.filename),
        folder, server, format: settings.format,
      });
      setLinks(text);
      setLinkMessage(`Generated ${brands.split(/\r?\n/).filter(item => item.trim()).length} links.`);
      setConfirmNoLogos(false);
    } catch (cause) { setLinkMessage(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function copyLinks() {
    if (!links) { setLinkMessage('Nothing to copy.'); return; }
    try { await navigator.clipboard.writeText(links); setLinkMessage('Copied HTML.'); }
    catch { setLinkMessage('Copy blocked. Select the text and copy it manually.'); }
  }

  return (
    <section className="logo-workspace forge-logo-v5 forge-v7-workroom" aria-label="Logo Resizer">
      <input ref={inputRef} type="file" accept="image/*,.pptx,.xlsx,.xlsm" multiple hidden onChange={onFileInput} />
      <div className="forge-v5-head" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
        <div className="forge-v5-command-deck" aria-label="Global logo settings and actions">
          <div className="forge-v5-control-grid">
            <div className="forge-v5-group forge-v5-import">
              <span className="forge-v5-group-title">IMPORT / LINKS</span>
              <div className="forge-v5-button-stack">
                <button type="button" className="forge-v5-action forge-v5-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
                  <span aria-hidden="true">＋</span> Add assets
                </button>
                <button type="button" className="forge-v5-action" onClick={openLinkDialog}>Generate links</button>
              </div>
            </div>
            <div className="forge-v5-group forge-v5-presets">
              <span className="forge-v5-group-title">CANVAS PRESETS</span>
              <div className="forge-v5-preset-grid" aria-label="Size presets">
                {LOGO_PRESETS.map(preset => {
                  const selected = settings.width === preset.width && settings.height === preset.height;
                  return <button key={preset.label} type="button" className={selected ? 'selected' : ''}
                    aria-pressed={selected} onClick={() => setSize(preset.width, preset.height)}>
                    {selected && <motion.span className="forge-v7-preset-selection" layoutId="forge-v7-preset"
                      transition={{ type: 'spring', stiffness: 480, damping: 38, mass: .8 }} />}
                    <span className="forge-v7-preset-copy">{preset.label}</span>
                  </button>;
                })}
              </div>
            </div>
            <div className="forge-v5-group forge-v5-custom">
              <span className="forge-v5-group-title">CUSTOM <small>PX</small></span>
              <div className="forge-v5-dimensions">
                <label><span>W</span><input aria-label="Width in pixels" type="number" min="1" max="8192" value={draft.width} onChange={event => updateDimension('width',event.target.value)} /></label>
                <label><span>H</span><input aria-label="Height in pixels" type="number" min="1" max="8192" value={draft.height} onChange={event => updateDimension('height',event.target.value)} /></label>
              </div>
            </div>
            <div className="forge-v5-group forge-v5-format">
              <span className="forge-v5-group-title">SAVE AS</span>
              <select aria-label="Download format" value={settings.format} onChange={event => patchSettings({format:event.target.value as 'png' | 'jpeg'})}>
                <option value="png">PNG</option><option value="jpeg">JPG</option>
              </select>
              <small className="forge-v5-subnote">WHITE CANVAS</small>
            </div>
            <div className="forge-v5-group forge-v5-typography">
              <span className="forge-v5-group-title">LABEL TYPOGRAPHY</span>
              <div className="forge-v5-type-controls">
                <select aria-label="Font family" value={settings.fontFamily} onChange={event => patchSettings({fontFamily:event.target.value})}>
                  {LOGO_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
                <input aria-label="Global label font size" type="number" min="8" max="200" placeholder="28" value={settings.fontSize} onChange={event=>patchSettings({fontSize:event.target.value})} />
                <label className="forge-v5-swatch" title="Text color">
                  <input aria-label="Text color" type="color" value={settings.fontColor} onChange={event=>patchSettings({fontColor:event.target.value})}/>
                </label>
              </div>
              <small className="forge-v5-subnote">FONT · SIZE · COLOR</small>
            </div>
            <div className="forge-v5-group forge-v5-options">
              <span className="forge-v5-group-title">LABEL OPTIONS</span>
              <div className="forge-v5-checkboxes">
                <label><input type="checkbox" checked={settings.bold} onChange={event=>patchSettings({bold:event.target.checked})}/> Bold</label>
                <label><input type="checkbox" checked={settings.syncFilename} onChange={event=>patchSettings({syncFilename:event.target.checked})}/> Sync filename</label>
              </div>
            </div>
            <div className="forge-v5-group forge-v5-position">
              <span className="forge-v5-group-title">IMAGE POSITIONING</span>
              <div className="forge-v5-sliders">
                <label><span>PADDING</span>
                  <input type="range" aria-label="Global image padding" min="0" max="150" value={settings.padding} style={rangeStyle(settings.padding, 0, 150)}
                    onChange={event=>patchSettings({padding:Number(event.target.value)})}/>
                  <output>{settings.padding} px</output>
                </label>
                <label><span>IMAGE Y</span>
                  <input type="range" aria-label="Global vertical image offset" min="-50" max="50" value={settings.imageOffset} style={rangeStyle(settings.imageOffset, -50, 50)}
                    onChange={event=>patchSettings({imageOffset:Number(event.target.value)})}/>
                  <output>{settings.imageOffset}</output>
                </label>
              </div>
            </div>
            <div className="forge-v5-group forge-v5-exports">
              <span className="forge-v5-group-title">WORKROOM ACTIONS</span>
              <div className="forge-v5-button-stack">
                <button className="forge-v5-action forge-v5-ghost" type="button" onClick={()=>setConfirmClear(true)} disabled={!cards.length || busy}>Clear workroom</button>
                <button className="forge-v5-action forge-v5-primary" type="button" onClick={()=>void exportZip()} disabled={!cards.length || busy}>Export batch ZIP <span aria-hidden="true">↗</span></button>
              </div>
            </div>
          </div>
          <div className="forge-v5-deck-foot">
            <span className="forge-v5-live"><i aria-hidden="true"/> LIVE PREVIEW</span>
            <output className="forge-v5-current-size">{settings.width} × {settings.height} <small>PX</small></output>
          </div>
        </div>
      </div>
      {progress && <div className="logo-progress forge-v6-progress" role="status" aria-live="polite">
        <div className="forge-v6-progress-meta">
          <span className="forge-v6-processing-dot" aria-hidden="true" />
          <span className="forge-v6-progress-message">{progress}</span>
          {workProgress && <strong>{Math.round(workProgress.done / Math.max(1, workProgress.total) * 100)}%</strong>}
        </div>
        {workProgress && <progress aria-label={workProgress.phase} value={workProgress.done} max={workProgress.total} />}
      </div>}
      <AnimatePresence initial={false}>
        {notice && <motion.div className="forge-v6-notice" role="status" aria-live="polite"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -5 }}
          transition={{ duration: prefersReducedMotion ? 0 : .19 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">×</button>
        </motion.div>}
      </AnimatePresence>
      {error && <div className="logo-error" role="alert">{error}</div>}
      {snapshot && <div className="logo-undo" role="status">Workspace cleared. <button type="button" onClick={undoClear}>Undo with all edits</button> <button type="button" onClick={expireUndo} aria-label="Dismiss undo">Dismiss</button></div>}
      <div className="logo-body forge-v7-body">
        <main className={`logo-gallery${dragActive ? ' forge-v6-drag-active' : ''}`}
          inert={Boolean(detail)} aria-hidden={Boolean(detail)}
          onDragEnter={onGalleryDragEnter} onDragLeave={onGalleryDragLeave}
          onDragOver={event => { if (Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault(); }}
          onDrop={onDrop}>
          <AnimatePresence initial={false}>
            {dragActive && <motion.div className="forge-v6-drop-overlay" aria-hidden="true"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : .14 }}>
              <span>DROP ASSETS TO IMPORT</span><small>Images · PowerPoint · Excel</small>
            </motion.div>}
          </AnimatePresence>
          <div className="forge-v5-board-heading"><div><span>IMAGE WORKBOARD</span><h2>{cards.length ? "Your logos" : "Your workboard is empty"}</h2></div><small>{cards.length} {cards.length === 1 ? 'ASSET' : 'ASSETS'}</small></div>
          <AnimatePresence initial={false}>
          {!cards.length && (
            <motion.div className="logo-empty" key="empty-workroom"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : .17 }}>
              <div className="forge-v5-drop-icon"><LogoResizerIcon /></div>
              <h3>Make room for your logos.</h3>
              <p>Drop a batch of images, PowerPoint slides, or Excel files here. Confirm the output size, then refine every asset individually.</p>
              <button type="button" className="forge-v5-action forge-v5-primary" onClick={() => inputRef.current?.click()}>Choose files ↗</button>
              <small>PNG · JPG · WEBP · SVG · PPTX · XLSX · XLSM</small>
            </motion.div>
          )}
          </AnimatePresence>
          <div className="logo-grid">
            <AnimatePresence initial={false} mode={animateGallery ? 'popLayout' : 'sync'}>
              {cards.map((asset, index) => (
                <motion.article
                  key={asset.id}
                  className="logo-card"
                  layout={animateGallery ? 'position' : false}
                  layoutDependency={layoutChange}
                  initial={animateGallery ? { opacity: 0, y: 12 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={animateGallery ? { opacity: 0, scale: .97 } : { opacity: 0 }}
                  transition={{ duration: animateGallery ? .24 : 0, ease: [.16, 1, .3, 1], layout: { duration: .28 } }}>
                  <div className="logo-card-heading"><span className="forge-v5-card-index">{String(cards.length - index).padStart(2,"0")}</span>
                    <input aria-label={`Filename for ${asset.source.name}`} value={asset.filename} onChange={event => patchCard(asset.id, { filename: sanitizeLogoFilename(event.target.value) })} placeholder="Untitled" />
                    <button type="button" title="Remove logo" aria-label={`Remove ${asset.source.name}`} onClick={() => removeAsset(asset)} disabled={busy}>×</button>
                  </div>
                  <button className="logo-preview-button" type="button" data-preview-id={asset.id}
                    style={{minHeight: Math.min(318, Math.max(218, settings.height + 64))}}
                    onClick={() => openFocus(asset.id)} aria-label={`Open Focus Mode for ${asset.source.name}`}>
                    <span className="forge-v6-art forge-v7-card-art">
                      <LogoPreview asset={asset} settings={settings} />
                    </span>
                    <span className="forge-v7-card-open" aria-hidden="true">OPEN EDITOR <span>↗</span></span>
                    <span className="forge-v5-card-size">{settings.width} × {settings.height} PX</span>
                  </button>
                  <div className="logo-card-controls">
                    <label>Overlay label<textarea rows={2} value={asset.label} placeholder="Optional label" onChange={event => updateLabel(asset, event.target.value)} /></label>
                    <div className="logo-card-footer">
                      <label>Font size <input type="number" min="1" placeholder="Auto" value={asset.fontSizeOverride ?? ''} onChange={event => patchCard(asset.id, { fontSizeOverride: event.target.value === '' ? null : Number(event.target.value) })} /></label>
                      <button type="button" onClick={() => void exportOne(asset)} disabled={busy}>Save</button>
                    </div>
                  </div>
                </motion.article>
              ))}
              </AnimatePresence>
          </div>
        </main>
        <AnimatePresence initial={false}>
        {detail && <motion.aside ref={editorRef} tabIndex={-1} className="logo-detail forge-v7-editor" aria-label="Focus Mode"
          key="focus-panel"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: prefersReducedMotion ? 1 : .992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 8, scale: prefersReducedMotion ? 1 : .994 }}
          transition={{ duration: prefersReducedMotion ? .01 : .32, ease: [.2, 1, .25, 1] }}>
          <div className="logo-detail-heading">
            <div className="forge-v7-editor-title">
              <span className="forge-v7-eyebrow">THE FORGE / IMAGE EDITOR</span>
              <strong>Focus Mode<span className="forge-v7-title-dot">.</span></strong>
            </div>
            <span className="forge-v7-editor-counter">{cards.findIndex(asset => asset.id === detail.id) + 1} <span>of</span> {cards.length}</span>
            <div className="logo-detail-buttons">
              <button type="button" aria-label="Previous logo" title="Previous logo (←)" onClick={() => navigateFocus(-1)}>←</button>
              <button type="button" aria-label="Next logo" title="Next logo (→)" onClick={() => navigateFocus(1)}>→</button>
              <button type="button" aria-label="Close Focus Mode" title="Close Focus Mode (Esc)" onClick={closeFocus}>×</button>
            </div>
          </div>
          <div className="forge-v7-editor-content">
            <div className="forge-v7-editor-stage">
              <div className="forge-v7-stage-topline"><span>LIVE OUTPUT PREVIEW</span><span>{settings.width} × {settings.height} PX</span></div>
              <div className="forge-v5-focus-stage">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={detail.id} className="forge-v6-art forge-v6-focus-art"
                    initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : .975 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : .985 }}
                    transition={{ duration: prefersReducedMotion ? .01 : .19, ease: [.2, 1, .3, 1] }}>
                    <LogoPreview asset={detail} settings={settings} className="logo-detail-preview" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="forge-v7-stage-bottomline">
                <span>{detail.filename || detail.source.name}</span>
                <span>WHITE CANVAS · ORIGINAL OUTPUT DIMENSIONS</span>
              </div>
            </div>
            <div className="forge-v7-editor-inspector">
              <div className="forge-v7-inspector-heading">
                <div><span className="forge-v7-eyebrow">PRECISION CONTROLS</span><h3>Asset settings</h3></div>
                <span className="forge-v7-inspector-live"><i aria-hidden="true" /> LIVE</span>
              </div>
              <div className="forge-v7-inspector-fields">
                <div className="forge-v5-focus-section-label">ASSET DETAILS</div>
                <label>Filename<input value={detail.filename} onChange={event => patchCard(detail.id, { filename: sanitizeLogoFilename(event.target.value) })} /></label>
                <label>Overlay label<textarea rows={3} value={detail.label} onChange={event => updateLabel(detail, event.target.value)} /></label>
                <label>Font size override<input type="number" min="1" placeholder="Use global setting" value={detail.fontSizeOverride ?? ''} onChange={event => patchCard(detail.id, { fontSizeOverride: event.target.value === '' ? null : Number(event.target.value) })} /></label>
                <div className="forge-v5-focus-section-label">POSITIONING</div>
                <label className="forge-v7-range-control">
                  <span>Image padding <span className="forge-v7-value">{detail.paddingOverride ?? settings.padding}px</span></span>
                  <input aria-label="Focus image padding" type="range" min="0" max="150" value={detail.paddingOverride ?? settings.padding}
                    style={rangeStyle(detail.paddingOverride ?? settings.padding, 0, 150)}
                    onChange={event => patchCard(detail.id, { paddingOverride: Number(event.target.value) })} />
                </label>
                <button type="button" className="forge-v7-reset" onClick={() => patchCard(detail.id, { paddingOverride: null })}>↶ Reset padding to global</button>
                <label className="forge-v7-range-control">
                  <span>Image Y offset <span className="forge-v7-value">{detail.imageOffset}</span></span>
                  <input aria-label="Focus image Y offset" type="range" min="-50" max="50" value={detail.imageOffset}
                    style={rangeStyle(detail.imageOffset, -50, 50)}
                    onChange={event => patchCard(detail.id, { imageOffset: Number(event.target.value) })} />
                </label>
                <label className="forge-v7-range-control">
                  <span>Text Y offset <span className="forge-v7-value">{detail.textOffset}</span></span>
                  <input aria-label="Focus text Y offset" type="range" min="0" max="100" value={detail.textOffset}
                    style={rangeStyle(detail.textOffset, 0, 100)}
                    onChange={event => patchCard(detail.id, { textOffset: Number(event.target.value) })} />
                </label>
              </div>
              <div className="logo-detail-actions">
                <button className="logo-primary" type="button" disabled={busy} onClick={() => void exportOne(detail)}>Save image <span aria-hidden="true">↗</span></button>
                <button className="forge-v7-danger" type="button" disabled={busy} onClick={() => removeAsset(detail)}>Delete</button>
              </div>
            </div>
          </div>
        </motion.aside>}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {pending && <motion.div key="dimension-dialog" className="logo-modal-backdrop" role="presentation"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : .2 }}>
          <motion.div className="logo-modal" role="dialog" aria-modal="true" aria-label="Set logo dimensions"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14, scale: prefersReducedMotion ? 1 : .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 8, scale: prefersReducedMotion ? 1 : .99 }}
            transition={{ duration: prefersReducedMotion ? 0 : .28, ease: [.2, 1, .25, 1] }}>
            <span className="forge-v7-modal-kicker">IMPORT / ASSET PREPARATION</span>
            <h2>Set logo dimensions</h2>
            <p>Confirm the output canvas for {pending.length} {pending.length === 1 ? 'file' : 'files'} before importing.</p>
            <div className="logo-presets" aria-label="Import size presets">
              {LOGO_PRESETS.map(preset => <button type="button" key={preset.label}
                className={settings.width === preset.width && settings.height === preset.height ? 'selected' : ''}
                onClick={() => setSize(preset.width, preset.height)}>{preset.label}</button>)}
            </div>
            <div className="logo-two-fields">
              <label>Width (px)<input type="number" min="1" max="8192" value={draft.width} onChange={event => updateDimension('width', event.target.value)} /></label>
              <label>Height (px)<input type="number" min="1" max="8192" value={draft.height} onChange={event => updateDimension('height', event.target.value)} /></label>
            </div>
            <div className="logo-modal-actions">
              <button type="button" onClick={() => setPending(null)}>Cancel</button>
              <button className="logo-primary" type="button" onClick={() => void importPending()}>Apply &amp; process <span aria-hidden="true">↗</span></button>
            </div>
          </motion.div>
        </motion.div>}
        {confirmClear && <motion.div key="clear-dialog" className="logo-modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : .2 }}>
          <motion.div className="logo-modal" role="dialog" aria-modal="true" aria-label="Clear logo workspace"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14, scale: prefersReducedMotion ? 1 : .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : .26, ease: [.2, 1, .25, 1] }}>
            <span className="forge-v7-modal-kicker">WORKROOM / RECOVERABLE ACTION</span>
            <h2>Clear all logos?</h2>
            <p>Remove the imported logos and reset the settings? You can restore the entire workspace with edits for 60 seconds.</p>
            <div className="logo-modal-actions">
              <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button type="button" className="forge-v7-modal-danger" onClick={clearAll}>Clear all</button>
            </div>
          </motion.div>
        </motion.div>}
        {showLinks && <motion.div key="links-dialog" className="logo-modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : .2 }}>
          <motion.div className="logo-modal logo-link-dialog" role="dialog" aria-modal="true" aria-label="Generate logo links"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14, scale: prefersReducedMotion ? 1 : .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
            transition={{ duration: prefersReducedMotion ? 0 : .28, ease: [.2, 1, .25, 1] }}>
            <span className="forge-v7-modal-kicker">EXPORT / HTML LINKS</span>
            <div className="logo-link-title"><h2>Generate logo links</h2>
              <button type="button" aria-label="Close links" onClick={() => setShowLinks(false)}>×</button>
            </div>
            <div className="logo-two-fields">
              <label>Server<select value={server} onChange={event => setServer(event.target.value as LogoServer)}>
                <option value="s3">S3 Media</option><option value="aldi">Aldi Media</option></select></label>
              <label>Folder path<input value={folder} onChange={event => setFolder(event.target.value)} placeholder="logos/2026/summer" /></label>
            </div>
            <label>Brand names (one per line)<textarea rows={7} value={brands} onChange={event => setBrands(event.target.value)} placeholder="Brand A&#10;Brand B" /></label>
            <label>Generated HTML<textarea rows={7} value={links} readOnly /></label>
            <p className="logo-subtle" role="status">{linkMessage}</p>
            <div className="logo-modal-actions">
              <button type="button" onClick={() => setShowLinks(false)}>Close</button>
              <button type="button" onClick={() => makeLinks()}>Generate</button>
              <button className="logo-primary" type="button" onClick={() => void copyLinks()}>Copy HTML</button>
            </div>
            {confirmNoLogos && <div className="logo-link-warning" role="alertdialog" aria-label="No logos uploaded">
              <p>No logos are uploaded. Generate links using the brand names as filenames?</p>
              <button type="button" onClick={() => setConfirmNoLogos(false)}>Cancel</button>
              <button type="button" onClick={() => makeLinks(true)}>Proceed anyway</button>
            </div>}
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </section>
  );
}
