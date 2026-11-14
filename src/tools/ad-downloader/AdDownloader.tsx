import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type ChangeEvent, type DragEvent } from 'react';
import { downloadBlob } from '../../utils/download';
import { AutoNamer } from './auto-name';
import { fetchZip, getAsset } from './assets';
import {
  copyBucketTable, copyForstaScript, parseWorkbook, MAX_BATCH,
  type AdEntry, type Bucket,
} from './engine';
import { directUrl, isSharePoint, matchesOriginal, sourceFilename, targetFilename } from './sharepoint';
import './ad-downloader.css';

type Stage = 'ready' | 'requested' | 'prepared';
const showError = (error: unknown) => error instanceof Error ? error.message : String(error);
const ACCEPT_MEDIA = /\.(mp4|mov|m4v|avi|mkv|webm|mp3|m4a|wav|ogg|flac|jpg|jpeg|png|gif|webp|bmp|svg|pdf|zip)$/i;
function stage(entry: AdEntry): Stage {
  return entry.downloaded ? 'prepared' : entry.requested ? 'requested' : 'ready';
}
async function copyText(value: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(value);return; } catch {/* legacy fallback */}
  }
  const input=document.createElement('textarea');
  input.value=value;input.style.position='fixed';input.style.top='-9999px';input.style.left='-9999px';
  document.body.append(input);input.focus();input.select();
  try { if (!document.execCommand('copy')) throw Error('Copy to clipboard was blocked.'); }
  finally { input.remove(); }
}
function nativeSharePointDownload(url: string) {
  // Only open a first-party SharePoint page in a separate tab; never fetch its protected bytes.
  const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  document.body.append(a);
  try {a.click();}finally{a.remove();}
}

export function AdDownloader() {
  const [folderName,setFolderName]=useState('');
  const [folderApproved,setFolderApproved]=useState(false);
  const [entries,setEntries]=useState<AdEntry[]>([]);
  const [buckets,setBuckets]=useState<Bucket[]>([]);
  const [busy,setBusy]=useState(false);
  const [importing,setImporting]=useState(false);
  const [status,setStatus]=useState<{message:string;error:boolean}>({message:'Choose the Auto-name folder to enable Excel import.',error:false});
  const fileInput=useRef<HTMLInputElement>(null);
  const renamer=useRef(new AutoNamer());
  const mounted=useRef(true);
  const entriesRef=useRef(entries);
  const busyRef=useRef(false);
  useEffect(()=>{entriesRef.current=entries;},[entries]);
  useEffect(()=>()=>{mounted.current=false;renamer.current.dispose();},[]);
  const report=useCallback((message:string,error=false)=>setStatus({message,error}),[]);
  const changeEntry=useCallback((id:string, changes:Partial<AdEntry>)=>{
    setEntries(current=>current.map(e=>e.id===id?{...e,...changes}:e));
  },[]);
  const chosen=useMemo(()=>entries.filter(e=>e.selected && !e.downloaded && !e.requested),[entries]);
  // Match CTK's visual queue: new ads first, requested next, prepared/verified last.
  // Sorting a copy preserves original spreadsheet order within each queue.
  const queued=useMemo(()=>[...entries].sort((a,b)=>
    ({ready:0,requested:1,prepared:2})[stage(a)] - ({ready:0,requested:1,prepared:2})[stage(b)]),[entries]);
  async function chooseFolder() {
    try {
      const folder=await renamer.current.chooseFolder();
      setFolderName(folder);setFolderApproved(true);
      report(`Folder ready: ${folder}. Upload Excel to continue.`);
    } catch(error) {
      if ((error as Error).name==='AbortError') {report(folderApproved?'Current folder remains selected.':'Choose an Auto-name folder before importing Excel.');return;}
      report('Choose a writable folder to enable Excel import. '+showError(error),true);
    }
  }
  async function upload(file?:File) {
    if (!file) return;
    if (!folderApproved || !renamer.current.active || !await renamer.current.permissionGranted()) {
      setFolderApproved(false); report('Auto-name folder access is required before importing Excel. Choose the folder again.',true);return;
    }
    if (!/\.(xlsx|xls)$/i.test(file.name)) {report('Select an Excel workbook (.xlsx or .xls).',true);return;}
    setImporting(true);
    report('Reading '+file.name+'…');
    try {
      const book=parseWorkbook(await file.arrayBuffer());
      setEntries(book.entries);setBuckets(book.buckets);
      report(`${book.entries.length} ready · ${book.skipped} invalid rows skipped · ${book.inferred} extensions inferred.`+
        (book.entries.some(entry=>isSharePoint(entry.url))?' SharePoint uses native downloads with folder-based naming.':''));
    } catch(error) {report('Spreadsheet could not be parsed: '+showError(error),true);}
    finally {setImporting(false);if(fileInput.current)fileInput.current.value='';}
  }
  function onDrop(event:DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!folderApproved) {report('Choose an Auto-name folder before importing Excel.',true);return;}
    void upload(event.dataTransfer.files[0]);
  }
  function setSelected(value:boolean) {
    setEntries(old=>old.map(e=>e.downloaded||e.requested?e:{...e,selected:value}));
  }
  async function copy(value:string,label:string) {
    try {await copyText(value);report(label+' copied.');}
    catch(error) {report(showError(error),true);}
  }
  const markRequested=useCallback((entry:AdEntry)=>changeEntry(entry.id,{requested:true,inProgress:false}),[changeEntry]);
  const markPrepared=useCallback((entry:AdEntry,verified=false)=>
    changeEntry(entry.id,{downloaded:true,requested:false,downloadVerified:verified || entry.downloadVerified,inProgress:false}),[changeEntry]);
  function downloadSharePoint(entry:AdEntry) {
    const target=directUrl(entry.url);
    if (!target) {report('This SharePoint link does not identify a downloadable media file.',true);return;}
    const tool=renamer.current;
    // Begin tracking synchronously from the user's click. Do not open an untracked
    // download if the source name is ambiguous while the chosen folder is active.
    const tracking=tool.active && tool.begin(entry,
      (message,error=false)=>report(message+' · '+tool.stats().renamed+' named · '+tool.stats().waiting+' waiting · '+tool.stats().failed+' failed',error),
      ()=>markPrepared(entry,true));
    if (tool.active && !tracking) return;
    try { nativeSharePointDownload(target);markRequested(entry);report(tracking?`Auto-name tracking · ${entry.displayName}`:'SharePoint native download requested. Check your browser downloads.'); }
    catch(error) {if(tracking)tool.cancel(entry);report('SharePoint download could not be opened: '+showError(error),true);}
  }
  async function downloadOne(entry:AdEntry) {
    if (entry.inProgress || busyRef.current) return;
    if (isSharePoint(entry.url)) {downloadSharePoint(entry);return;}
    changeEntry(entry.id,{inProgress:true});
    report('Preparing '+entry.displayName+'…');
    try {
      const {blob,name}=await getAsset(entry);
      downloadBlob(blob,name);
      markPrepared(entry);
      report(`Download requested: ${name} (${(blob.size/1048576).toFixed(1)} MB).`);
    } catch(error) {
      const message=showError(error);
      report(`${entry.displayName}: `+(/Failed to fetch|CORS|NetworkError/i.test(message)?'The host blocks cross-origin media access. The provider must allow CORS for custom naming.':message),true);
    } finally {changeEntry(entry.id,{inProgress:false});}
  }
  async function downloadBulk() {
    if (busyRef.current || !chosen.length) return;
    if (chosen.length>MAX_BATCH){report('Select at most 250 files per batch.',true);return;}
    if (chosen.some(e=>isSharePoint(e.url))) {
      report('SharePoint cannot be added to a browser ZIP. Download SharePoint files individually; deselect them to ZIP other files.',true);return;
    }
    busyRef.current=true;setBusy(true);
    try {
      const result=await fetchZip(chosen,(done,success,failed)=>report(`${done}/${chosen.length} checked · ${success} ready · ${failed} failed`));
      if (!result.blob) {report(`No ZIP assets accessible (${result.failures.length} blocked or invalid links).`,true);return;}
      downloadBlob(result.blob,'ad_assets.zip');
      for (const entry of result.successes) markPrepared(entry);
      const first=result.failures.slice(0,3).map(e=>e.name+': '+e.reason).join('; ');
      report(`ZIP download requested for ${result.successes.length} files; ${result.failures.length} failed.${first?' '+first:''}`,!!result.failures.length);
    } catch(error) {report('ZIP failed: '+showError(error),true);}
    finally{busyRef.current=false;setBusy(false);}
  }
  async function fixName(entry:AdEntry) {
    try {
      if (!renamer.current.active) {
        const name=await renamer.current.chooseFolder();setFolderName(name);setFolderApproved(true);
      }
      const matches=await renamer.current.findExisting(entry);
      if (!matches.length) throw Error('No matching finished file in the selected folder. Choose the actual download folder, or Save named copy instead.');
      let actual=matches[0].name;
      if(matches.length>1) {
        const answer=window.prompt('Multiple downloaded copies match this row. Enter the number of the correct file:\n'+matches.map((m,i)=>`${i+1}. ${m.name}`).join('\n'),'1');
        if(answer===null)return;
        const index=Number(answer);
        if(!Number.isInteger(index)||index<1||index>matches.length)throw Error('No valid file selected. Nothing changed.');
        actual=matches[index-1].name;
      }
      const target=await renamer.current.renameExisting(entry,actual);
      markPrepared(entry,true);
      report(`Renamed existing file in place: ${actual} → ${target}. There is no extra copy.`);
    } catch(error) {if ((error as Error).name!=='AbortError') report('Could not rename existing download: '+showError(error),true);}
  }
  function saveNamedCopy(entry:AdEntry) {
    const input=document.createElement('input');input.type='file';input.accept='video/*,audio/*,image/*,.pdf,.zip,.svg,.mkv,.avi,.mov,.webm,.flac,.m4a';input.style.display='none';
    input.oncancel=()=>input.remove();
    input.onchange=()=>{
      input.remove();const file=input.files?.[0];if(!file)return;
      if(!file.size || !ACCEPT_MEDIA.test(file.name) || /^text\/html\b/i.test(file.type)) {
        report('Select the finished media file, not a SharePoint preview or unfinished download.',true);return;
      }
      const expected=sourceFilename(entry.url);
      if(expected && !matchesOriginal(file.name,expected) && !window.confirm('The selected filename differs from the SharePoint source. Save a renamed copy anyway?')) return;
      const name=targetFilename(entry.displayName,file.name);
      downloadBlob(file,name);
      report(`Requested an additional named copy: ${name}. The original is still present.`);
    };
    document.body.append(input);input.click();
  }
  function downloadRow(entry:AdEntry) {
    void downloadOne(entry);
  }
  function onInput(event:ChangeEvent<HTMLInputElement>) {void upload(event.target.files?.[0]);}
  return <section className="adw-workspace" aria-label="Ad Downloader">
    <header className="adw-header">
      <div><h2>Ad Downloader</h2><p>Choose your download folder, import an Excel workbook, then manage campaign assets.</p></div>
      <div className="adw-controls">
        <button type="button" onClick={()=>void chooseFolder()} aria-label="Choose Auto-name folder">Auto-name: {folderName||'Choose folder'}</button>
        <label className={`adw-upload${!folderApproved?' adw-locked':''}`} aria-disabled={!folderApproved}>
          <input ref={fileInput} type="file" accept=".xlsx,.xls" disabled={!folderApproved || importing} aria-label="Upload Excel workbook" onChange={onInput}/>
          {importing?'Importing…':'Upload Excel'}
        </label>
        <button type="button" disabled={!entries.length} onClick={()=>void copy(entries.map(e=>e.displayName).join('\n'),'All names')}>Copy Names</button>
        <button type="button" disabled={!buckets.length} onClick={()=>void copy(copyBucketTable(buckets),'Bucket table')}>Copy Bucket Table</button>
        <button type="button" disabled={!buckets.length} onClick={()=>void copy(copyForstaScript(buckets),'Forsta script')}>Copy Script</button>
        <button type="button" className="adw-primary" disabled={!chosen.length||busy} onClick={()=>void downloadBulk()}>Download selected ({chosen.length})</button>
      </div>
    </header>
    <div className="adw-status" role={status.error?'alert':'status'} data-error={status.error}>{status.message}</div>
    {!entries.length ?
      <div className="adw-empty" onDragOver={e=>e.preventDefault()} onDrop={onDrop} aria-label="Excel drop zone">
        <strong>Waiting for a workbook</strong><span>{folderApproved?'Drop an .xlsx or .xls file here, or select Upload Excel.':'Choose a writable Auto-name folder to unlock Excel import.'}</span>
      </div> : <>
      <div className="adw-filters adw-selection-tools" role="group" aria-label="Ready asset selection">
        <button type="button" onClick={()=>setSelected(true)}>Select ready</button>
        <button type="button" onClick={()=>setSelected(false)}>Deselect ready</button>
      </div>
      <div className="adw-table-wrap" onDragOver={e=>e.preventDefault()} onDrop={onDrop}>
        <table className="adw-table"><thead><tr><th>Ad No</th><th>Generated Name</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{queued.map((entry,index)=><Fragment key={entry.id}>
            {stage(entry)!=='ready' && (index===0||stage(queued[index-1])!==stage(entry)) &&
              <tr className="adw-queue-divider"><td colSpan={4}>{stage(entry)==='requested'
                ? 'Download requested · check browser downloads'
                : 'Prepared or verified downloads'}</td></tr>}
            <tr data-stage={stage(entry)}>
            <td><label><input type="checkbox" aria-label={'Include '+entry.displayName+' in ZIP'} checked={entry.selected} onChange={e=>changeEntry(entry.id,{selected:e.target.checked})}/>{entry.no}</label></td>
            <td className="adw-name" title={entry.confidence==='inferred'?'Extension inferred from media category':entry.confidence==='unknown'?'File extension detected from response':entry.url}>{entry.displayName}{entry.ext||''}</td>
            <td><span className="adw-stage">{entry.downloadVerified?'Verified in folder':entry.downloaded?'Prepared / requested':entry.requested?'Download requested':'Ready'}</span></td>
            <td><div className="adw-row-actions">
              <button type="button" disabled={entry.inProgress} onClick={()=>downloadRow(entry)}>{entry.inProgress?'Preparing…':entry.downloaded||entry.requested?'Download again':'Download'}</button>
              <button type="button" onClick={()=>void copy(entry.displayName,entry.displayName)}>Copy</button>
              {isSharePoint(entry.url) && <details><summary>More</summary><div className="adw-more">
                <button type="button" onClick={()=>void fixName(entry)}>Fix downloaded name</button>
                {entry.requested||entry.downloaded?<button type="button" onClick={()=>saveNamedCopy(entry)}>Save named copy</button>:null}
              </div></details>}
            </div></td>
          </tr></Fragment>)}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
