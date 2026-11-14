import type { ToolId } from '../tools';

/** CTK's individual workbench illustrations recreated as static native React markup. */
export function CTKCardArt({ tool }: { tool: ToolId }) {
  switch (tool) {
    case 'logo-resizer':
      return <span className="ctk-art ctk-art-logo">
        <span className="ctk-art-paper ctk-art-paper-back"><small>64</small><LogoMark /></span>
        <span className="ctk-art-paper ctk-art-paper-front"><small>512 × 512</small><LogoMark /></span>
        <span className="ctk-art-paper ctk-art-paper-small"><LogoMark /></span>
      </span>;
    case 'pdf-to-image':
      return <span className="ctk-art ctk-art-pdf">
        <span className="ctk-art-pdf-page"><strong>PDF</strong><i /><i /><i /></span>
        <span className="ctk-art-pdf-arrow">→</span>
        <span className="ctk-art-pdf-image"><span className="ctk-art-landscape" /><small>PNG</small></span>
      </span>;
    case 'image-splitter':
      return <span className="ctk-art ctk-art-split">
        <span className="ctk-art-split-landscape"><i /><b /><em /></span>
        <span className="ctk-art-split-lines" />
        <small>3 × 3</small>
      </span>;
    case 'video-stills':
      return <span className="ctk-art ctk-art-stills">
        <span className="ctk-art-film-perfs" />
        <span className="ctk-art-film-frames">
          <i /><i /><i /><i />
        </span>
        <span className="ctk-art-film-perfs" />
        <span className="ctk-art-film-playhead" />
      </span>;
    case 'storyboard':
      return <span className="ctk-art ctk-art-storyboard">
        <span className="ctk-art-story-paper">
          <span className="ctk-art-story-lines"><i /><i /></span>
          <span className="ctk-art-story-frames"><i /><i /><i /></span>
          <span className="ctk-art-story-lines ctk-art-story-bottom"><i /><i /></span>
        </span>
        <small>03 / 03</small>
      </span>;
    case 'link-generator':
      return <span className="ctk-art ctk-art-links">
        <span className="ctk-art-link-url"><em>https://</em><strong>campaign</strong><span>/asset</span><i /></span>
        <span className="ctk-art-link-fork"><i /><i /><i /></span>
        <span className="ctk-art-link-tags"><small>01</small><small>02</small><small>03</small></span>
      </span>;
    case 'ad-downloader':
      return <span className="ctk-art ctk-art-ads">
        <span className="ctk-art-ads-sheet">
          <span className="ctk-art-ads-header">ASSET LIST <b>XLSX</b></span>
          <span className="ctk-art-ads-rows">
            <span><small>01</small><i /><b /></span>
            <span><small>02</small><i /><b /></span>
            <span><small>03</small><i /><b /></span>
          </span>
        </span>
        <span className="ctk-art-ads-arrow">↓</span>
      </span>;
  }
}

function LogoMark() {
  return <svg viewBox="0 0 80 80" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M40 12 65 26v28L40 68 15 54V26Z" />
    <path d="M40 12v56M15 26l50 28M65 26 15 54" />
  </svg>;
}
