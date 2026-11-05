// Typed port of CTK src/js/tools/link-gen.js. Keep outputs compatible.
export const STORAGE_ROOTS = {
  aldi: 'https://aldimediaeu.blob.core.windows.net/aldimediaeu/',
  s3: 'https://s3media-ml-eu.surveycenter.com/',
} as const;
export type StorageServer = keyof typeof STORAGE_ROOTS;
export type LinkInput = { server: StorageServer; folder: string; filenames: string; newMp4Mode: boolean };
export type LinkOutput = { exposure: string; storyboard: string; skipped: string[] };

export function normalizeFolder(value: string): string {
  return String(value || '').trim().replace(/\s+/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '') + '/';
}
export function encodeFolder(folder: string): string {
  const parts = String(folder).split('/').filter(Boolean);
  if (parts.some(part => part === '.' || part === '..' || /[\u0000-\u001f]/.test(part))) {
    throw new Error('Folder contains an invalid path segment');
  }
  return parts.map(encodeURIComponent).join('/') + (parts.length ? '/' : '');
}
function validateName(name: string): { cleaned: string; ext: string } | null {
  const cleaned = String(name).trim();
  if (!cleaned || /[\/\\\u0000-\u001f]/.test(cleaned) || cleaned === '.' || cleaned === '..') return null;
  const ext = cleaned.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (!ext || !['jpg', 'jpeg', 'png', 'mp4', 'mp3'].includes(ext)) return null;
  return { cleaned, ext };
}
function escapeHtmlAttribute(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
}
export function generateLinks(input: LinkInput): LinkOutput {
  const root = STORAGE_ROOTS[input.server];
  if (!root) throw new Error('Unknown storage server');
  const folder = encodeFolder(normalizeFolder(input.folder));
  const lines = input.filenames.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const exposure: string[] = [];
  const storyboard: string[] = [];
  const skipped: string[] = [];
  for (const line of lines) {
    const name = validateName(line);
    if (!name) { skipped.push(line); continue; }
    const url = root + folder + encodeURIComponent(name.cleaned);
    const safe = escapeHtmlAttribute(url);
    if (['jpg', 'jpeg', 'png'].includes(name.ext)) {
      exposure.push('<img src="' + safe + '" class="zoomImage" style="max-width:80%">');
      storyboard.push('<img src="' + safe + '" class="zoomImage" style="max-height:280px">');
    } else if (name.ext === 'mp4') {
      exposure.push(input.newMp4Mode ? url.replace(/^https:/, '').replace(/\.mp4$/i, '') : url);
      const poster = root + folder + encodeURIComponent(name.cleaned.replace(/\.mp4$/i, '.jpg'));
      storyboard.push('<img src="' + escapeHtmlAttribute(poster) + '" class="zoomImage" style="max-height:280px">');
    } else if (name.ext === 'mp3') {
      exposure.push(url);
      storyboard.push(name.cleaned);
    }
  }
  return { exposure: exposure.join('\n'), storyboard: storyboard.join('\n'), skipped };
}
