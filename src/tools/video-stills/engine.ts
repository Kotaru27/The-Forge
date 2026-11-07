/** Video Stills processing contracts, ported from the original CTK tool. */
export type FrameKind = 'still' | 'storyboard';
export type VideoFrame = {
  num: number | 'storyboard';
  type: FrameKind;
  blob: Blob;
  url: string;
  checked: boolean;
};
export type VideoCollection = {
  id: string;
  name: string;
  sourceName: string;
  status: 'processing' | 'ready' | 'failed' | 'canceled';
  frames: VideoFrame[];
  total: number;
  completed: number;
  message?: string;
};
export type TransferFrame = { num: number; blob: Blob };
export type TransferGroup = { id: string; name: string; frames: TransferFrame[] };
export type TransferResult = { imported: number; created?: number; rejected: number; mode: 'story' };

/** Original sampling: one full-resolution JPEG for each completed second, evenly placed. */
export function frameTimes(duration: number): number[] {
  if (!Number.isFinite(duration) || duration < 1) throw new Error('Video is too short or its duration cannot be read.');
  const count = Math.floor(duration) || 1;
  // Protect against impractically large allocations without silently reducing extraction count.
  if (count > 86_400) throw new Error('This video would generate more than 86,400 frames. Choose a shorter video.');
  const step = duration / (count + 1);
  return Array.from({ length: count }, (_, index) => (index + 1) * step);
}

/** Matches the filename-cleanup behavior of the existing Stills tool. */
export function collectionName(fileName: string): string {
  const name = fileName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
  return name.replace(/[\\/\u0000-\u001f]/g, '_').replace(/^\.+$/, 'video').slice(0, 150) || 'video';
}
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv)$/i.test(file.name);
}
export function selectedStills(collection: VideoCollection): VideoFrame[] {
  return collection.frames.filter(frame => frame.type === 'still' && frame.checked && typeof frame.num === 'number');
}
export function selectedCount(collections: VideoCollection[]): number {
  return collections.reduce((total, item) => total + selectedStills(item).length, 0);
}
export function getSelectedGroups(collections: VideoCollection[], onlyId?: string): TransferGroup[] {
  return collections.filter(item => !onlyId || item.id === onlyId)
    .map(item => ({ id: item.id, name: item.name,
      frames: selectedStills(item).map(frame => ({ num: frame.num as number, blob: frame.blob })) }))
    .filter(group => group.frames.length > 0);
}
export type ZipEntry = { path: string; blob: Blob };
export function exportSelected(collection: VideoCollection): ZipEntry[] {
  let number = 0;
  return collection.frames.filter(frame => frame.checked).map(frame => ({
    path: frame.type === 'storyboard' ? 'storyboard.jpg' : `${++number}.jpg`,
    blob: frame.blob,
  }));
}
function cleanFolder(value: string): string {
  return value.replace(/[\\/\u0000-\u001f]/g, '_').replace(/^\.+$/, 'video').slice(0, 150) || 'video';
}
export function exportAll(collections: VideoCollection[]): ZipEntry[] {
  const counts = new Map<string, number>();
  const all: ZipEntry[] = [];
  for (const item of collections) {
    const entries = exportSelected(item);
    if (!entries.length) continue;
    const base = cleanFolder(item.name);
    const n = (counts.get(base) || 0) + 1;
    counts.set(base, n);
    const folder = n === 1 ? base : `${base}_${n}`;
    for (const entry of entries) all.push({ path: `${folder}/${entry.path}`, blob: entry.blob });
  }
  return all;
}
export function selectedZipName(collection: VideoCollection): string {
  return `${collection.name.replace(/[^a-z0-9]/gi, '_') || 'video'}_stills.zip`;
}
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
    || error instanceof Error && error.name === 'AbortError';
}
