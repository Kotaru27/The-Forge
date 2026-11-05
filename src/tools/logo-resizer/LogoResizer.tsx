import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import JSZip from 'jszip';
import { LogoPreview } from './LogoPreview';
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive while Windows/browser download dispatch finishes.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
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
    <section className="logo-workspace" aria-label="Logo Resizer">
      <input ref={inputRef} type="file" accept="image/*,.pptx,.xlsx,.xlsm" multiple hidden onChange={onFileInput} />
      <div className="logo-toolbar" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
        <button className="logo-primary" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>Upload logos</button>
        <span className="logo-hint">Images · PPTX · XLSX / XLSM · Drop files here</span>
        <div className="logo-toolbar-actions">
          <button type="button" onClick={openLinkDialog}>Generate links</button>
          <button type="button" onClick={() => setConfirmClear(true)} disabled={!cards.length || busy}>Clear all</button>
          <button className="logo-primary" type="button" onClick={() => void exportZip()} disabled={!cards.length || busy}>Download ZIP</button>
        </div>
      </div>
      {progress && <div className="logo-progress" role="status">{progress}</div>}
      {error && <div className="logo-error" role="alert">{error}</div>}
      {snapshot && <div className="logo-undo" role="status">Workspace cleared. <button type="button" onClick={undoClear}>Undo with all edits</button> <button type="button" onClick={expireUndo} aria-label="Dismiss undo">Dismiss</button></div>}
      <div className="logo-body">
        <aside className="logo-settings" aria-label="Logo controls">
          <h2>Output size</h2>
          <div className="logo-presets" aria-label="Size presets">
            {LOGO_PRESETS.map(preset => <button
              key={preset.label} type="button"
              className={settings.width === preset.width && settings.height === preset.height ? 'selected' : ''}
              onClick={() => setSize(preset.width, preset.height)}
            >{preset.label}</button>)}
          </div>
          <div className="logo-two-fields">
            <label>Width (px)<input type="number" min="1" max="8192" value={draft.width} onChange={event => updateDimension('width', event.target.value)} /></label>
            <label>Height (px)<input type="number" min="1" max="8192" value={draft.height} onChange={event => updateDimension('height', event.target.value)} /></label>
          </div>
          <label>Download format
            <select value={settings.format} onChange={event => patchSettings({ format: event.target.value as 'png' | 'jpeg' })}>
              <option value="png">PNG</option><option value="jpeg">JPG</option>
            </select>
          </label>
          <p className="logo-subtle">Background: white</p>
          <h2>Text settings</h2>
          <label>Font
            <select value={settings.fontFamily} onChange={event => patchSettings({ fontFamily: event.target.value })}>
              {LOGO_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
          </label>
          <div className="logo-two-fields">
            <label>Font size (px)<input type="number" placeholder="Auto (28)" min="8" max="200" value={settings.fontSize} onChange={event => patchSettings({ fontSize: event.target.value })} /></label>
            <label>Font color<input type="color" value={settings.fontColor} onChange={event => patchSettings({ fontColor: event.target.value })} /></label>
          </div>
          <label className="logo-check"><input type="checkbox" checked={settings.bold} onChange={event => patchSettings({ bold: event.target.checked })} /> Bold</label>
          <label className="logo-check"><input type="checkbox" checked={settings.syncFilename} onChange={event => patchSettings({ syncFilename: event.target.checked })} /> Sync filename with label</label>
          <h2>Image positioning</h2>
          <label>Padding <span>{settings.padding}px</span>
            <input type="range" min="0" max="150" value={settings.padding} onChange={event => patchSettings({ padding: Number(event.target.value) })} />
          </label>
          <label>Vertical offset <span>{settings.imageOffset}</span>
            <input type="range" min="-50" max="50" value={settings.imageOffset} onChange={event => patchSettings({ imageOffset: Number(event.target.value) })} />
          </label>
        </aside>
        <main className="logo-gallery" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
          {!cards.length ? (
            <div className="logo-empty">
              <p>No logos uploaded</p>
              <button type="button" onClick={() => inputRef.current?.click()}>Choose files</button>
            </div>
          ) : (
            <div className="logo-grid">
              {cards.map(asset => (
                <article key={asset.id} className="logo-card">
                  <div className="logo-card-heading">
                    <input aria-label={`Filename for ${asset.source.name}`} value={asset.filename} onChange={event => patchCard(asset.id, { filename: sanitizeLogoFilename(event.target.value) })} placeholder="Untitled" />
                    <button type="button" title="Remove logo" aria-label={`Remove ${asset.source.name}`} onClick={() => removeAsset(asset)} disabled={busy}>×</button>
                  </div>
                  <button className="logo-preview-button" type="button" onClick={() => setFocused(asset.id)} aria-label={`Open Focus Mode for ${asset.source.name}`}>
                    <LogoPreview asset={asset} settings={settings} />
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
        {detail && <aside className="logo-detail" aria-label="Focus Mode">
          <div className="logo-detail-heading">
            <strong>Focus Mode</strong>
            <div className="logo-detail-buttons">
              <button type="button" aria-label="Previous logo" onClick={() => navigateFocus(-1)}>←</button>
              <button type="button" aria-label="Next logo" onClick={() => navigateFocus(1)}>→</button>
              <button type="button" aria-label="Close Focus Mode" onClick={() => setFocused(null)}>×</button>
            </div>
          </div>
          <p className="logo-subtle">{cards.findIndex(asset => asset.id === detail.id) + 1} of {cards.length}</p>
          <LogoPreview asset={detail} settings={settings} className="logo-detail-preview" />
          <label>Filename<input value={detail.filename} onChange={event => patchCard(detail.id, { filename: sanitizeLogoFilename(event.target.value) })} /></label>
          <label>Overlay label<textarea rows={3} value={detail.label} onChange={event => updateLabel(detail, event.target.value)} /></label>
          <label>Font size override<input type="number" min="1" placeholder="Use global setting" value={detail.fontSizeOverride ?? ''} onChange={event => patchCard(detail.id, { fontSizeOverride: event.target.value === '' ? null : Number(event.target.value) })} /></label>
          <label>Image padding {detail.paddingOverride ?? settings.padding}px <input type="range" min="0" max="150" value={detail.paddingOverride ?? settings.padding} onChange={event => patchCard(detail.id, { paddingOverride: Number(event.target.value) })} /></label>
          <button type="button" onClick={() => patchCard(detail.id, { paddingOverride: null })}>Reset padding to global</button>
          <label>Image Y offset {detail.imageOffset} <input type="range" min="-50" max="50" value={detail.imageOffset} onChange={event => patchCard(detail.id, { imageOffset: Number(event.target.value) })} /></label>
          <label>Text Y offset {detail.textOffset} <input type="range" min="0" max="100" value={detail.textOffset} onChange={event => patchCard(detail.id, { textOffset: Number(event.target.value) })} /></label>
          <div className="logo-detail-actions">
            <button className="logo-primary" type="button" disabled={busy} onClick={() => void exportOne(detail)}>Save image</button>
            <button type="button" disabled={busy} onClick={() => removeAsset(detail)}>Delete</button>
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
