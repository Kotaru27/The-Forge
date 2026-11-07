import type { TransferGroup, TransferResult } from '../video-stills/engine';

export type CanvasSource = HTMLImageElement | HTMLCanvasElement;
export type StoryMode = 'story' | 'fit';
export type BoardSettings = {
  gap: number; width: number; autoWidth: boolean; cols: number;
  bgColor: string; fitMode: 'cover' | 'contain';
};
export type StoryFrame = {
  id: string; file: Blob; name: string; image: CanvasSource; url?: string;
  stillsSourceId?: string; stillsFrameNum?: number;
};
export type StoryBoard = {
  id: string; name: string; images: StoryFrame[]; settings: BoardSettings;
  defaultColumnsPending: boolean; stillsSourceId?: string;
};
export type FitSettings = {
  statement: string; imageFit: 'contain' | 'cover'; imageSize: number;
  fontSize: number; resolution: 1 | 2 | 3;
};
export type StoryboardRef = {
  importStills: (groups: TransferGroup[]) => Promise<TransferResult>;
  openMode: (mode: StoryMode) => void;
};
export const MAX_BOARD_FRAMES = 200;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  gap: 0, width: 1920, autoWidth: true, cols: 0, bgColor: '#ffffff', fitMode: 'cover',
};
export const DEFAULT_FIT_SETTINGS: FitSettings = {
  statement: 'le uniche cose a cui dovrai rinunciare sono i problemi di stomaco.',
  imageFit: 'contain', imageSize: 86, fontSize: 20, resolution: 3,
};
export const FIT_WIDTH = 1033;
export const FIT_HEIGHT = 195;
export const FIT_CIRCLES = [
  { imageX: 90, y: 91, textX: 272, textY: 91 },
  { imageX: 548, y: 96, textX: 630, textY: 96 },
  { imageX: 883, y: 103, textX: 942, textY: 103 },
] as const;

export const naturalCompare = (a: string, b: string): number =>
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
export const safeBoardName = (name: string): string =>
  (String(name || 'Board').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim().slice(0, 80) || 'Board');
export const exportName = (name: string): string =>
  (String(name || 'Board').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'Board');
export function uniqueBoardName(name: string, boards: readonly StoryBoard[], excludeId?: string): string {
  const base = safeBoardName(name);
  let candidate = base;
  let suffix = 2;
  while (boards.some(board => board.id !== excludeId && board.name.toLowerCase() === candidate.toLowerCase())) {
    candidate = `${base} ${suffix++}`;
  }
  return candidate;
}
export function boardExportNames(boards: readonly { name: string; images: readonly unknown[] }[]): string[] {
  const used = new Set<string>();
  return boards.filter(board => board.images.length).map(board => {
    const base = exportName(board.name);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) candidate = `${base}_${suffix++}`;
    used.add(candidate.toLowerCase());
    return `${candidate}.jpg`;
  });
}
export function boardColumns(imageCount: number, requested: number): number {
  if (imageCount <= 0) return 0;
  if (requested <= 0) return imageCount === 4 ? 2 : Math.min(3, imageCount);
  return Math.max(1, Math.min(3, Math.floor(requested)));
}
export function validBoardSettings(settings: BoardSettings): boolean {
  const s = settings;
  const cols = Math.max(1, Math.min(3, s.cols || 1));
  return Number.isFinite(s.gap) && s.gap >= 0 && s.gap <= 1000 &&
    Number.isFinite(s.cols) && s.cols >= 0 && s.cols <= 3 &&
    Number.isFinite(s.width) && s.width >= 64 && s.width <= 8192 &&
    (s.autoWidth || s.width > s.gap * (cols - 1) + cols) &&
    ['cover', 'contain'].includes(s.fitMode);
}
export function folderGroups(files: readonly File[]): { name: string; files: File[] }[] {
  if (!files.length) return [];
  const paths = files.map(file => file.webkitRelativePath || '');
  if (!paths[0]?.includes('/')) return [];
  const root = paths[0].split('/')[0];
  if (!root || paths.some(path => !path.includes('/') || path.split('/')[0] !== root)) return [];
  const map = new Map<string, File[]>();
  for (const file of files) {
    const parts = (file.webkitRelativePath || '').split('/').filter(Boolean);
    if (parts.length < 2) continue;
    const name = parts.length >= 3 ? parts[1] : root;
    const list = map.get(name) || [];
    list.push(file);
    map.set(name, list);
  }
  return [...map].sort(([a], [b]) => naturalCompare(a, b)).map(([name, items]) => ({
    name, files: items.sort((a, b) => naturalCompare(a.webkitRelativePath || a.name, b.webkitRelativePath || b.name)),
  }));
}
export function alreadyOnBoard(board: StoryBoard | undefined, groupId: string, frameNum: number): boolean {
  return !!board?.images.some(image => image.stillsSourceId === groupId && image.stillsFrameNum === frameNum);
}
export function validateStills(groups: TransferGroup[]): void {
  if (!Array.isArray(groups) || groups.length > 100) throw Error('Invalid video collections');
  for (const group of groups) {
    if (typeof group.id !== 'string' || typeof group.name !== 'string' || !Array.isArray(group.frames) || group.frames.length > 100000) throw Error('Invalid video collection');
    for (const frame of group.frames) if (!Number.isInteger(frame.num) || frame.num < 1 || !(frame.blob instanceof Blob) || frame.blob.size < 1) throw Error('Invalid video frame');
  }
}
