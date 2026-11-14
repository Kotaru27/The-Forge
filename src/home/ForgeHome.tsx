import { useState, type ReactNode } from 'react';
import type { ToolId } from '../tools';
import { tools } from '../tools';

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
    'logo-resizer': <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8v8H8zM3 9h3m12 6h3M9 3v3m6 12v3"/></>,
    'pdf-to-image': <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6m-6 4h6"/></>,
    'image-splitter': <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-16v16M3 12h18"/></>,
    'video-stills': <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3zM6 3v2m6-2v2m6-2v2M6 19v2m6-2v2m6-2v2"/></>,
    storyboard: <><rect x="2.5" y="3.5" width="8" height="7" rx="1"/><rect x="13.5" y="3.5" width="8" height="7" rx="1"/><rect x="2.5" y="13.5" width="8" height="7" rx="1"/><rect x="13.5" y="13.5" width="8" height="7" rx="1"/></>,
    'link-generator': <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7 7l1.7-1.7"/></>,
    'ad-downloader': <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/><path d="M5 4h4m6 0h4"/></>,
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
                  <ToolGlyph tool={tool.id} size={105} />
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
