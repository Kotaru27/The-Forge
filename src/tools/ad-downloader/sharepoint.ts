/** Native SharePoint links: never fetch authenticated SharePoint media or read user cookies. */
export function isSharePoint(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && (url.hostname.endsWith('.sharepoint.com') || url.hostname.endsWith('.my.sharepoint.com'));
  } catch { return false; }
}
function decodePath(raw: string): string | null {
  if (!raw || raw.length > 8192) return null;
  let path: string;
  try { path = decodeURIComponent(raw); } catch { return null; }
  if (path.includes('\0') || path.includes('\\') || path.includes('?')) return null;
  if (!/^\/(?:sites|teams)\/[^/]+\/.+/i.test(path) ||
      path.split('/').some(x => x === '.' || x === '..') ||
      /\/_layouts\/|\/(?:_forms|forms)\//i.test(path) ||
      !/\.[a-z0-9]{2,8}$/i.test(path)) return null;
  return path;
}
export function directUrl(raw: string): string | null {
  if (!isSharePoint(raw)) return null;
  if (/(?:\/|%2f)(?:\.|%2e){2}(?:\/|%2f)/i.test(raw)) return null;
  const url = new URL(raw);
  let filePath = url.searchParams.get('id') || url.searchParams.get('SourceUrl');
  if (!filePath) {
    const link = url.pathname.match(/^\/:[a-z]:\/r(\/(?:sites|teams)\/.*)$/i);
    filePath = link ? link[1] : url.pathname;
  }
  const path = decodePath(filePath);
  if (!path) return null;
  const site = path.match(/^\/(sites|teams)\/([^/]+)\//i);
  if (!site) return null;
  const result = new URL(`/${site[1]}/${encodeURIComponent(site[2])}/_layouts/15/download.aspx`, url.origin);
  result.searchParams.set('SourceUrl', path);
  return result.href;
}
export function sourceFilename(raw: string): string | null {
  const direct = directUrl(raw);
  if (!direct) return null;
  const path = new URL(direct).searchParams.get('SourceUrl');
  const name = path?.split('/').pop();
  if (!name || !/\.(?:mp4|mov|m4v|avi|mkv|webm|mp3|m4a|wav|ogg|flac|jpg|jpeg|png|gif|webp|bmp|svg|pdf|zip)$/i.test(name)) return null;
  return name;
}
function parts(value: string) {
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  return { stem: value.slice(0, dot).replace(/ \(\d+\)$/, ''), ext: value.slice(dot).toLowerCase() };
}
function tokens(stem: string): Set<string> {
  const normalized = stem.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return new Set(normalized.filter(t => !/^ad\d+$/.test(t)));
}
export function matchesOriginal(actual: string, original: string): boolean {
  const a = parts(actual), o = parts(original);
  if (!a || !o || a.ext !== o.ext) return false;
  if (a.stem.toLowerCase() === o.stem.toLowerCase()) return true;
  const aa = tokens(a.stem), oo = tokens(o.stem);
  if (aa.size < 3 || oo.size < 3) return false;
  let common = 0;
  for (const token of aa) if (oo.has(token)) common++;
  return common >= 3 && common / aa.size >= .78 && common / oo.size >= .78;
}
export function targetFilename(displayName: string, original: string): string {
  const suffix = original.slice(original.lastIndexOf('.')).toLowerCase();
  const stem = String(displayName || 'AD').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 160);
  return stem + suffix;
}
export function originalKey(filename: string): string {
  const part = parts(filename);
  return part ? part.ext + '|' + part.stem.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '') : '';
}
export function matchStrength(actual: string, original: string): number {
  if (!matchesOriginal(actual, original)) return 0;
  const a = parts(actual), b = parts(original);
  if (!a || !b) return 0;
  if (a.stem.toLowerCase() === b.stem.toLowerCase()) return 3;
  if (originalKey(actual) === originalKey(original)) return 2;
  return 1;
}
