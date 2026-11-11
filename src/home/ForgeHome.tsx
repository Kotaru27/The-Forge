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
  const [inspected, setInspected] = useState<ToolId>('logo-resizer');
  const current = tools.find(tool => tool.id === inspected) ?? tools[0];
  const currentIndex = tools.findIndex(tool => tool.id === current.id);
  const detail = toolNotes[current.id];

  return <section className="forge-home forge-home-atelier" aria-label="The Forge home">
    <div className="atelier-frame">
      <header className="atelier-intro">
        <div className="atelier-intro-top">
          <span className="atelier-kicker">A creative workstation, precisely made.</span>
          <span className="atelier-series">Seven tools. One place to make the work.</span>
        </div>
        <div className="atelier-intro-main">
          <h1 aria-label="The Forge" className="atelier-wordmark">
            {Array.from('THE FORGE').map((letter, index) =>
              <span key={index} className={letter === ' ' ? 'is-space' : ''} style={{ animationDelay: `${index * 32}ms` }} aria-hidden="true">
                {letter === ' ' ? '\u00a0' : letter}
              </span>
            )}
          </h1>
          <p>Seven independent instruments for image, document, video and delivery work. Choose what you need; keep your work in your browser.</p>
        </div>
      </header>

      <div className="atelier-body">
        <div className="atelier-preview" aria-live="off">
          <div className="atelier-preview-bar"><span>Selected instrument</span><span>{String(currentIndex + 1).padStart(2, '0')} / 07</span></div>
          <div className="atelier-object-well" key={inspected}>
            {inspected === 'logo-resizer' && <div className="atelier-logo-object"><span>F</span><i aria-hidden="true" /></div>}
            {inspected === 'pdf-to-image' && <div className="atelier-pages-object"><i /><i /><i /><span>PDF</span></div>}
            {inspected === 'image-splitter' && <div className="atelier-split-object">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div>}
            {inspected === 'video-stills' && <div className="atelier-film-object">{Array.from({ length: 4 }, (_, i) => <i key={i} />)}</div>}
            {inspected === 'storyboard' && <div className="atelier-board-object">{Array.from({ length: 4 }, (_, i) => <i key={i} />)}</div>}
            {inspected === 'link-generator' && <div className="atelier-link-object"><ToolGlyph tool="link-generator" size={132} /><span>media / output</span></div>}
            {inspected === 'ad-downloader' && <div className="atelier-download-object"><ToolGlyph tool="ad-downloader" size={132} /><span>assets / archive</span></div>}
          </div>
          <div className="atelier-preview-caption">
            <div><small>{detail.category}</small><strong>{current.label}</strong><p>{detail.description}</p></div>
            <span className="atelier-preview-mark" aria-hidden="true"><ToolGlyph tool={current.id} size={31} /></span>
          </div>
          <div className="atelier-preview-footer"><span>{detail.detail}</span><span>Available locally</span></div>
        </div>
        <div className="atelier-collection">
          <div className="atelier-collection-header">
            <div><h2>Choose an instrument</h2><p>One click opens the original workroom.</p></div>
            <span>01 — 07</span>
          </div>
          <div className="atelier-tool-index" aria-label="Tools">
            {tools.map((tool, index) => {
              const note = toolNotes[tool.id];
              const isSelected = inspected === tool.id;
              return <button type="button" key={tool.id}
                className={'forge-home-card atelier-tool-row' + (isSelected ? ' is-inspected' : '')}
                data-workbench={tool.id}
                aria-label={`Open ${tool.label}`}
                onMouseEnter={() => setInspected(tool.id)}
                onFocus={() => setInspected(tool.id)}
                onClick={() => onOpenTool(tool.id)}>
                <span className="atelier-tool-count">{String(index + 1).padStart(2, '0')}</span>
                <span className="atelier-tool-symbol"><ToolGlyph tool={tool.id} size={24} /></span>
                <span className="atelier-tool-name">{tool.label}<small>{note.category}</small></span>
                <span className="atelier-tool-arrow" aria-hidden="true">↗</span>
              </button>;
            })}
          </div>
          <div className="atelier-collection-footer"><span>Designed for focused work, not distractions.</span><span>THE FORGE / 2026</span></div>
        </div>
      </div>
    </div>
  </section>;
}
