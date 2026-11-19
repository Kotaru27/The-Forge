import type { LogoServer } from './types.ts';
import { outputExtension, sanitizeLogoFilename, uniqueExportNames, type LogoFormat } from './types.ts';

export interface LogoLinkInput {
  brands: string[];
  altNames?: string[];
  includeEnlargement?: boolean;
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

/** Logo image classes are always present; the external zoom scripts are opt-in. */
export const LOGO_ENLARGEMENT_SCRIPTS = `<script src="//dcqhpema7gk9a.cloudfront.net/IND/HTML5/ISDDefault.js"></script><script> $(document).on("ready", function(){$(".zoomImage").each(function(index){$(this).prop({id: "zoomImage" + index});$(this).tolunaZoom({url : $(this).prop("src"), icon: false}); }); }); </script>`;

function filenameDisplayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Keep the existing nearest-name matching, server URLs and ZIP filename rules.
 * Brand rows control matching/order; alt-name rows control <span> and alt only.
 * Blank alt rows fall back to the *matched file*, not an unrelated brand row.
 */
export function generateLogoLinks(input: LogoLinkInput): string {
  const brandLines = input.brands.map(name => String(name).trim());
  while (brandLines.length && !brandLines[brandLines.length - 1]) brandLines.pop();
  const hasBrands = brandLines.some(Boolean);
  const fileNames = uniqueExportNames(input.filenames.map(filename => ({ filename })), outputExtension(input.format));
  const brands = hasBrands ? brandLines : fileNames.map(filenameDisplayName);
  if (!brands.length) throw new Error('Upload logos or enter at least one brand name');

  const mapping: (number | null)[] = Array(brands.length).fill(null);
  if (hasBrands) {
    const namedRows = brands.map((name, index) => ({ name, index })).filter(row => row.name);
    const matched = matchLogoNames(namedRows.map(row => row.name), input.filenames);
    const used = new Set<number>();
    namedRows.forEach((row, index) => {
      mapping[row.index] = matched[index];
      if (matched[index] !== null) used.add(matched[index]!);
    });
    // Preserve blank rows so the separate alt-name textarea does not drift.
    brands.forEach((brand, index) => {
      if (brand) return;
      const aligned = index < fileNames.length && !used.has(index) ? index : -1;
      const available = aligned >= 0 ? aligned : fileNames.findIndex((_, i) => !used.has(i));
      if (available !== -1) {
        mapping[index] = available;
        used.add(available);
      }
    });
  } else {
    fileNames.forEach((_, index) => { mapping[index] = index; });
  }

  const folder = input.folder.trim().replace(/^\/+|\/+$/g, '');
  const folderPath = folder ? `${folder}/` : '';
  const baseUrl = LOGO_SERVERS[input.server];
  const ext = outputExtension(input.format);
  const html = brands.flatMap((brand, index) => {
    const matchedIndex = mapping[index];
    if (!brand && matchedIndex === null) return [];
    const filename = matchedIndex !== null
      ? fileNames[matchedIndex]
      : `${sanitizeLogoFilename(brand.substring(0, 30).replace(/-/g, '_'))}.${ext}`;
    const fallbackName = filenameDisplayName(filename);
    const displayName = input.altNames?.[index]?.trim() || fallbackName;
    const url = `${baseUrl}${folderPath}${filename}`;
    const imageLink = `<center><img src="${escapeHtml(url)}" class="zoomImage" alt="${escapeHtml(displayName)}" style="max-width:100%" align ="center"></center><span style="display:none;">${escapeHtml(displayName)}</span>`;
    return [imageLink + (input.includeEnlargement ? LOGO_ENLARGEMENT_SCRIPTS : '')];
  });
  if (!html.length) throw new Error('No logo names available to generate links');
  return html.join('\n');
}
