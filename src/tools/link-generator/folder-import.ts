// Folder selection reads filename metadata only; files are never uploaded or opened.
const supportedExtensions = new Set(['jpg', 'jpeg', 'png', 'mp4', 'mp3']);
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export type FolderEntry = { name: string; webkitRelativePath?: string };
export type FolderImportResult = {
  names: string[];
  folderName: string;
  skippedUnsupported: number;
  skippedNested: number;
};

export function sortAdNames(names: readonly string[]): string[] {
  return [...names].sort((a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0));
}

export function importFolderNames(files: readonly FolderEntry[]): FolderImportResult {
  const names: string[] = [];
  let skippedUnsupported = 0;
  let skippedNested = 0;
  const folderName = files[0]?.webkitRelativePath?.split('/')[0] || 'Selected folder';

  for (const file of files) {
    const parts = (file.webkitRelativePath || file.name).split('/').filter(Boolean);
    if (parts.length > 2) { skippedNested++; continue; }
    const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
    if (!ext || !supportedExtensions.has(ext)) { skippedUnsupported++; continue; }
    names.push(file.name);
  }

  return { names: sortAdNames(names), folderName, skippedUnsupported, skippedNested };
}
