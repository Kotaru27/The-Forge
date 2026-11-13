import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { generateLinks, type LinkOutput, type StorageServer } from './engine';
import { importFolderNames, type FolderImportResult } from './folder-import';
import './link-generator-folder.css';

const empty: LinkOutput = { exposure: '', storyboard: '', skipped: [] };
const sampleNames = ['Ad_11.mp4', 'Ad_3.mp4', 'Ad_10.jpg', 'Ad_2.jpg', 'Ad_1.jpg'];
type ListMode = 'manual' | 'folder' | 'sample';

export function LinkGenerator() {
  const [server, setServer] = useState<StorageServer>('aldi');
  const [folder, setFolder] = useState('');
  const [filenames, setFilenames] = useState('');
  const [newMp4Mode, setNewMp4Mode] = useState(false);
  const [output, setOutput] = useState<LinkOutput>(empty);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'exposure' | 'storyboard' | null>(null);
  const [listMode, setListMode] = useState<ListMode>('manual');
  const [folderLabel, setFolderLabel] = useState('Select an ads folder');
  const [importResult, setImportResult] = useState<FolderImportResult | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const names = useMemo(() => filenames.split(/\r?\n/).map(name => name.trim()).filter(Boolean), [filenames]);

  function browseFolder() {
    const picker = pickerRef.current;
    if (!picker) return;
    // Set native directory mode without relying on nonstandard React JSX attributes.
    picker.setAttribute('webkitdirectory', '');
    picker.setAttribute('directory', '');
    picker.click();
  }

  function handleFolderChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = ''; // Reimporting the same directory must work.
    if (!files.length) return; // Cancel leaves the existing editable list untouched.
    const result = importFolderNames(files);
    setFilenames(result.names.join('\n'));
    setFolderLabel(result.folderName);
    setImportResult(result);
    setListMode('folder');
    setError('');
  }

  function loadSample() {
    const result = importFolderNames(sampleNames.map(name => ({ name, webkitRelativePath: 'Sample ads/' + name })));
    setFilenames(result.names.join('\n'));
    setFolderLabel('Sample ads folder');
    setImportResult(result);
    setListMode('sample');
    setError('');
  }

  function reset() {
    setServer('aldi');
    setFolder('');
    setFilenames('');
    setNewMp4Mode(false);
    setOutput(empty);
    setError('');
    setCopied(null);
    setListMode('manual');
    setFolderLabel('Select an ads folder');
    setImportResult(null);
  }

  function generate() {
    try {
      const result = generateLinks({ server, folder, filenames, newMp4Mode });
      setOutput(result);
      setError(result.skipped.length ? result.skipped.length + ' invalid or unsupported filename(s) were skipped.' : '');
    } catch (cause) {
      setOutput(empty);
      setError(cause instanceof Error ? cause.message : 'Generation failed');
    }
    setCopied(null);
  }

  async function copy(kind: 'exposure' | 'storyboard') {
    try {
      await navigator.clipboard.writeText(output[kind]);
      setCopied(kind);
    } catch {
      setError('Clipboard access was blocked. Select the output text to copy manually.');
    }
  }

  const importDescription = importResult
    ? importResult.names.length + ' supported filenames imported' +
        (importResult.skippedUnsupported ? ' · ' + importResult.skippedUnsupported + ' unsupported skipped' : '') +
        (importResult.skippedNested ? ' · ' + importResult.skippedNested + ' nested excluded' : '')
    : 'JPG, JPEG, PNG, MP4, MP3 · Top-level files only';

  return (
    <section className="link-generator link-generator-folder" aria-label="Link Generator">
      <section className="link-panel link-source-panel" aria-label="Link source inputs">
        <header className="link-panel-heading"><div><span>01 / INPUT</span><h2>Source &amp; filenames</h2></div><small>SELECT · REVIEW · GENERATE</small></header>
        <div className="link-panel-body">
          <div className="link-source-fields">
            <label>Server
              <select value={server} onChange={event => setServer(event.target.value as StorageServer)}>
                <option value="aldi">ALDI Blob</option><option value="s3">S3 Media</option>
              </select>
            </label>
            <label>Folder / Path
              <input value={folder} onChange={event => setFolder(event.target.value)} placeholder="e.g. Study01/Ads" spellCheck={false} />
            </label>
          </div>
          <p className="link-path-help">Remote URL path is independent of the folder selected on your computer.</p>
          <label className="checkline link-mp4-row">
            <span><strong>New MP4 link format</strong><small>Preserves the existing MP4 output option</small></span>
            <input type="checkbox" checked={newMp4Mode} onChange={event => setNewMp4Mode(event.target.checked)} />
          </label>

          <div className="link-subheading"><h3>Import ad names</h3><span>FOLDER PICKER</span></div>
          <div className={'link-import-box' + (importResult ? ' is-loaded' : '')}>
            <div className="link-folder-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5V6a2 2 0 0 1 2-2h5l2.1 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z"/><path d="M3 9h18"/></svg>
            </div>
            <div className="link-import-text"><strong title={folderLabel}>{folderLabel}</strong><span>Read filenames locally and sort in ascending order. Nothing is uploaded.</span></div>
            <button type="button" className="link-browse-button" onClick={browseFolder}>+ Browse folder</button>
          </div>
          <input ref={pickerRef} type="file" multiple aria-label="Choose ads folder" onChange={handleFolderChange} style={{ display: 'none' }} />
          <p className={'link-import-note' + (importResult ? ' is-loaded' : '')} role="status" aria-live="polite">{importDescription}</p>

          <div className="link-subheading link-filenames-heading">
            <h3>Filename list <span>/ editable</span></h3>
            <div><button type="button" className="link-text-button" onClick={loadSample}>Try sample</button><span aria-hidden="true"> / </span><button type="button" className="link-text-button" onClick={() => { setFilenames(''); setListMode('manual'); }}>Clear</button></div>
          </div>
          <label htmlFor="link-filenames">Filenames</label>
          <textarea id="link-filenames" value={filenames} onChange={event => { setFilenames(event.target.value); setListMode('manual'); }} rows={8} spellCheck={false} placeholder={'Choose a folder above or paste filenames manually.\n\nAd_1.jpg\nAd_2.mp4\nAd_10.png'} />
          <div className="link-filenames-foot"><span>{names.length} filename{names.length === 1 ? '' : 's'}</span><span>{listMode === 'manual' ? 'MANUAL ENTRY AVAILABLE' : 'SORTED · NATURAL A–Z'}</span></div>
          <div className="link-action-row"><button className="primary" type="button" onClick={generate} aria-label="Generate">Generate links <span aria-hidden="true">→</span></button><button className="link-reset-button" type="button" onClick={reset}>Reset</button></div>
          {error && <p className="link-error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="link-panel link-review-panel link-outputs" aria-label="Filename sequence and generated links">
        <header className="link-panel-heading"><div><span>02 / OUTPUT</span><h2>Review &amp; generate</h2></div><small>LINK PREVIEW</small></header>
        <div className="link-panel-body">
          <div className="link-subheading link-preview-heading"><h3>Filename order</h3><span>{listMode === 'manual' ? 'CURRENT LIST ORDER' : 'NATURAL A–Z'}</span></div>
          <div className="link-filename-preview" aria-label="Current filename sequence">
            {names.length === 0 ? <p className="link-preview-empty">Selected filenames will appear here in sequence.</p> : (
              <ol>{names.slice(0, 80).map((name, index) => <li key={index} style={{ animationDelay: String(Math.min(index, 12) * 18) + 'ms' }}><span className="link-preview-index">{String(index + 1).padStart(2, '0')}</span><span className="link-preview-name" title={name}>{name}</span><span className="link-preview-ext">{name.match(/\.([a-z0-9]+)$/i)?.[1]?.toUpperCase() || 'FILE'}</span></li>)}{names.length > 80 && <li className="link-preview-more">+{names.length - 80} more files in the editable list</li>}</ol>
            )}
          </div>
          <div className="link-outputs-header"><h3>Generated outputs</h3><span>{output.exposure || output.storyboard ? 'READY TO COPY' : 'AWAITING INPUT'}</span></div>
          <div className="link-output-block"><div className="output-heading"><label htmlFor="link-exposure">Ad Exposure</label><button type="button" onClick={() => void copy('exposure')} disabled={!output.exposure}>{copied === 'exposure' ? 'Copied' : 'Copy'}</button></div><textarea id="link-exposure" readOnly value={output.exposure} rows={8} placeholder="Generated URLs will appear here" /></div>
          <div className="link-output-block"><div className="output-heading"><label htmlFor="link-storyboard">Storyboard Code</label><button type="button" onClick={() => void copy('storyboard')} disabled={!output.storyboard}>{copied === 'storyboard' ? 'Copied' : 'Copy'}</button></div><textarea id="link-storyboard" readOnly value={output.storyboard} rows={8} placeholder="Generated HTML will appear here" /></div>
        </div>
      </section>
    </section>
  );
}
