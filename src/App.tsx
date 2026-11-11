import { useCallback, useEffect, useRef, useState } from 'react';
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
import './precision-studio.css';

type Route = ToolId | 'home';

function initialTool(): Route {
  const saved = window.location.hash.replace(/^#\/?/, '');
  return saved === 'home' ? 'home' : isToolId(saved) ? saved : 'home';
}

export default function App() {
  const [activeTool, setActiveTool] = useState<Route>(initialTool);
  const storyboardRef = useRef<StoryboardRef>(null);

  const openTool = useCallback((tool: Route) => {
    if (tool !== 'home' && !isToolId(tool)) return;
    setActiveTool(tool);
    if (window.location.hash !== '#/' + tool) history.replaceState(null, '', '#/' + tool);
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
    <div className={isLogo ? 'forge-app forge-v5-shell' : 'forge-app forge-collection-shell'}>

      <main className="main-area">
        <header className="topbar">{isLogo ? (
          <>
            <strong className="forge-v5-wordmark">THE <span>F</span>ORGE</strong>
            <span className="forge-v5-top-center">TOOL / LOGO RESIZER</span>
            <span className="forge-v5-top-end"><i aria-hidden="true" /> ALL PROCESSING STAYS IN YOUR BROWSER</span>
          </>
        ) : <>
          <strong className="forge-collection-wordmark">THE <span>F</span>ORGE</strong>
          <span className="forge-collection-top-path">{isHome ? 'WORKROOM / OVERVIEW' : 'TOOL / ' + (current?.label.toUpperCase() ?? '')}</span>
          <span className="forge-collection-top-status"><i aria-hidden="true" /> LOCAL PROCESSING</span>
        </>}</header>

        {!isHome && !isLogo && current && <div className="forge-suite-context">
          <span className="forge-suite-glyph"><ToolGlyph tool={current.id} size={28}/></span>
          <div className="forge-suite-headline">
            <span className="forge-suite-label">{toolDetails[current.id].category}</span>
            <h1>{current.label}</h1>
            <p>{toolDetails[current.id].description}</p>
          </div>
          <span className="forge-suite-detail">{toolDetails[current.id].detail}</span>
        </div>}

        <div className="native-tool" hidden={!isHome}><ForgeHome onOpenTool={openTool}/></div>
        <div className="native-tool" hidden={activeTool !== 'link-generator'}><LinkGenerator /></div>
        <div className="native-tool" hidden={!isLogo}><LogoResizer /></div>
        <div className="native-tool" hidden={activeTool !== 'image-splitter'}><ImageSplitter /></div>
        <div className="native-tool" hidden={activeTool !== 'pdf-to-image'}><PdfToImage /></div>
        <div className="native-tool" hidden={activeTool !== 'video-stills'}><VideoStills onTransfer={handleStillsTransfer} /></div>
        <div className="native-tool" hidden={activeTool !== 'storyboard'}><Storyboard ref={storyboardRef} /></div>
        <div className="native-tool" hidden={activeTool !== 'ad-downloader'}><AdDownloader /></div>
      </main>
      <aside className="sidebar" aria-label="Tools">
        <div className="brand">
          {isLogo
            ? <span className="forge-v5-f">F</span>
            : <button type="button" className="forge-collection-brand" onClick={() => openTool('home')} aria-label="The Forge home">F<span>.</span></button>}
        </div>
        <nav className="tool-nav" aria-label="Select a tool">
          <button className={'tool-link forge-home-nav' + (isHome ? ' is-active' : '')}
            type="button" aria-current={isHome ? 'page' : undefined}
            aria-label="Home" title="Home" onClick={() => openTool('home')}>
            <span className={isLogo ? 'forge-v5-rail-glyph' : 'forge-collection-rail-icon'}><ToolGlyph tool="home" /></span>
          </button>
          {tools.map(tool => (
            <button
              className={'tool-link' + (activeTool === tool.id ? ' is-active' : '')}
              type="button"
              key={tool.id}
              aria-current={activeTool === tool.id ? 'page' : undefined}
              aria-label={tool.label}
              title={tool.label}
              onClick={() => { if (tool.id === 'storyboard') storyboardRef.current?.openMode('story'); openTool(tool.id); }}
            ><span className={isLogo ? 'forge-v5-rail-glyph' : 'forge-collection-rail-icon'}><ToolGlyph tool={tool.id} /></span></button>
          ))}
        </nav>
      </aside>
    </div>
  );
}
