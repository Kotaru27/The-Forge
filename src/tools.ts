/** Native React tools shipped on GitHub Pages. Video Compressor is deferred. */
export const tools = [
  { id: 'logo-resizer', label: 'Logo Resizer' },
  { id: 'pdf-to-image', label: 'PDF to Image' },
  { id: 'image-splitter', label: 'Image Splitter' },
  { id: 'video-stills', label: 'Video Stills' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'link-generator', label: 'Link Generator' },
  { id: 'ad-downloader', label: 'Ad Downloader' },
] as const;

export type ToolId = (typeof tools)[number]['id'];
export const defaultTool: ToolId = 'logo-resizer';

export function isToolId(value: string): value is ToolId {
  return tools.some(tool => tool.id === value);
}
