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

// Video Compressor is postponed; keep its legacy definition until the migration is retired.
export const releaseTools = tools.filter(tool => tool.id !== 'video-compressor');
export type ReleaseToolId = Exclude<ToolId, 'video-compressor'>;

export function isReleaseTool(value: string): value is ReleaseToolId {
  return releaseTools.some(tool => tool.id === value);
}

export function usesLegacyWorkspace(toolId: ToolId): boolean {
  return !isReleaseTool(toolId);
}
