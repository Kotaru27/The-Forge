import type { AdEntry } from './engine.ts';
import { matchStrength, matchesOriginal, originalKey, sourceFilename, targetFilename } from './sharepoint.ts';

// File System Access API is only available in supported secure Chromium browsers.
interface FileHandle {
  kind: 'file';
  getFile(): Promise<File>;
  move?(name: string): Promise<void>;
}
interface DirectoryHandle {
  kind: 'directory'; name: string;
  entries(): AsyncIterable<[string, {kind: string}]>;
  getFileHandle(name: string, options?: {create?: boolean}): Promise<FileHandle & {createWritable():Promise<FileSystemWritableFileStream>}>;
  removeEntry(name: string): Promise<void>;
  queryPermission?(options: {mode: 'readwrite'}): Promise<PermissionState>;
}
export type AutoStatus = (message: string, isError?: boolean) => void;
type Job = {
  entry: AdEntry; original: string; started: number;
  readings: Map<string,{size:number; modified:number; seen:number}>;
  status: AutoStatus; complete: (name:string)=>void;
};
export type ExistingMatch = {name: string; size: number; lastModified: number};
const MAX_PENDING = 60;
const TIMEOUT_MS = 10 * 60 * 1000;
export class AutoNamer {
  private directory: DirectoryHandle | null = null;
  private known = new Set<string>();
  private pending = new Map<AdEntry, Job>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private scanning = false;
  private renamedCount = 0;
  private failedCount = 0;

  get active() { return !!this.directory; }
  get folderName() { return this.directory?.name || ''; }
  stats() { return { waiting: this.pending.size, renamed: this.renamedCount, failed: this.failedCount }; }
  dispose() { this.stopTimer(); this.pending.clear(); }
  private stopTimer() { if (this.ticker !== null) { clearInterval(this.ticker); this.ticker = null; } }
  private async currentNames(folder: DirectoryHandle | null = this.directory) {
    if (!folder) return new Set<string>();
    const names = new Set<string>();
    for await (const [name,handle] of folder.entries()) if (handle.kind === 'file') names.add(name);
    return names;
  }
  async permissionGranted() {
    if (!this.directory) return false;
    try { return !this.directory.queryPermission || await this.directory.queryPermission({mode:'readwrite'}) === 'granted'; }
    catch { return false; }
  }
  async chooseFolder(): Promise<string> {
    if (this.pending.size) throw Error('Wait for active renames to finish before changing the tracked folder.');
    const picker = (window as Window & {showDirectoryPicker?: (options: {id:string;mode:string;startIn:string})=>Promise<DirectoryHandle>}).showDirectoryPicker;
    if (!picker || !window.isSecureContext) throw Error('Automatic naming requires a Chromium browser on HTTPS (GitHub Pages).');
    const selected = await picker({id:'ctk-download-rename',mode:'readwrite',startIn:'downloads'});
    if (!selected || selected.kind !== 'directory') throw Error('No folder selected.');
    if (selected.queryPermission && await selected.queryPermission({mode:'readwrite'}) !== 'granted')
      throw Error('Read and write permission was not granted for the chosen folder.');
    const names = await this.currentNames(selected);
    this.directory = selected;
    this.known = names;
    this.pending.clear();
    this.renamedCount = 0;
    this.failedCount = 0;
    this.stopTimer();
    return selected.name;
  }
  begin(entry: AdEntry, status: AutoStatus, complete: (name:string)=>void): boolean {
    if (!this.directory) return false;
    const original = sourceFilename(entry.url);
    if (!original) { status('Unable to identify original SharePoint media filename for automatic renaming.',true); return false; }
    if (this.pending.has(entry)) { status('This ad is already being tracked. Wait until its download is renamed.',true); return false; }
    if (this.pending.size >= MAX_PENDING) { status('Auto-name is tracking 60 downloads. Wait for a few to finish.',true); return false; }
    if ([...this.pending.values()].some(job => originalKey(job.original) === originalKey(original))) {
      status('Another pending ad has the same source filename. Download these sequentially.',true); return false;
    }
    this.pending.set(entry, {entry, original,started:Date.now(),readings:new Map(),status,complete});
    if (!this.ticker) this.ticker=setInterval(()=>{void this.scanOnce().catch(error=>{
      for (const [e,job] of [...this.pending]) {
        this.cancel(e);this.failedCount++;
        job.status('Auto-name cannot read the selected folder: '+String(error),true);
      }
    });},1250);
    status(`Tracking ${entry.displayName} in ${this.directory.name}…`);
    return true;
  }
  cancel(entry: AdEntry) { this.pending.delete(entry); if (!this.pending.size) this.stopTimer(); }
  private async exists(name: string) {
    if (!this.directory) return false;
    try { await this.directory.getFileHandle(name);return true; }
    catch (error) { if ((error as Error).name === 'NotFoundError') return false;throw error; }
  }
  private async renameConfirmed(handle: FileHandle, original: string, target: string): Promise<void> {
    if (!this.directory) throw Error('No folder selected.');
    if (await this.exists(target)) throw Error('Destination '+target+' already exists. Kept original unchanged.');
    if (handle.move) {
      try { await handle.move(target); return; }
      catch(error) { if (!['NotSupportedError','InvalidStateError','SecurityError','NotAllowedError','TypeError'].includes((error as Error).name)) throw error; }
    }
    const source = await handle.getFile();
    const dest = await this.directory.getFileHandle(target,{create:true});
    let writer: FileSystemWritableFileStream | undefined;
    try {
      writer = await dest.createWritable();
      await source.stream().pipeTo(writer);
      writer = undefined;
      const written = await dest.getFile();
      if (written.size !== source.size) throw Error('Incomplete file copy. Original was preserved.');
      // Verify each byte, not merely file size or first/last bytes, before removing source.
      for (let start=0;start<source.size;start+=1024*1024) {
        const end=Math.min(source.size,start+1024*1024);
        const a=new Uint8Array(await source.slice(start,end).arrayBuffer());
        const b=new Uint8Array(await written.slice(start,end).arrayBuffer());
        if (a.length!==b.length || a.some((byte,index)=>byte!==b[index])) throw Error('File copy verification failed. Original was preserved.');
      }
      await this.directory.removeEntry(original);
    } catch(error) {
      try { await writer?.abort(); }catch{/* keep original */}
      try { await this.directory.removeEntry(target); }catch{/* keep original */}
      throw error;
    }
  }
  async scanOnce() {
    if (!this.directory || this.scanning || !this.pending.size) return;
    this.scanning = true;
    try {
      const names=await this.currentNames();
      for (const [entry,job] of [...this.pending]) {
        if (Date.now()-job.started > TIMEOUT_MS) {
          this.cancel(entry);this.failedCount++;
          job.status(`Auto-name timed out for ${entry.displayName}. Check the selected download folder; the original file was untouched.`,true);
        }
      }
      if (!this.pending.size) return;
      const claims = new Map<AdEntry, string[]>();
      for (const actual of names) {
        if (this.known.has(actual) || /\.crdownload$/i.test(actual)) continue;
        let best=0,winners: AdEntry[]=[];
        for (const [entry,job] of this.pending) {
          const strength=matchStrength(actual,job.original);
          if (strength>best) {best=strength;winners=[entry];}
          else if (strength && strength===best) winners.push(entry);
        }
        if (winners.length!==1) continue;
        const winner=winners[0];
        claims.set(winner,[...(claims.get(winner)||[]),actual]);
      }
      for (const [entry,job] of [...this.pending]) {
        const candidates=claims.get(entry)||[];
        if (candidates.length!==1) continue;
        const actual=candidates[0],handle=await this.directory.getFileHandle(actual);
        const file=await handle.getFile();
        if (!file.size || file.lastModified<job.started-3000) continue;
        const previous=job.readings.get(actual);
        job.readings.set(actual,{size:file.size,modified:file.lastModified,seen:previous?.size===file.size && previous.modified===file.lastModified ? previous.seen+1 : 1});
        const state=job.readings.get(actual)!;
        if (state.seen<3 || Date.now()-file.lastModified<2500 || names.has(actual+'.crdownload')) continue;
        const target=targetFilename(entry.displayName,job.original);
        if (target.toLowerCase()===actual.toLowerCase()) {
          this.cancel(entry);this.known.add(actual);this.renamedCount++;
          entry.renamedFilename=target;job.complete(target);
          job.status('Downloaded with the correct filename: '+target);
          continue;
        }
        try {
          await this.renameConfirmed(handle,actual,target);
          this.known.add(target);this.known.add(actual);
          entry.renamedFilename=target;this.cancel(entry);this.renamedCount++;
          job.complete(target);job.status('Saved as '+target);
        } catch(error) {
          this.cancel(entry);this.failedCount++;this.known.add(actual);
          job.status('Auto-name failed for '+entry.displayName+': '+(error as Error).message,true);
        }
      }
    } finally {this.scanning=false;}
  }
  async findExisting(entry: AdEntry): Promise<ExistingMatch[]> {
    if (!this.directory) throw Error('Choose the folder containing the downloaded file first.');
    const original=sourceFilename(entry.url);
    if (!original) throw Error('SharePoint URL does not identify a supported media filename.');
    const names=await this.currentNames(),candidates: ExistingMatch[]=[];
    for (const name of names) {
      if (!matchesOriginal(name,original) || names.has(name+'.crdownload')) continue;
      const file=await (await this.directory.getFileHandle(name)).getFile();
      if (file.size) candidates.push({name,size:file.size,lastModified:file.lastModified});
    }
    candidates.sort((a,b)=>b.lastModified-a.lastModified || a.name.localeCompare(b.name));
    return candidates;
  }
  async renameExisting(entry: AdEntry, actual: string): Promise<string> {
    if (!this.directory) throw Error('No folder selected.');
    if (this.scanning) throw Error('Automatic rename is in progress. Try again once it finishes.');
    const original=sourceFilename(entry.url);
    if (!original || !matchesOriginal(actual,original)) throw Error('Selected name does not match this SharePoint media file.');
    const names=await this.currentNames();
    if (!names.has(actual)) throw Error('Selected download was not found in this folder.');
    if (names.has(actual+'.crdownload')) throw Error('The browser has not finished downloading this file.');
    const handle=await this.directory.getFileHandle(actual),file=await handle.getFile();
    if (!file.size || Date.now()-file.lastModified<2500) throw Error('Download is still recent or incomplete. Wait for Chrome to finish.');
    const target=targetFilename(entry.displayName,original);
    if (target.toLowerCase()!==actual.toLowerCase()) await this.renameConfirmed(handle,actual,target);
    this.cancel(entry);this.known.add(actual);this.known.add(target);entry.renamedFilename=target;
    return target;
  }
}
