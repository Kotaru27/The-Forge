import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { VideoStills } from './tools/video-stills/VideoStills';
import { Storyboard } from './tools/storyboard/Storyboard';
import type { StoryboardRef } from './tools/storyboard/engine';
import type { TransferGroup, TransferResult } from './tools/video-stills/engine';
import { LinkGenerator } from './tools/link-generator/LinkGenerator';
import { LogoResizer } from './tools/logo-resizer/LogoResizer';
import { ImageSplitter } from './tools/image-splitter/ImageSplitter';
import { ForgeHome, ToolGlyph } from './home/ForgeHome';
import { isToolId, tools, type ToolId } from './tools';

// Preserve the mounted workrooms and their local state during route changes.
const StableForgeHome = memo(ForgeHome);
const StableLinkGenerator = memo(LinkGenerator);
const StableLogoResizer = memo(LogoResizer);
const StableImageSplitter = memo(ImageSplitter);
const StablePdfToImage = lazy(() => import('./tools/pdf-to-image/PdfToImage')
  .then(module => ({ default: memo(module.PdfToImage) })));
const StableVideoStills = memo(VideoStills);
const StableStoryboard = memo(Storyboard);
const StableAdDownloader = lazy(() => import('./tools/ad-downloader/AdDownloader')
  .then(module => ({ default: memo(module.AdDownloader) })));

type Route = ToolId | 'home';

function routeFromHash(): Route {
  const saved = window.location.hash.replace(/^#\/?/, '');
  return saved === 'home' ? 'home' : isToolId(saved) ? saved : 'home';
}

export default function App() {
  // Fresh page loads still open Home; same-document switching is immediate.
  const [activeTool, setActiveTool] = useState<Route>('home');
  // Heavy PDF and Excel engines load on first use, then remain mounted with state intact.
  const [visited, setVisited] = useState<ReadonlySet<ToolId>>(() => new Set());
  const storyboardRef = useRef<StoryboardRef>(null);

  const openTool = useCallback((tool: Route) => {
    if (tool !== 'home' && !isToolId(tool)) return;
    setActiveTool(tool);
    if (tool !== 'home' && (tool === 'pdf-to-image' || tool === 'ad-downloader')) {
      setVisited(previous => previous.has(tool)
        ? previous : new Set([...previous, tool]));
    }
    if (window.location.hash !== '#/' + tool) {
      history.replaceState(null, '', '#/' + tool);
    }
  }, []);

  useEffect(() => {
    openTool('home');
    const onHashChange = () => openTool(routeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [openTool]);

  const handleStillsTransfer = useCallback(
    async (groups: TransferGroup[]): Promise<TransferResult> => {
      if (!storyboardRef.current) throw Error('Storyboard is not ready.');
      const result = await storyboardRef.current.importStills(groups);
      if (result.imported) openTool('storyboard');
      return result;
    },
    [openTool],
  );

  const current = tools.find(tool => tool.id === activeTool);
  const isLogo = activeTool === 'logo-resizer';
  const isHome = activeTool === 'home';

  return (
    <div className={
      (isLogo ? 'forge-app forge-v5-shell' : 'forge-app forge-collection-shell') +
      ' forge-ctk-ui forge-sketch-ui forge-amoled-ui' +
      (isHome ? ' forge-ctk-home-route forge-sketch-home-route' : '')
    }>
      <div className="sketch-notebook-frame">
        {!isHome && (
          <div className="sketch-sidebar-rail">
            <aside className="sidebar sketch-sidebar" aria-label="Workspace navigation">
              <div className="brand sketch-brand">
                <button type="button" className="sketch-brand-btn"
                  onClick={() => openTool('home')} aria-label="The Forge home" title="The Forge home">
                  <strong className="forge-minimal-mark">F</strong>
                  <span className="sketch-brand-word">THE FORGE</span>
                </button>
              </div>
              <nav className="tool-nav sketch-nav" aria-label="Select a tool">
                <button type="button" className="sketch-nav-link"
                  onClick={() => openTool('home')} aria-label="Home" title="Home">
                  <span className="sketch-nav-icon" aria-hidden="true">
                    <ToolGlyph tool="home" size={20}/>
                  </span>
                  <span className="sketch-nav-label">Home</span>
                </button>
                <div className="sketch-tool-sublist" role="group" aria-label="Creative tools">
                  {tools.map(tool => (
                    <button key={tool.id} type="button"
                      className={'sketch-subtool-link' + (activeTool === tool.id ? ' is-active' : '')}
                      aria-current={activeTool === tool.id ? 'page' : undefined}
                      aria-label={tool.label} title={tool.label}
                      onClick={() => {
                        if (tool.id === 'storyboard') storyboardRef.current?.openMode('story');
                        openTool(tool.id);
                      }}>
                      <span className="sketch-subtool-icon" aria-hidden="true">
                        <ToolGlyph tool={tool.id} size={19}/>
                      </span>
                      <span className="sketch-subtool-label">{tool.label}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </aside>
          </div>
        )}

        <main className="main-area sketch-main-area">
          {!isHome && current && (
            <header className="topbar sketch-topbar">
              <div className="forge-ctk-top-leading">
                <span className="forge-ctk-header-icon" aria-hidden="true">
                  <ToolGlyph tool={current.id} size={19}/>
                </span>
              </div>
              <h1 className="forge-ctk-tool-name">{current.label}</h1>
              <span className="forge-ctk-top-privacy">LOCAL PROCESSING</span>
            </header>
          )}

          <div className="native-tool" hidden={!isHome}>
            <StableForgeHome onOpenTool={openTool}/>
          </div>
          <div className="native-tool" hidden={activeTool !== 'link-generator'}>
            <StableLinkGenerator/>
          </div>
          <div className="native-tool" hidden={!isLogo}>
            <StableLogoResizer/>
          </div>
          <div className="native-tool" hidden={activeTool !== 'image-splitter'}>
            <StableImageSplitter/>
          </div>
          <div className="native-tool" hidden={activeTool !== 'pdf-to-image'}>
            {visited.has('pdf-to-image') && (
              <Suspense fallback={<div className="forge-workroom-loading" role="status">Opening PDF to Image…</div>}>
                <StablePdfToImage/>
              </Suspense>
            )}
          </div>
          <div className="native-tool" hidden={activeTool !== 'video-stills'}>
            <StableVideoStills onTransfer={handleStillsTransfer}/>
          </div>
          <div className="native-tool" hidden={activeTool !== 'storyboard'}>
            <StableStoryboard ref={storyboardRef}/>
          </div>
          <div className="native-tool" hidden={activeTool !== 'ad-downloader'}>
            {visited.has('ad-downloader') && (
              <Suspense fallback={<div className="forge-workroom-loading" role="status">Opening Ad Downloader…</div>}>
                <StableAdDownloader/>
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
