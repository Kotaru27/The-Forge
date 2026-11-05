import * as XLSX from 'xlsx';

export type ExtensionHint = { ext: string; confidence: 'high' | 'inferred' | 'unknown' };
export type AdEntry = {
  id: string;
  no: string;
  url: string;
  type: string;
  displayName: string;
  ext: string;
  confidence: ExtensionHint['confidence'];
  selected: boolean;
  downloaded: boolean;
  requested: boolean;
  downloadVerified: boolean;
  inProgress: boolean;
  renamedFilename?: string;
};
export type Bucket = { bucket: string; ads: string[] };
export type AdWorkbook = { entries: AdEntry[]; buckets: Bucket[]; skipped: number; inferred: number };
export const MAX_ASSET_BYTES = 350 * 1024 * 1024;
export const MAX_BATCH = 250;

export function normalize(text: unknown): string {
  return String(text ?? '').replace(/\s+/g, '').replace(/_/g, '').toUpperCase();
}
export function safeName(text: unknown): string {
  return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss').replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 160) || 'asset';
}
export function safeUrl(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return '';
  try {
    const result = new URL(text);
    return /^https?:$/.test(result.protocol) ? result.href : '';
  } catch { return ''; }
}
export function detectColumns(rows: (XLSX.CellObject | null)[][]) {
  const names = {
    no: /^(ad\s*(no|num|number|#)|number|no|id|ad\s*id)$/i,
    link: /^(link|url|asset\s*(link|url)|download\s*(link|url)|media\s*(link|url)|hyperlink)$/i,
    type: /^(type|ad\s*type|format|media\s*type|category|creative\s*type)$/i,
  };
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const found: { no?: number; link?: number; type?: number } = {};
    rows[r].forEach((cell, c) => {
      const label = String(cell?.v ?? '').replace(/[_\s]+/g, ' ').trim();
      for (const [kind, re] of Object.entries(names)) {
        if (re.test(label)) found[kind as keyof typeof found] = c;
      }
    });
    if (found.no !== undefined && found.link !== undefined) {
      return { start: r + 1, no: found.no, link: found.link, type: found.type ?? 2, recognized: true };
    }
  }
  return { start: 1, no: 0, link: 1, type: 2, recognized: false };
}
export function extensionHint(url: string, label: string, type: string): ExtensionHint {
  const allowed = new Set(['mp4','mov','avi','mkv','webm','mp3','wav','ogg','m4a','jpg','jpeg','png','gif','webp','svg','bmp','pdf','zip']);
  for (const value of [label, (() => { try { return new URL(url).pathname; } catch { return ''; } })()]) {
    const match = String(value).match(/\.([a-z0-9]{2,5})(?:$|[?#])/i);
    if (match && allowed.has(match[1].toLowerCase())) return { ext: '.' + match[1].toLowerCase(), confidence: 'high' };
  }
  const t = String(type ?? '').toLowerCase().replace(/[_-]+/g, ' ');
  if (/\b(radio|podcast|audio|sound)\b/.test(t)) return { ext: '.mp3', confidence: 'inferred' };
  if (/\b(tvc|video|olv|cinema|film|reels|tv)\b/.test(t)) return { ext: '.mp4', confidence: 'inferred' };
  if (/\b(print|outdoor|ooh|image|photo|static|poster|banner|display)\b/.test(t)) return { ext: '.jpg', confidence: 'inferred' };
  return { ext: '', confidence: 'unknown' };
}

function extractRows(sheet: XLSX.WorkSheet): (XLSX.CellObject | null)[][] {
  if (!sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const rows: (XLSX.CellObject | null)[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: (XLSX.CellObject | null)[] = [];
    for (let c = 0; c <= range.e.c; c++) cells.push(sheet[XLSX.utils.encode_cell({ r, c })] || null);
    rows.push(cells);
  }
  return rows;
}
export function extractBucketData(book: XLSX.WorkBook, adTypeMap: Map<string, string>): Bucket[] {
  if (book.SheetNames.length < 2) return [];
  const sheet = book.Sheets[book.SheetNames[1]];
  if (!sheet?.['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const rows: Bucket[] = [];
  // Original second sheet: row 1 is headings, column A holds the bucket.
  for (let r = 1; r <= range.e.r; r++) {
    const bucketCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (bucketCell?.v == null) continue;
    const ads: string[] = [];
    for (let c = 1; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell?.v) continue;
      const ad = adTypeMap.get(normalize(cell.v));
      if (ad) ads.push(ad);
    }
    if (ads.length) rows.push({ bucket: String(bucketCell.v).trim(), ads });
  }
  return rows;
}
export function parseWorkbook(data: ArrayBuffer | Uint8Array): AdWorkbook {
  const book = XLSX.read(data, { type: 'array' });
  if (!book.SheetNames.length) throw Error('The workbook has no sheets.');
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet?.['!ref']) throw Error('The first sheet is empty.');
  const rows = extractRows(sheet);
  const columns = detectColumns(rows);
  const entries: AdEntry[] = [];
  const seen = new Set<string>();
  const adTypeMap = new Map<string, string>();
  let skipped = 0;
  let inferred = 0;
  for (let r = columns.start; r < rows.length; r++) {
    const line = rows[r];
    const no = String(line[columns.no]?.v ?? '').trim();
    const linkCell = line[columns.link];
    const type = String(line[columns.type]?.v ?? '').trim();
    const raw = String(linkCell?.l?.Target || linkCell?.v || '').trim();
    const url = safeUrl(raw);
    if (!no && !raw && !type) continue;
    if (!no || !url) { skipped++; continue; }
    const label = String(linkCell?.v || '').trim() || (() => {
      try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'asset'); }
      catch { return 'asset'; }
    })();
    const hint = extensionHint(url, label, type);
    if (hint.confidence === 'inferred') inferred++;
    const stem = label.replace(/\.(mp4|mov|avi|mkv|webm|mp3|wav|ogg|m4a|jpg|jpeg|png|gif|webp|svg|bmp|pdf|zip)$/i, '');
    const typeNumber = type.match(/\d+/)?.[0] || '';
    const typeBase = safeName(type.replace(/\d+/g, ''));
    let clean = safeName(stem);
    if (typeNumber && typeBase !== 'asset') clean = clean.replace(new RegExp(typeBase + '(?!\\d)', 'i'), typeBase + typeNumber);
    const base = `AD${safeName(no)}_${clean}`;
    let name = base;
    let counter = 2;
    while (seen.has(name.toLowerCase())) name = `${base}_${counter++}`;
    seen.add(name.toLowerCase());
    entries.push({
      id: `ad-${r}-${entries.length}`, no, url, type, displayName: name,
      ext: hint.ext, confidence: hint.confidence,
      selected: true, downloaded: false, requested: false, downloadVerified: false, inProgress: false,
    });
    adTypeMap.set(normalize(type), no);
  }
  return { entries, buckets: extractBucketData(book, adTypeMap), skipped, inferred };
}
export function copyBucketTable(rows: Bucket[]): string {
  return 'Bucket\tAds\n' + rows.map(r => r.bucket + '\t' + r.ads.map(a => `'${a}'`).join(',') + '\n').join('');
}
export function copyForstaScript(rows: Bucket[]): string {
  let script = 'var s = set()\n\n';
  for (const r of rows) {
    script += '// Bucket ' + r.bucket + '\n';
    script += "if (f('cq42000').any('" + r.bucket + "')) {\n";
    script += '    s = s.union(set(' + r.ads.map(a => `'${a}'`).join(',') + '))\n';
    script += '}\n\n';
  }
  return script;
}
