import { useState, type ReactNode } from 'react';
import type { ToolId } from '../tools';
import { tools } from '../tools';
import {
  ChecklistArrow,
  ForgeKilnArt,
  GearsDoodle,
  MountainDoodle,
  SketchCardArt,
  SketchCardBorder,
  SketchCheckboxIcon,
  SketchDividerLine,
  SketchSpiralRingSvg,
  SketchWavingHand,
} from './SketchIllustrations';

type Destination = ToolId | 'home';

// Decorative marks from the supplied reference; no new checklist functionality.
const DECORATIVE_MARKS = [
  { id: 'prepare', label: 'Prepare', done: true },
  { id: 'process', label: 'Process', done: true },
  { id: 'create', label: 'Create', done: true },
  { id: 'ship', label: 'Ship', done: false },
] as const;

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
        <path d="m3 10 9-7 9 7v10H3z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    'logo-resizer': (
      <>
        <rect x="4" y="4" width="12" height="12" rx="2" />
        <path d="M9 9h11v11H9" />
        <path d="m13 7 3-3m-3 0h3v3" />
      </>
    ),
    'pdf-to-image': (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h4" />
        <circle cx="11" cy="12" r="1.3" />
        <path d="m8 18 3-3 2 2 2-2 2 3" />
      </>
    ),
    'image-splitter': (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </>
    ),
    'video-stills': (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" />
        <path d="m10 9 5 3-5 3z" />
      </>
    ),
    storyboard: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M10 9v11M3 15h7M10 15h11" />
      </>
    ),
    'link-generator': (
      <>
        <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10 5.93" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-2.12 2.12a5 5 0 0 0 7.07 7.07L14 18.07" />
      </>
    ),
    'ad-downloader': (
      <>
        <path d="M12 3v13m-5-5 5 5 5-5" />
        <path d="M4 16v4h16v-4" />
        <path d="M6 4h3M15 4h3" />
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

type Props = {
  onOpenTool: (tool: ToolId) => void;
};

export function ForgeHome({ onOpenTool }: Props) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLocaleLowerCase();
  const visibleIds = tools.filter(tool =>
    !term || [tool.label, toolNotes[tool.id].category, toolNotes[tool.id].description]
      .some(value => value.toLocaleLowerCase().includes(term))
  ).map(tool => tool.id);

  const visibleTools = visibleIds
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((t): t is (typeof tools)[number] => Boolean(t));

  const isFilteredView = search.trim().length > 0;

  return (
    <section className="forge-home sketch-home" aria-label="The Forge home">
      <header className="sketch-header-band">
        <div className="sketch-checklist-wrap" aria-hidden="true">
          <ul className="sketch-checklist">
            {DECORATIVE_MARKS.map((item) => (
              <li key={item.id}>
                <span className={'sketch-check-btn' + (item.done ? ' is-done' : '')}>
                  <span className="sketch-checkbox-box" aria-hidden="true">
                    <SketchCheckboxIcon checked={item.done} />
                  </span>
                  <span>{item.label}</span>
                </span>
              </li>
            ))}
          </ul>
          <span className="sketch-checklist-arrow" aria-hidden="true">
            <ChecklistArrow />
          </span>
        </div>

        <div className="sketch-hero-center">
          <div className="sketch-title-lockup">
            <span className="sketch-title-ticks sketch-title-ticks-left" aria-hidden="true">
              <svg viewBox="0 0 28 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path pathLength={100} data-pencil-trace d="M6 10 L22 15 M2 20 L20 20 M7 30 L22 25" />
              </svg>
            </span>
            <h1>THE FORGE</h1>
            <span className="sketch-title-ticks sketch-title-ticks-right" aria-hidden="true">
              <svg viewBox="0 0 28 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path pathLength={100} data-pencil-trace d="M22 10 L6 15 M26 20 L8 20 M21 30 L6 25" />
              </svg>
            </span>
          </div>
          <p className="sketch-subtitle">
            <span className="sketch-subtitle-rule" aria-hidden="true" />
            <span className="sketch-highlight-sweep">A creative production toolkit</span>
            <span className="sketch-subtitle-rule" aria-hidden="true" />
          </p>
        </div>

        <div className="sketch-header-kiln" aria-hidden="true">
          <ForgeKilnArt />
        </div>
      </header>
      <SketchDividerLine />

      <div className="sketch-welcome-row">
        <div className="sketch-welcome-copy">
          <h2>
            <span className="sketch-welcome-ink">Welcome to The Forge</span>{' '}
            <span className="sketch-wave-mark" aria-hidden="true">
              <SketchWavingHand />
            </span>
          </h2>
          <p>Pick a tool and get to work.</p>
          <span className="sketch-welcome-ticks" aria-hidden="true">
            <svg viewBox="0 0 24 22" fill="none" stroke="#b85337" strokeWidth="1.7" strokeLinecap="round">
              <path pathLength={100} data-pencil-trace d="M4 6 L16 2 M6 13 L20 11 M4 19 L15 20" />
            </svg>
          </span>
        </div>

        <div className="sketch-welcome-controls">
          {isFilteredView && (
            <button type="button" className="sketch-reset-view" onClick={() => setSearch('')}>
              Show all tools
            </button>
          )}
          <label className="sketch-search-field">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 5 5" />
            </svg>
            <input
              type="search"
              className="sketch-search-input"
              aria-label="Find a Forge tool"
              placeholder="Find a tool..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <svg className="sketch-search-underline" viewBox="0 0 220 8" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path pathLength={100} data-pencil-trace d="M2 4 Q65 2 125 4.5 T218 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </label>
        </div>
      </div>

      {visibleTools.length === 0 ? (
        <div className="sketch-empty-state" role="status">
          <h3>No matching tools</h3>
          <p>Try another search term or view all seven tools.</p>
          <button
            type="button"
            className="sketch-empty-btn"
            onClick={() => setSearch('')}
          >
            View all 7 tools
          </button>
        </div>
      ) : (
        <div
          className={'forge-home-grid sketch-home-grid' + (isFilteredView ? ' is-filtered' : '')}
          aria-label="Available tools"
        >
          {visibleTools.map((tool) => {
            const info = toolNotes[tool.id];
            const hasTopLeftTape = tool.id === 'logo-resizer';
            const hasTopRightTape = tool.id === 'ad-downloader';
            const isSpiralCard = tool.id === 'storyboard';
            const hasRustUnderline = tool.id === 'ad-downloader';
            const hasTitleSparks = tool.id === 'storyboard';

            return (
              <div
                key={tool.id}
                className={`sketch-card-slot sketch-slot-${tool.id}`}
              >
                {hasTopLeftTape && <span className="sketch-tape sketch-tape-tl" aria-hidden="true" />}
                {hasTopRightTape && <span className="sketch-tape sketch-tape-tr" aria-hidden="true" />}
                {isSpiralCard && (
                  <span className="sketch-card-spiral" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <SketchSpiralRingSvg key={idx} compact />
                    ))}
                  </span>
                )}

                <button
                  type="button"
                  className={`forge-home-card sketch-tool-card sketch-card-${tool.id}`}
                  data-workbench={tool.id}
                  onClick={() => onOpenTool(tool.id)}
                  aria-label={`Open ${tool.label}`}
                >
                  <SketchCardBorder spiral={isSpiralCard} />
                  <span className="sketch-card-art" aria-hidden="true">
                    <SketchCardArt tool={tool.id} />
                  </span>

                  <span className="sketch-card-body">
                    <strong className="sketch-card-title">
                      {hasTitleSparks && (
                        <svg className="sketch-title-sparks" viewBox="0 0 22 22" fill="none" stroke="#b85337" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                          <path pathLength={100} data-pencil-trace d="M18 4 L6 8 M18 11 L4 11 M18 18 L6 14" />
                        </svg>
                      )}
                      <span className="sketch-highlight-mark">{tool.label}</span>
                    </strong>
                    <span className="sketch-card-desc">{info.cardCopy}</span>
                  </span>

                  {hasRustUnderline && (
                    <svg className="sketch-rust-flourish" viewBox="0 0 90 12" fill="none" stroke="#b85337" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <path pathLength={100} data-pencil-trace d="M4 8 Q46 3 86 5 M18 11 Q54 7 78 8" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="sketch-bottom-mountains" aria-hidden="true">
        <MountainDoodle />
      </div>
      <div className="sketch-bottom-gears" aria-hidden="true">
        <GearsDoodle />
      </div>
    </section>
  );
}
