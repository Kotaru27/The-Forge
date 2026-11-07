import type { ReactNode } from 'react';
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
  const featured = toolNotes['logo-resizer'];
  const otherTools = tools.filter(tool => tool.id !== 'logo-resizer');
  return <section className="forge-home" aria-label="The Forge home">
    <div className="forge-home-inner">
      <header className="forge-home-intro">
        <div className="forge-home-intro-copy">
          <p className="forge-home-overline"><span className="forge-home-live" /> YOUR CREATIVE WORKROOM</p>
          <h1>Make the work.<br /><span>Keep the control.</span></h1>
          <p className="forge-home-subtitle">Seven focused tools for preparing, reviewing and delivering media. No account, no upload to a server; processing stays in your browser.</p>
        </div>
        <div className="forge-home-intro-mark" aria-hidden="true"><span>F</span><small>THE FORGE</small></div>
      </header>

      <div className="forge-home-section-title">
        <div><h2>Choose your workbench</h2><p>Open a tool to start. Each workspace keeps its own controls and results.</p></div>
        <span className="forge-home-count">07 / WORKBENCHES</span>
      </div>

      <div className="forge-home-grid">
        <button type="button" className="forge-home-card forge-home-card-feature"
          onClick={() => onOpenTool('logo-resizer')} aria-label="Open Logo Resizer">
          <div className="forge-home-card-top"><span className="forge-home-category">{featured.category}</span><span className="forge-home-open">↗</span></div>
          <div className="forge-home-feature-copy">
            <div className="forge-home-feature-icon"><ToolGlyph tool="logo-resizer" size={24}/></div>
            <h3>Logo Resizer</h3>
            <p>{featured.description}</p>
          </div>
          <div className="forge-home-feature-art" aria-hidden="true">
            <div className="forge-home-art-grid" />
            <div className="forge-home-art-tile"><span className="forge-home-art-f">F<span>.</span></span></div>
            <div className="forge-home-art-tag">200 × 200 <span>PNG</span></div>
          </div>
          <span className="forge-home-card-foot"><span>{featured.detail}</span><strong>Open tool <span aria-hidden="true">→</span></strong></span>
        </button>
        {otherTools.map((tool, index) => {
          const note = toolNotes[tool.id];
          return <button type="button" className="forge-home-card forge-home-card-small"
            data-workbench={tool.id} onClick={() => onOpenTool(tool.id)} key={tool.id}
            aria-label={`Open ${tool.label}`}>
            <span className="forge-home-card-top"><span className="forge-home-category">{note.category}</span><span className="forge-home-open">↗</span></span>
            <span className="forge-home-small-icon"><ToolGlyph tool={tool.id} size={25}/></span>
            <span className="forge-home-small-content">
              <strong>{tool.label}</strong>
              <span>{note.description}</span>
            </span>
            <span className="forge-home-card-foot"><span>{note.detail}</span><strong>{String(index + 2).padStart(2, '0')}</strong></span>
          </button>;
        })}
      </div>
      <footer className="forge-home-footer"><span>THE FORGE</span><span>Made for the work between ideas and delivery.</span><span>LOCAL-FIRST / 2026</span></footer>
    </div>
  </section>;
}
