import { useState } from 'react';
import { generateLinks, type LinkOutput, type StorageServer } from './engine';

const empty: LinkOutput = { exposure: '', storyboard: '', skipped: [] };

export function LinkGenerator() {
  const [server, setServer] = useState<StorageServer>('aldi');
  const [folder, setFolder] = useState('');
  const [filenames, setFilenames] = useState('');
  const [newMp4Mode, setNewMp4Mode] = useState(false);
  const [output, setOutput] = useState<LinkOutput>(empty);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'exposure' | 'storyboard' | null>(null);

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

  return (
    <section className="link-generator" aria-label="Link Generator">
      <div className="link-panel">
        <h2>Input</h2>
        <label>Server
          <select value={server} onChange={event => setServer(event.target.value as StorageServer)}>
            <option value="aldi">ALDI Blob</option><option value="s3">S3 Media</option>
          </select>
        </label>
        <label>Folder / Path
          <input value={folder} onChange={event => setFolder(event.target.value)} placeholder="Folder/Path" />
        </label>
        <label>Filenames
          <textarea value={filenames} onChange={event => setFilenames(event.target.value)} rows={10} placeholder="Paste filenames, one per line" />
        </label>
        <label className="checkline">
          <input type="checkbox" checked={newMp4Mode} onChange={event => setNewMp4Mode(event.target.checked)} />
          New MP4 link format
        </label>
        <button className="primary" type="button" onClick={generate}>Generate</button>
        {error && <p className="link-error" role="status">{error}</p>}
      </div>
      <div className="link-panel link-outputs">
        <h2>Output</h2>
        <div className="output-heading"><label htmlFor="link-exposure">Ad Exposure</label><button type="button" onClick={() => void copy('exposure')} disabled={!output.exposure}>{copied === 'exposure' ? 'Copied' : 'Copy'}</button></div>
        <textarea id="link-exposure" readOnly value={output.exposure} rows={8} placeholder="Generated URLs will appear here" />
        <div className="output-heading"><label htmlFor="link-storyboard">Storyboard Code</label><button type="button" onClick={() => void copy('storyboard')} disabled={!output.storyboard}>{copied === 'storyboard' ? 'Copied' : 'Copy'}</button></div>
        <textarea id="link-storyboard" readOnly value={output.storyboard} rows={8} placeholder="Generated HTML will appear here" />
      </div>
    </section>
  );
}
