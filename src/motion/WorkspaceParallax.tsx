import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ToolId } from '../tools';

/**
 * Use one existing native scrolling surface per workspace.
 *
 * The previous version attached rAF + scroll/change listeners to TWO panels
 * per route and wrote inline transforms on every scrolling frame. A single
 * decorative layer with CSS scroll-timeline replaces the main-thread loop,
 * without intercepting wheel/touch input or moving any real workroom content.
 */
const PANELS: Record<ToolId, string> = {
  'logo-resizer': '.logo-gallery',
  'pdf-to-image': '.pdf-list',
  'image-splitter': '.split-card-grid',
  'video-stills': '.vs-stacks',
  'storyboard': '.sb-controls',
  'link-generator': '.link-generator',
  'ad-downloader': '.adw-workspace',
};

type Props = { activeTool: ToolId | null };

export function WorkspaceParallax({ activeTool }: Props) {
  const [panel, setPanel] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!activeTool) {
      setPanel(null);
      return;
    }
    // Inactive tool roots stay mounted. Select from the visible route ONLY.
    const wrapper = document.querySelector<HTMLElement>(
      '.sketch-main-area .native-tool:not([hidden])'
    );
    setPanel(wrapper?.querySelector<HTMLElement>(PANELS[activeTool]) ?? null);
  }, [activeTool]);

  // The artwork is fully noninteractive, and CSS handles its scroll motion.
  // Unmounting this portal on navigation automatically removes the layers.
  return activeTool && panel ? createPortal(
    <div className="forge-parallax-art" aria-hidden="true" data-parallax-panel={activeTool}>
      <span className="forge-parallax-near" />
      <span className="forge-parallax-far" />
    </div>,
    panel,
    'forge-parallax-' + activeTool,
  ) : null;
}
