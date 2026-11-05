export const tools = [
  { id: 'logo-resizer', label: 'Logo Resizer', section: 'section-logo' },
  { id: 'pdf-to-image', label: 'PDF to Image', section: 'section-pdf', mode: 'convert' },
  { id: 'image-splitter', label: 'Image Splitter', section: 'section-pdf', mode: 'split' },
  { id: 'video-stills', label: 'Video Stills', section: 'section-stills-boards', mode: 'video' },
  { id: 'storyboard', label: 'Storyboard', section: 'section-stills-boards', mode: 'story' },
  { id: 'link-generator', label: 'Link Generator', section: 'section-adlinks', mode: 'gen' },
  { id: 'ad-downloader', label: 'Ad Downloader', section: 'section-adlinks', mode: 'downloader' },
  { id: 'video-compressor', label: 'Video Compressor', section: 'section-yt-helper' },
] as const;

export type ToolId = (typeof tools)[number]['id'];
export const defaultTool: ToolId = 'logo-resizer';

export function isToolId(value: string): value is ToolId {
  return tools.some(tool => tool.id === value);
}

// Only these tools have a native React workspace. Keep the older iframe for the others.
const migratedTools: ReadonlySet<ToolId> = new Set([
  'link-generator', 'logo-resizer', 'image-splitter', 'pdf-to-image', 'video-stills',
]);

export function usesLegacyWorkspace(toolId: ToolId): boolean {
  return !migratedTools.has(toolId);
}
