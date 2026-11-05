import type { LogoServer } from './types.ts';
import { outputExtension, sanitizeLogoFilename, uniqueExportNames, type LogoFormat } from './types.ts';

export interface LogoLinkInput {
  brands: string[];
  filenames: string[];
  folder: string;
  server: LogoServer;
  format: LogoFormat;
}
export const LOGO_SERVERS: Record<LogoServer, string> = {
  s3: 'https://s3media-ml-eu.surveycenter.com/',
  aldi: 'https://aldimediaeu.blob.core.windows.net/aldimediaeu/',
};

export function normalizeBrand(value: string): string {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let index = 0; index <= a.length; index++) matrix[index][0] = index;
  for (let index = 0; index <= b.length; index++) matrix[0][index] = index;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1] ? matrix[i - 1][j - 1] :
        Math.min(matrix[i - 1][j - 1], matrix[i - 1][j], matrix[i][j - 1]) + 1;
    }
  }
  return matrix[a.length][b.length];
}

/** Same one-to-one greedy matching strategy, scoring and unmatched-brand fallback as CTK. */
export function matchLogoNames(brands: readonly string[], filenames: readonly string[]): (number | null)[] {
  const pairs: { brandIndex: number; logoIndex: number; score: number }[] = [];
  for (let i = 0; i < brands.length; i++) {
    for (let j = 0; j < filenames.length; j++) {
      const b = normalizeBrand(brands[i]);
      const l = normalizeBrand(filenames[j]);
      let score = 0;
      if (b === l) score = 1;
      else if (l.includes(b) || b.includes(l)) {
        const length = Math.max(l.length, b.length);
        score = length ? 0.8 + Math.min(l.length, b.length) / length * 0.1 : 0;
      } else {
        const length = Math.max(l.length, b.length);
        score = length ? 1 - levenshteinDistance(b, l) / length : 0;
      }
      pairs.push({ brandIndex: i, logoIndex: j, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const matched = Array<number | null>(brands.length).fill(null);
  const used = new Set<number>();
  for (const pair of pairs) {
    if (matched[pair.brandIndex] === null && !used.has(pair.logoIndex)) {
      matched[pair.brandIndex] = pair.logoIndex;
      used.add(pair.logoIndex);
    }
  }
  for (let i = 0; i < brands.length; i++) {
    if (matched[i] === null) {
      const available = filenames.findIndex((_, index) => !used.has(index));
      if (available !== -1) {
        matched[i] = available;
        used.add(available);
      }
    }
  }
  return matched;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Keeps the legacy HTML template and server URLs. Duplicates are resolved to actual ZIP filenames. */
export function generateLogoLinks(input: LogoLinkInput): string {
  const brands = input.brands.map(s => s.trim()).filter(Boolean);
  if (!brands.length) throw new Error('Please provide at least one brand name');
  const fileNames = uniqueExportNames(input.filenames.map(filename => ({ filename })), outputExtension(input.format));
  const mapping = matchLogoNames(brands, input.filenames);
  const folder = input.folder.trim().replace(/^\/+|\/+$/g, '');
  const folderPath = folder ? `${folder}/` : '';
  const baseUrl = LOGO_SERVERS[input.server];
  const ext = outputExtension(input.format);
  return brands.map((brand, index) => {
    const match = mapping[index];
    const name = match !== null ? fileNames[match] : `${sanitizeLogoFilename(brand.substring(0, 30).replace(/-/g, '_'))}.${ext}`;
    const url = `${baseUrl}${folderPath}${name}`;
    return `<center><img src="${escapeHtml(url)}" style="max-width:100%" align ="center"></center><span style="display:none;">${escapeHtml(brand)}</span>`;
  }).join('\n');
}
