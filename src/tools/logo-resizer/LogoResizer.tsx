import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type CSSProperties } from 'react';
import JSZip from 'jszip';
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

let nextLogoId = 0;
const isOffice = (file: File) => /\.(pptx|xlsx|xlsm)$/i.test(file.name);
const isImage = (file: File) => file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name);
const dimensions = (w: number, h: number) => ({ width: String(w), height: String(h) });
type Snapshot = { cards: LogoAsset[]; settings: LogoSettings };

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
  const lastFocusAsset = useRef<LogoAsset | null>(null);
  const [keepFocusForExit, setKeepFocusForExit] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [brands, setBrands] = useState('');
  const [server, setServer] = useState<LogoServer>('s3');
  const [folder, setFolder] = useState('');
  const [links, setLinks] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const [confirmNoLogos, setConfirmNoLogos] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      cardsRef.current.forEach(asset => URL.revokeObjectURL(asset.url));
      snapshotRef.current?.cards.forEach(asset => URL.revokeObjectURL(asset.url));
      if (snapshotTimer.current) window.clearTimeout(snapshotTimer.current);
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
    if (event.dataTransfer.files.length) askToUpload(event.dataTransfer.files);
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
    const loaded: LogoAsset[] = [];
    const failures: string[] = [];
    try {
      for (let index = 0; index < uploads.length; index++) {
        const file = uploads[index];
        setProgress(`Importing ${index + 1} of ${uploads.length}: ${file.name}`);
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
      if (loaded.length) setCards(previous => [...loaded.reverse(), ...previous]);
      if (failures.length) setError(failures.join('\n'));
    } finally {
      setProgress('');
      setBusy(false);
    }
  }

  async function exportOne(asset: LogoAsset) {
    setBusy(true);
    setError('');
    setProgress(`Exporting ${asset.filename || asset.source.name}`);
    try {
      const blob = await logoToBlob(asset, settings);
      downloadBlob(blob, `${sanitizeLogoFilename(asset.filename || 'logo') || 'logo'}.${outputExtension(settings.format)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      setProgress('');
    }
  }
  async function exportZip() {
    if (!cards.length || busy) return;
    setBusy(true);
    setError('');
    try {
      const zip = new JSZip();
      const names = uniqueExportNames(cards, outputExtension(settings.format));
      for (let i = 0; i < cards.length; i++) {
        setProgress(`Rendering ${i + 1} / ${cards.length} logos`);
        zip.file(names[i], await logoToBlob(cards[i], settings));
      }
      setProgress('Creating ZIP archive');
      const zipBlob = await zip.generateAsync({ type: 'blob' }, meta => {
        setProgress(`Compressing ZIP: ${Math.round(meta.percent)}%`);
      });
      downloadBlob(zipBlob, 'batch_logos.zip');
    } catch (cause) {
      setError(`Export failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(false);
      setProgress('');
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
  function navigateFocus(direction: number) {
    if (!focused || !cards.length) return;
    const index = cards.findIndex(asset => asset.id === focused);
    setFocused(cards[(index + direction + cards.length) % cards.length].id);
  }
  useEffect(() => {
    if (!focused) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        if (event.key !== 'Escape') return;
      }
      if (event.key === 'Escape') setFocused(null);
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigateFocus(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); navigateFocus(1); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
    // Focus navigation must follow the currently visible list.
  }, [focused, cards]);

  const detail = cards.find(asset => asset.id === focused) ?? null;
  // Presentation only: retain the last focused card for the sidebar's
  // exit transform. The underlying focused state changes immediately.
  useEffect(() => {
    if (detail) {
      lastFocusAsset.current = detail;
      setKeepFocusForExit(true);
      return;
    }
    if (!lastFocusAsset.current) return;
    const timeout = window.setTimeout(() => {
      lastFocusAsset.current = null;
      setKeepFocusForExit(false);
    }, 240);
    return () => window.clearTimeout(timeout);
  }, [detail]);
  const focusDisplayDetail = detail ?? (keepFocusForExit ? lastFocusAsset.current : null);
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
    <section className="logo-workspace forge-logo-v5" aria-label="Logo Resizer">
      <input ref={inputRef} type="file" accept="image/*,.pptx,.xlsx,.xlsm" multiple hidden onChange={onFileInput} />
      <div className="forge-v5-head" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
        <div className="forge-v5-intro">
          <div className="forge-v5-eyebrow">WORKROOM 01 / IMAGE PROCESSING</div>
          <div className="forge-v5-title"><LogoResizerIcon /><h1>Logo resizer<span>.</span></h1></div>
        </div>
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
                {LOGO_PRESETS.map(preset => <button
                  key={preset.label} type="button"
                  className={settings.width === preset.width && settings.height === preset.height ? 'selected' : ''}
                  aria-pressed={settings.width === preset.width && settings.height === preset.height}
                  onClick={() => setSize(preset.width, preset.height)}
                >{preset.label}</button>)}
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
                  <input type="range" aria-label="Global image padding" min="0" max="150" value={settings.padding}
                    onChange={event=>patchSettings({padding:Number(event.target.value)})}/>
                  <output>{settings.padding} px</output>
                </label>
                <label><span>IMAGE Y</span>
                  <input type="range" aria-label="Global vertical image offset" min="-50" max="50" value={settings.imageOffset}
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
            <span>ASPECT RATIO PRESERVED</span>
            <span>ALL EDITS STAY IN YOUR BROWSER</span>
            <output className="forge-v5-current-size">{settings.width} × {settings.height} <small>PX</small></output>
          </div>
        </div>
      </div>
      {progress && <div className="logo-progress" role="status">{progress}</div>}
      {error && <div className="logo-error" role="alert">{error}</div>}
      {snapshot && <div className="logo-undo" role="status">Workspace cleared. <button type="button" onClick={undoClear}>Undo with all edits</button> <button type="button" onClick={expireUndo} aria-label="Dismiss undo">Dismiss</button></div>}
      <div className="logo-body">
        <main className="logo-gallery" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
          <div className="forge-v5-board-heading"><div><span>01 — CANVAS / ASSET BOARD</span><h2>{cards.length ? cards.length + (cards.length === 1 ? " logo in your workboard" : " logos in your workboard") : "Your workboard is empty"}</h2></div><small>{String(cards.length).padStart(2,"0")} / ASSETS</small></div>
          {!cards.length ? (
            <div className="logo-empty">
              <div className="forge-v5-drop-icon"><LogoResizerIcon /></div>
              <h3>Make room for your logos.</h3>
              <p>Drop a batch of images, PowerPoint slides, or Excel files here. Confirm the output size, then refine every asset individually.</p>
              <button type="button" className="forge-v5-action forge-v5-primary" onClick={() => inputRef.current?.click()}>Choose files ↗</button>
              <small>PNG · JPG · WEBP · SVG · PPTX · XLSX · XLSM</small>
            </div>
          ) : (
            <div className="logo-grid">
              {cards.map(asset => (
                <article key={asset.id} className="logo-card" style={{ '--logo-preview-ratio': `${settings.width} / ${settings.height}` } as CSSProperties}>
                  <div className="logo-card-heading"><span className="forge-v5-card-index">{String(cards.length - cards.indexOf(asset)).padStart(2,"0")}</span>
                    <input aria-label={`Filename for ${asset.source.name}`} value={asset.filename} onChange={event => patchCard(asset.id, { filename: sanitizeLogoFilename(event.target.value) })} placeholder="Untitled" />
                    <button type="button" title="Remove logo" aria-label={`Remove ${asset.source.name}`} onClick={() => removeAsset(asset)} disabled={busy}>×</button>
                  </div>
                  <button className="logo-preview-button" type="button" onClick={() => setFocused(asset.id)} aria-label={`Open Focus Mode for ${asset.source.name}`}>
                    <LogoPreview asset={asset} settings={settings} />
                    <span className="forge-v5-card-size">{settings.width} × {settings.height} PX</span>
                  </button>
                  <div className="logo-card-controls">
                    <label>Overlay label<textarea rows={2} value={asset.label} placeholder="Optional label" onChange={event => updateLabel(asset, event.target.value)} /></label>
                    <div className="logo-card-footer">
                      <label>Font size <input type="number" min="1" placeholder="Auto" value={asset.fontSizeOverride ?? ''} onChange={event => patchCard(asset.id, { fontSizeOverride: event.target.value === '' ? null : Number(event.target.value) })} /></label>
                      <button type="button" onClick={() => void exportOne(asset)} disabled={busy}>Save</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
        {focusDisplayDetail && <aside className={'logo-detail' + (detail ? ' is-open' : '')} aria-label="Focus Mode" aria-hidden={!detail} inert={!detail}>
          <div className="logo-detail-heading">
            <strong>Focus Mode</strong>
            <div className="logo-detail-buttons">
              <button type="button" aria-label="Previous logo" onClick={() => navigateFocus(-1)}>←</button>
              <button type="button" aria-label="Next logo" onClick={() => navigateFocus(1)}>→</button>
              <button type="button" aria-label="Close Focus Mode" onClick={() => setFocused(null)}>×</button>
            </div>
          </div>
          <p className="logo-subtle">{cards.findIndex(asset => asset.id === focusDisplayDetail.id) + 1} of {cards.length}</p>
          <LogoPreview asset={focusDisplayDetail} settings={settings} className="logo-detail-preview" />
          <label>Filename<input value={focusDisplayDetail.filename} onChange={event => patchCard(focusDisplayDetail.id, { filename: sanitizeLogoFilename(event.target.value) })} /></label>
          <label>Overlay label<textarea rows={3} value={focusDisplayDetail.label} onChange={event => updateLabel(detail, event.target.value)} /></label>
          <label>Font size override<input type="number" min="1" placeholder="Use global setting" value={focusDisplayDetail.fontSizeOverride ?? ''} onChange={event => patchCard(focusDisplayDetail.id, { fontSizeOverride: event.target.value === '' ? null : Number(event.target.value) })} /></label>
          <label>Image padding {focusDisplayDetail.paddingOverride ?? settings.padding}px <input type="range" min="0" max="150" value={focusDisplayDetail.paddingOverride ?? settings.padding} onChange={event => patchCard(focusDisplayDetail.id, { paddingOverride: Number(event.target.value) })} /></label>
          <button type="button" onClick={() => patchCard(focusDisplayDetail.id, { paddingOverride: null })}>Reset padding to global</button>
          <label>Image Y offset {focusDisplayDetail.imageOffset} <input type="range" min="-50" max="50" value={focusDisplayDetail.imageOffset} onChange={event => patchCard(focusDisplayDetail.id, { imageOffset: Number(event.target.value) })} /></label>
          <label>Text Y offset {focusDisplayDetail.textOffset} <input type="range" min="0" max="100" value={focusDisplayDetail.textOffset} onChange={event => patchCard(focusDisplayDetail.id, { textOffset: Number(event.target.value) })} /></label>
          <div className="logo-detail-actions">
            <button className="logo-primary" type="button" disabled={busy} onClick={() => void exportOne(focusDisplayDetail)}>Save image</button>
            <button type="button" disabled={busy} onClick={() => removeAsset(focusDisplayDetail)}>Delete</button>
          </div>
        </aside>}
      </div>
      {pending && <div className="logo-modal-backdrop" role="presentation">
        <div className="logo-modal" role="dialog" aria-modal="true" aria-label="Set logo dimensions">
          <h2>Set logo dimensions</h2>
          <p>Confirm the size before importing {pending.length} file(s).</p>
          <div className="logo-presets">
            {LOGO_PRESETS.map(preset => <button type="button" key={preset.label} className={settings.width === preset.width && settings.height === preset.height ? 'selected' : ''} onClick={() => setSize(preset.width, preset.height)}>{preset.label}</button>)}
          </div>
          <div className="logo-two-fields">
            <label>Width (px)<input type="number" min="1" max="8192" value={draft.width} onChange={event => updateDimension('width', event.target.value)} /></label>
            <label>Height (px)<input type="number" min="1" max="8192" value={draft.height} onChange={event => updateDimension('height', event.target.value)} /></label>
          </div>
          <div className="logo-modal-actions"><button type="button" onClick={() => setPending(null)}>Cancel</button><button className="logo-primary" type="button" onClick={() => void importPending()}>Apply &amp; process</button></div>
        </div>
      </div>}
      {confirmClear && <div className="logo-modal-backdrop"><div className="logo-modal" role="dialog" aria-modal="true" aria-label="Clear logo workspace"><h2>Clear all logos?</h2><p>Remove all uploaded logos and reset settings? You can undo this with your edits intact.</p><div className="logo-modal-actions"><button type="button" onClick={() => setConfirmClear(false)}>Cancel</button><button type="button" onClick={clearAll}>Clear all</button></div></div></div>}
      {showLinks && <div className="logo-modal-backdrop"><div className="logo-modal logo-link-dialog" role="dialog" aria-modal="true" aria-label="Generate logo links">
        <div className="logo-link-title"><h2>Generate logo links</h2><button type="button" aria-label="Close links" onClick={() => setShowLinks(false)}>×</button></div>
        <div className="logo-two-fields"><label>Server<select value={server} onChange={event => setServer(event.target.value as LogoServer)}><option value="s3">S3 Media</option><option value="aldi">Aldi Media</option></select></label><label>Folder path<input value={folder} onChange={event => setFolder(event.target.value)} placeholder="logos/2026/summer" /></label></div>
        <label>Brand names (one per line)<textarea rows={7} value={brands} onChange={event => setBrands(event.target.value)} placeholder="Brand A&#10;Brand B" /></label>
        <label>Generated HTML<textarea rows={7} value={links} readOnly /></label>
        <p className="logo-subtle" role="status">{linkMessage}</p>
        <div className="logo-modal-actions"><button type="button" onClick={() => setShowLinks(false)}>Close</button><button type="button" onClick={() => makeLinks()}>Generate</button><button className="logo-primary" type="button" onClick={() => void copyLinks()}>Copy HTML</button></div>
        {confirmNoLogos && <div className="logo-link-warning" role="alertdialog" aria-label="No logos uploaded"><p>No logos are uploaded. Generate links using the brand names as filenames?</p><button type="button" onClick={() => setConfirmNoLogos(false)}>Cancel</button><button type="button" onClick={() => makeLinks(true)}>Proceed anyway</button></div>}
      </div></div>}
    </section>
  );
}
