import { useState, type ReactNode } from 'react';
import type { ToolId } from '../tools';
import { tools } from '../tools';

type Destination = ToolId | 'home';

// Tool names, descriptions and ordering are preserved from the working Home.
const toolNotes: Record<ToolId, { description: string; cardCopy: string; category: string; detail: string }> = {
  'logo-resizer': {
    description: 'Build a consistent library of logos, precisely sized and ready to ship.',
    cardCopy: 'Resize your logo to multiple sizes instantly.',
    category: 'Image production',
    detail: 'Presets · Labels · Batch export',
  },
  'pdf-to-image': {
    description: 'Convert PDF pages into individually reviewable PNG or JPG images.',
    cardCopy: 'Convert PDF pages into high-quality images.',
    category: 'Documents',
    detail: 'Multi-file · Page selection · ZIP',
  },
  'image-splitter': {
    description: 'Divide images into clean, evenly sized pieces without changing the original.',
    cardCopy: 'Split an image into equal parts (grid, rows, or columns).',
    category: 'Image production',
    detail: 'Custom columns · Preview · ZIP',
  },
  'video-stills': {
    description: 'Pull frames out of videos, select the moments you need and send them to a board.',
    cardCopy: 'Extract high-quality still images from a video.',
    category: 'Video',
    detail: 'Frame extraction · Review · Transfer',
  },
  storyboard: {
    description: 'Assemble frames into boards, or fit an image into a platform-ready canvas.',
    cardCopy: 'Plan your video or ad with a simple, visual storyboard.',
    category: 'Composition',
    detail: 'Grid Board · Fit to Platform',
  },
  'link-generator': {
    description: 'Turn media filenames into ready-to-use exposure links and storyboard code.',
    cardCopy: 'Create a clean, shareable link for your content.',
    category: 'Delivery',
    detail: 'ALDI Blob · S3 Media · Copy',
  },
  'ad-downloader': {
    description: 'Collect and review batches of advertising assets before downloading.',
    cardCopy: 'Download ads and media from supported platforms.',
    category: 'Delivery',
    detail: 'Review queue · Filtering · Download',
  },
};

export const toolDetails = toolNotes;

export function ToolGlyph({ tool, size = 24 }: { tool: Destination; size?: number }) {
  const paths: Record<Destination, ReactNode> = {
    home: (
      <>
        <path pathLength={1} d="m3 10 9-7 9 7v10H3z" />
        <path pathLength={1} d="M9 20v-7h6v7" />
      </>
    ),
    'logo-resizer': (
      <>
        <rect pathLength={1} x="4" y="4" width="12" height="12" rx="2" />
        <path pathLength={1} d="M9 9h11v11H9" />
        <path pathLength={1} d="m13 7 3-3m-3 0h3v3" />
      </>
    ),
    'pdf-to-image': (
      <>
        <path pathLength={1} d="M6 3h9l4 4v14H6z" />
        <path pathLength={1} d="M15 3v5h4" />
        <circle pathLength={1} cx="11" cy="12" r="1.3" />
        <path pathLength={1} d="m8 18 3-3 2 2 2-2 2 3" />
      </>
    ),
    'image-splitter': (
      <>
        <rect pathLength={1} x="3" y="3" width="18" height="18" rx="2" />
        <path pathLength={1} d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </>
    ),
    'video-stills': (
      <>
        <rect pathLength={1} x="3" y="5" width="18" height="14" rx="2" />
        <path pathLength={1} d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" />
        <path pathLength={1} d="m10 9 5 3-5 3z" />
      </>
    ),
    storyboard: (
      <>
        <rect pathLength={1} x="3" y="4" width="18" height="16" rx="2" />
        <path pathLength={1} d="M3 9h18M10 9v11M3 15h7M10 15h11" />
      </>
    ),
    'link-generator': (
      <>
        <path pathLength={1} d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10 5.93" />
        <path pathLength={1} d="M14 11a5 5 0 0 0-7.07 0l-2.12 2.12a5 5 0 0 0 7.07 7.07L14 18.07" />
      </>
    ),
    'ad-downloader': (
      <>
        <path pathLength={1} d="M12 3v13m-5-5 5 5 5-5" />
        <path pathLength={1} d="M4 16v4h16v-4" />
        <path pathLength={1} d="M6 4h3M15 4h3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[tool]}
    </svg>
  );
}

type Props = { onOpenTool: (tool: ToolId) => void };

// No intro, motion libraries, drawing loops or search-time animation.
export function ForgeHome({ onOpenTool }: Props) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const visibleTools = tools.filter(tool => !query ||
    [tool.label, toolNotes[tool.id].category, toolNotes[tool.id].description]
      .some(value => value.toLocaleLowerCase().includes(query))
  );

  return (
    <section className="forge-home sketch-home forge-amoled-home" aria-label="The Forge home">
      <header className="sketch-header-band">
        <div className="sketch-hero-center">
          <div className="sketch-title-lockup">
            <h1>THE FORGE</h1>
          </div>
          <p className="sketch-subtitle">A creative production toolkit</p>
        </div>
      </header>

      <div className="sketch-welcome-row">
        <div className="sketch-welcome-copy">
          <h2>Choose a workspace</h2>
          <p>Seven dedicated tools. One focused workspace.</p>
        </div>
        <div className="sketch-welcome-controls">
          {query && (
            <button type="button" className="sketch-reset-view" onClick={() => setSearch('')}>
              Show all tools
            </button>
          )}
          <label className="sketch-search-field">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none"
              stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5"/>
              <path d="m15.5 15.5 5 5"/>
            </svg>
            <input
              type="search"
              className="sketch-search-input"
              aria-label="Find a Forge tool"
              placeholder="Find a tool..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </label>
        </div>
      </div>

      {visibleTools.length === 0 ? (
        <div className="sketch-empty-state" role="status">
          <h3>No matching tools</h3>
          <p>Try another search term.</p>
          <button type="button" className="sketch-empty-btn" onClick={() => setSearch('')}>
            View all 7 tools
          </button>
        </div>
      ) : (
        <div className={'forge-home-grid sketch-home-grid' + (query ? ' is-filtered' : '')}
             aria-label="Available tools">
          {visibleTools.map(tool => (
            <div key={tool.id} className={'sketch-card-slot sketch-slot-' + tool.id}>
              <button
                type="button"
                className={'forge-home-card sketch-tool-card sketch-card-' + tool.id}
                data-workbench={tool.id}
                onClick={() => onOpenTool(tool.id)}
                aria-label={'Open ' + tool.label}
              >
                <span className="sketch-card-art" aria-hidden="true">
                  <ToolGlyph tool={tool.id} size={48}/>
                </span>
                <span className="sketch-card-body">
                  <strong className="sketch-card-title">{tool.label}</strong>
                  <span className="sketch-card-desc">{toolNotes[tool.id].cardCopy}</span>
                  <span className="sketch-card-meta">{toolNotes[tool.id].detail}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
