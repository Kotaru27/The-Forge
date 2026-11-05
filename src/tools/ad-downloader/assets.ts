import JSZip from 'jszip';
import type { AdEntry, ExtensionHint } from './engine';
import { MAX_ASSET_BYTES, MAX_BATCH } from './engine';
import { isSharePoint } from './sharepoint';

const mimeToExt: Record<string, string> = {
  'video/mp4':'mp4', 'video/webm':'webm', 'video/quicktime':'mov', 'audio/mpeg':'mp3',
  'audio/mp4':'m4a', 'audio/wav':'wav', 'image/jpeg':'jpg', 'image/png':'png',
  'image/webp':'webp', 'image/gif':'gif', 'image/svg+xml':'svg', 'application/pdf':'pdf', 'application/zip':'zip',
};
export function guessType(blob: Blob, hint: ExtensionHint, signature: Uint8Array): string {
  const mime = String(blob.type || '').split(';')[0].toLowerCase();
  const sniff = new TextDecoder().decode(signature.slice(0, 200)).trimStart().toLowerCase();
  if (/^(?:<!doctype html|<html\b|\{\s*"(?:error|code)"\s*:)/.test(sniff) || mime === 'text/html' || mime === 'application/json')
    throw Error('The source returned a web page (HTML preview/login) instead of the media file.');
  const ascii = (a: number, b: number) => String.fromCharCode(...Array.from(signature.slice(a,b)));
  if (ascii(0,4) === '%PDF') return '.pdf';
  if (signature[0] === 0x89 && ascii(1,4) === 'PNG') return '.png';
  if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) return '.jpg';
  if (ascii(0,3) === 'GIF') return '.gif';
  if (ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP') return '.webp';
  if (ascii(0,4) === 'RIFF' && ascii(8,12) === 'WAVE') return '.wav';
  if (ascii(4,8) === 'ftyp') return '.mp4';
  if (ascii(0,3) === 'ID3') return '.mp3';
  if (signature[0] === 0x50 && signature[1] === 0x4b && signature[2] === 0x03 && signature[3] === 0x04) return '.zip';
  if (mimeToExt[mime]) return '.' + mimeToExt[mime];
  if (hint.confidence === 'high') return hint.ext;
  if (hint.confidence === 'inferred' && ((mime.startsWith('audio/') && hint.ext === '.mp3') ||
      (mime.startsWith('video/') && hint.ext === '.mp4') ||
      (mime.startsWith('image/') && hint.ext === '.jpg'))) return hint.ext;
  return '.bin';
}
export async function getAsset(entry: AdEntry, signal?: AbortSignal): Promise<{blob: Blob; name: string}> {
  if (isSharePoint(entry.url)) throw Error('Protected SharePoint files cannot be read into a browser ZIP. Use the native Download button.');
  const response = await fetch(entry.url, {mode:'cors',credentials:'omit',redirect:'follow',signal});
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  const size = Number(response.headers.get('content-length')) || 0;
  if (size > MAX_ASSET_BYTES) throw Error('File exceeds 350 MB browser memory safety limit');
  let blob: Blob;
  if (response.body?.getReader) {
    const reader = response.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_ASSET_BYTES) { await reader.cancel(); throw Error('File exceeds 350 MB browser memory safety limit'); }
        chunks.push(new Uint8Array(value));
      }
    } finally { reader.releaseLock(); }
    blob = new Blob(chunks, {type: response.headers.get('content-type') || 'application/octet-stream'});
  } else blob = await response.blob();
  if (!blob.size) throw Error('Empty download');
  if (blob.size > MAX_ASSET_BYTES) throw Error('File exceeds 350 MB browser memory safety limit');
  const ext = guessType(blob, entry, new Uint8Array(await blob.slice(0,256).arrayBuffer()));
  return { blob, name: entry.displayName + ext };
}
export type BatchResult = {blob: Blob | null; successes: AdEntry[]; failures: {name:string;reason:string}[]};
export async function fetchZip(selection: AdEntry[], onProgress: (done:number, success:number, failed:number)=>void): Promise<BatchResult> {
  if (!selection.length) throw Error('No files selected.');
  if (selection.length > MAX_BATCH) throw Error('Select at most 250 files per batch.');
  if (selection.some(entry => isSharePoint(entry.url)))
    throw Error('SharePoint cannot be added to a browser ZIP. Download those files individually.');
  const zip = new JSZip(), successes: AdEntry[] = [], failures: BatchResult['failures'] = [];
  let index = 0, totalBytes = 0, stopped = false;
  async function worker() {
    while (!stopped && index < selection.length) {
      const entry = selection[index++];
      try {
        const {blob,name} = await getAsset(entry);
        totalBytes += blob.size;
        if (totalBytes > MAX_ASSET_BYTES) { stopped = true; throw Error('ZIP exceeds 350 MB safety limit'); }
        zip.file(name,blob);
        successes.push(entry);
      } catch(error) {failures.push({name:entry.displayName,reason:error instanceof Error ? error.message : String(error)});}
      onProgress(successes.length+failures.length, successes.length, failures.length);
    }
  }
  await Promise.all(Array.from({length:Math.min(3,selection.length)}, () => worker()));
  return {blob: successes.length ? await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:2}}) : null,successes,failures};
}
