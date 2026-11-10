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

type Props = { onOpenTool: (tool: ToolId) => void; transitionTarget?: ToolId | null };

export function ForgeHome({ onOpenTool, transitionTarget }: Props) {
  return (
    <section className="forge-home forge-studio-home" aria-label="The Forge home">
      <div className="forge-studio-home-inner">
        <div className="forge-studio-hero">
          <div className="forge-studio-hero-mark" aria-hidden="true">
            <svg viewBox="0 0 120 152" fill="none">
              <path className="forge-studio-f-stroke" d="M25 132V20H104M25 73H86" stroke="currentColor" strokeWidth="14" strokeLinejoin="miter" strokeLinecap="square"/>
            </svg>
          </div>
          <div className="forge-studio-hero-content">
            <div className="forge-studio-eyebrow">DESKTOP CREATIVE WORKSPACE</div>
            <h1><span className="forge-studio-word-reveal">THE FORGE</span></h1>
            <p>Seven precise tools for preparing, composing and delivering your work. Everything stays in your browser.</p>
          </div>
          <span className="forge-studio-hero-number" aria-hidden="true">F / 07</span>
        </div>
        <div className="forge-studio-index-heading"><h2>Choose a workspace</h2><span>07 TOOLS</span></div>
        <div className="forge-studio-index">
          {tools.map((tool, index) => {
            const note = toolNotes[tool.id];
            const shared = transitionTarget === tool.id;
            return (
              <button type="button" className="forge-home-card forge-studio-index-entry"
                key={tool.id} onClick={() => onOpenTool(tool.id)}
                aria-label={`Open ${tool.label}`}>
                <span className="forge-studio-index-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="forge-studio-index-icon" style={shared ? { viewTransitionName: 'forge-selected-icon' } : undefined}>
                  <ToolGlyph tool={tool.id} size={26}/>
                </span>
                <span className="forge-studio-index-copy">
                  <strong style={shared ? { viewTransitionName: 'forge-selected-title' } : undefined}>{tool.label}</strong>
                  <span>{note.description}</span>
                </span>
                <span className="forge-studio-index-arrow" aria-hidden="true">↗</span>
              </button>
            );
          })}
        </div>
        <footer className="forge-studio-home-foot"><span>THE FORGE</span><span>Made for the work between ideas and delivery.</span><span>LOCAL FIRST</span></footer>
      </div>
    </section>
  );
}
