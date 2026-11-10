import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { VideoStills } from './tools/video-stills/VideoStills';
import { Storyboard } from './tools/storyboard/Storyboard';
import type { StoryboardRef } from './tools/storyboard/engine';
import type { TransferGroup, TransferResult } from './tools/video-stills/engine';
import { LinkGenerator } from './tools/link-generator/LinkGenerator';
import { LogoResizer } from './tools/logo-resizer/LogoResizer';
import { ImageSplitter } from './tools/image-splitter/ImageSplitter';
import { PdfToImage } from './tools/pdf-to-image/PdfToImage';
import { AdDownloader } from './tools/ad-downloader/AdDownloader';
import { ForgeHome, ToolGlyph, toolDetails } from './home/ForgeHome';
import { isToolId, tools, type ToolId } from './tools';
import './workroom-system.css';
import './studio-motion.css';
import './studio-workrooms.css';

type Route = ToolId | 'home';

function initialTool(): Route {
  const saved = window.location.hash.replace(/^#\/?/, '');
  return saved === 'home' ? 'home' : isToolId(saved) ? saved : 'home';
}

export default function App() {
  const [activeTool, setActiveTool] = useState<Route>(initialTool);
  const storyboardRef = useRef<StoryboardRef>(null);
  const activeRouteRef = useRef<Route>(activeTool);
  const [transitionTool, setTransitionTool] = useState<ToolId | null>(null);

  // A native, progressive-enhancement shared transition; no processing state is unmounted.
  const openTool = useCallback((tool: Route) => {
    if (tool !== 'home' && !isToolId(tool)) return;
    const previous = activeRouteRef.current;
    const commit = () => {
      flushSync(() => setActiveTool(tool));
      activeRouteRef.current = tool;
      if (window.location.hash !== '#/' + tool) history.replaceState(null, '', '#/' + tool);
    };
    if (previous === tool) {
      if (window.location.hash !== '#/' + tool) history.replaceState(null, '', '#/' + tool);
      return;
    }

    const selected = tool === 'home' ? (previous === 'home' ? null : previous) : tool;
    // Mark only the originating Home row, so title/icon can travel to the header.
    flushSync(() => setTransitionTool(selected));
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && doc.startViewTransition) {
      const transition = doc.startViewTransition(() => commit());
      // Interrupting a transition can reject ready even if finished resolves.
      // Both promises must be observed to avoid noisy unhandled rejections.
      void transition.ready.catch(() => {});
      void transition.finished.catch(() => {});
    } else {
      commit();
    }
  }, []);

  useEffect(() => {
    openTool(initialTool());
    function onHashChange() { openTool(initialTool()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [openTool]);

  const handleStillsTransfer = useCallback(async (groups: TransferGroup[]): Promise<TransferResult> => {
    if (!storyboardRef.current) throw Error('Storyboard is not ready.');
    const result = await storyboardRef.current.importStills(groups);
    if (result.imported) openTool('storyboard');
    return result;
  }, [openTool]);

  const current = tools.find(tool => tool.id === activeTool);
  const isLogo = activeTool === 'logo-resizer';
  const isHome = activeTool === 'home';

  return (
    <div className={isLogo ? 'forge-app forge-v5-shell forge-studio-shell' : 'forge-app forge-collection-shell forge-studio-shell'}>
      <main className="main-area">
        <header className="topbar forge-studio-topbar">
          <button className="forge-studio-brand" type="button" onClick={() => openTool('home')} aria-label="The Forge home">
            <span className="forge-studio-brand-f" aria-hidden="true">F</span><span>THE FORGE</span>
          </button>
          <span className="forge-studio-separator" aria-hidden="true" />
          <div className="forge-studio-current" aria-live="polite">
            {current ? <>
              <span className="forge-studio-current-glyph" style={{ viewTransitionName: 'forge-selected-icon' }}>
                <ToolGlyph tool={current.id} size={21} />
              </span>
              <strong style={{ viewTransitionName: 'forge-selected-title' }}>{current.label}</strong>
            </> : <strong className="forge-studio-index-label">Workspaces</strong>}
          </div>
          <nav className="tool-nav forge-studio-tool-switcher" aria-label="Select a tool">
            <button className={'tool-link forge-home-nav' + (isHome ? ' is-active' : '')}
              type="button" aria-current={isHome ? 'page' : undefined}
              aria-label="Home" title="Home" onClick={() => openTool('home')}>
              <ToolGlyph tool="home" size={21} />
            </button>
            {tools.map(tool => (
              <button className={'tool-link' + (activeTool === tool.id ? ' is-active' : '')}
                type="button" key={tool.id}
                aria-current={activeTool === tool.id ? 'page' : undefined}
                aria-label={tool.label} title={tool.label}
                onClick={() => { if (tool.id === 'storyboard') storyboardRef.current?.openMode('story'); openTool(tool.id); }}>
                <ToolGlyph tool={tool.id} size={21} />
              </button>
            ))}
          </nav>
          <span className="forge-studio-local-status"><span aria-hidden="true" />LOCAL PROCESSING</span>
        </header>

        {!isHome && !isLogo && current && <div className="forge-suite-context">
          <span className="forge-suite-glyph"><ToolGlyph tool={current.id} size={28}/></span>
          <div className="forge-suite-headline">
            <span className="forge-suite-label">{toolDetails[current.id].category}</span>
            <h1>{current.label}</h1>
            <p>{toolDetails[current.id].description}</p>
          </div>
          <span className="forge-suite-detail">{toolDetails[current.id].detail}</span>
        </div>}

        <div className="native-tool" hidden={!isHome}><ForgeHome onOpenTool={openTool} transitionTarget={transitionTool}/></div>
        <div className="native-tool" hidden={activeTool !== 'link-generator'}><LinkGenerator /></div>
        <div className="native-tool" hidden={!isLogo}><LogoResizer /></div>
        <div className="native-tool" hidden={activeTool !== 'image-splitter'}><ImageSplitter /></div>
        <div className="native-tool" hidden={activeTool !== 'pdf-to-image'}><PdfToImage /></div>
        <div className="native-tool" hidden={activeTool !== 'video-stills'}><VideoStills onTransfer={handleStillsTransfer} /></div>
        <div className="native-tool" hidden={activeTool !== 'storyboard'}><Storyboard ref={storyboardRef} /></div>
        <div className="native-tool" hidden={activeTool !== 'ad-downloader'}><AdDownloader /></div>
      </main>
    </div>
  );
}
