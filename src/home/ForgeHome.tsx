import { useState, type ReactNode } from 'react';
import type { ToolId } from '../tools';
import { tools } from '../tools';
import { CTKCardArt } from './CTKCardArt';

type Destination = ToolId | 'home';

const toolNotes: Record<ToolId, { description: string; category: string; detail: string }> = {
  'logo-resizer': {
    description: 'Build a consistent library of logos, precisely sized and ready to ship.',
    category: 'Image production',
    detail: 'Presets · Labels · Batch export',
  },
  'pdf-to-image': {
    description: 'Convert PDF pages into individually reviewable PNG or JPG images.',
    category: 'Documents',
    detail: 'Multi-file · Page selection · ZIP',
  },
  'image-splitter': {
    description: 'Divide images into clean, evenly sized pieces without changing the original.',
    category: 'Image production',
    detail: 'Custom columns · Preview · ZIP',
  },
  'video-stills': {
    description: 'Pull frames out of videos, select the moments you need and send them to a board.',
    category: 'Video',
    detail: 'Frame extraction · Review · Transfer',
  },
  'storyboard': {
    description: 'Assemble frames into boards, or fit an image into a platform-ready canvas.',
    category: 'Composition',
    detail: 'Grid Board · Fit to Platform',
  },
  'link-generator': {
    description: 'Turn media filenames into ready-to-use exposure links and storyboard code.',
    category: 'Delivery',
    detail: 'ALDI Blob · S3 Media · Copy',
  },
  'ad-downloader': {
    description: 'Collect and review batches of advertising assets before downloading.',
    category: 'Delivery',
    detail: 'Review queue · Filtering · Download',
  },
};

export const toolDetails = toolNotes;

export function ToolGlyph({ tool, size = 24 }: { tool: Destination; size?: number }) {
  const paths: Record<Destination, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
    'logo-resizer': <><rect x="4" y="4" width="12" height="12" rx="2"/><path d="M9 9h11v11H9"/><path d="m13 7 3-3m-3 0h3v3"/></>,
    'pdf-to-image': <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4"/><circle cx="11" cy="12" r="1.3"/><path d="m8 18 3-3 2 2 2-2 2 3"/></>,
    'image-splitter': <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></>,
    'video-stills': <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/><path d="m10 9 5 3-5 3z"/></>,
    storyboard: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M10 9v11M3 15h7M10 15h11"/></>,
    'link-generator': <><path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10 5.93"/><path d="M14 11a5 5 0 0 0-7.07 0l-2.12 2.12a5 5 0 0 0 7.07 7.07L14 18.07"/></>,
    'ad-downloader': <><path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 16v4h16v-4"/><path d="M6 4h3M15 4h3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[tool]}</svg>;
}

type Props = { onOpenTool: (tool: ToolId) => void };

export function ForgeHome({ onOpenTool }: Props) {
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState<ToolId>('logo-resizer');
  const term = search.trim().toLocaleLowerCase();
  const matching = tools.filter(tool =>
    !term || [tool.label, toolNotes[tool.id].category, toolNotes[tool.id].description]
      .some(value => value.toLocaleLowerCase().includes(term))
  );
  const selected = matching.some(tool => tool.id === highlighted)
    ? highlighted : matching[0]?.id;
  const selectedInfo = selected ? toolNotes[selected] : null;

  return (
    <section className="forge-home ctk-home" aria-label="The Forge home">
      <header className="ctk-home-top">
        <div className="ctk-home-nav">
          <div className="ctk-home-nav-left">
            <button type="button" className="ctk-home-brand-button" aria-label="Home" aria-current="page" onClick={() => { setSearch(''); setHighlighted('logo-resizer'); }}><span className="ctk-home-brand-mark" aria-hidden="true">F</span></button>
            <span>Creative workbench</span>
          </div>
          <div className="ctk-home-nav-right">
            <span className="ctk-home-ready" aria-hidden="true" />
            Seven tools, one workbench
          </div>
        </div>
        <div className="ctk-home-hero">
          <h1>The Forge</h1>
          <div className="ctk-home-manifesto">
            <span aria-hidden="true" />
            <p>Resize, convert, capture, arrange, and deliver. Start with the tool your work needs.</p>
          </div>
        </div>
      </header>

      <div className="ctk-home-main">
        <aside className="ctk-home-intro" aria-label="Find a creative tool">
          <div>
            <h2>Choose a tool</h2>
            <p>Find what you need. Get to work.</p>
            <label className="ctk-home-find">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17"
                fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="10.5" cy="10.5" r="6.8" />
                <path d="m15.5 15.5 5 5" />
              </svg>
              <input type="search" aria-label="Find a Forge tool"
                placeholder="Find a tool" value={search}
                onChange={event => setSearch(event.target.value)} />
            </label>
          </div>
          <div className="ctk-home-selection" aria-live="polite">
            <span className="ctk-home-count">{String(matching.length).padStart(2, '0')} / {String(tools.length).padStart(2, '0')} WORKSPACES</span>
            {selected ? (
              <>
                <h3>{tools.find(tool => tool.id === selected)?.label}</h3>
                <p>{selectedInfo?.description}</p>
              </>
            ) : (
              <>
                <h3>No matching tools</h3>
                <p>Try a different tool name or category.</p>
              </>
            )}
          </div>
        </aside>
        <div className="forge-home-grid ctk-home-grid" aria-label="Available tools">
          {tools.map((tool, index) => {
            const info = toolNotes[tool.id];
            const matches = matching.some(entry => entry.id === tool.id);
            return (
              <button key={tool.id} type="button"
                className={'forge-home-card ctk-home-card ctk-home-card-' + (index + 1) + (index === 0 ? ' forge-home-card-feature' : '')}
                disabled={!matches} data-workbench={tool.id}
                onClick={() => onOpenTool(tool.id)}
                onMouseEnter={() => setHighlighted(tool.id)}
                onFocus={() => setHighlighted(tool.id)}
                aria-label={'Open ' + tool.label}>
                <span className="ctk-home-card-arrow" aria-hidden="true">↗</span>
                <span className="ctk-home-card-glyph" aria-hidden="true"><ToolGlyph tool={tool.id} size={31} /></span>
                <span className="ctk-home-card-illustration" aria-hidden="true">
                  <CTKCardArt tool={tool.id} />
                </span>
                <span className="ctk-home-card-copy">
                  <strong>{tool.label}</strong>
                  <span>{info.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <footer className="ctk-home-footer">
        <span>The Forge · Creative tools</span>
        <span>Seven creative workspaces. Choose one to begin.</span>
      </footer>
    </section>
  );
}
