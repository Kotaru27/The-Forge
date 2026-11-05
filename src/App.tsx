import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoStills } from './tools/video-stills/VideoStills';
import { Storyboard } from './tools/storyboard/Storyboard';
import type { StoryboardRef } from './tools/storyboard/engine';
import type { TransferDestination, TransferGroup, TransferResult } from './tools/video-stills/engine';
import { LegacyWorkspace } from './components/LegacyWorkspace';
import { LinkGenerator } from './tools/link-generator/LinkGenerator';
import { LogoResizer } from './tools/logo-resizer/LogoResizer';
import { ImageSplitter } from './tools/image-splitter/ImageSplitter';
import { PdfToImage } from './tools/pdf-to-image/PdfToImage';
import { AdDownloader } from './tools/ad-downloader/AdDownloader';
import { defaultTool, isToolId, tools, usesLegacyWorkspace, type ToolId } from './tools';

function initialTool(): ToolId {
  const saved = window.location.hash.replace(/^#\/?/, '');
  return isToolId(saved) ? saved : defaultTool;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>(initialTool);
  const [storyboardMode, setStoryboardMode] = useState<'story' | 'filmstrip'>('story');
  const storyboardRef = useRef<StoryboardRef>(null);

  const openTool = useCallback((tool: ToolId) => {
    setActiveTool(tool);
    if (window.location.hash !== `#/${tool}`) history.replaceState(null, '', `#/${tool}`);
  }, []);

  useEffect(() => {
    function onHashChange() { openTool(initialTool()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [openTool]);

  const handleStillsTransfer = useCallback(async (destination: TransferDestination, groups: TransferGroup[]): Promise<TransferResult> => {
    if (!storyboardRef.current) throw Error('Storyboard is not ready.');
    const result = await storyboardRef.current.importStills(destination, groups);
    if (result.imported) {
      setStoryboardMode(destination === 'filmstrip' ? 'filmstrip' : 'story');
      openTool('storyboard');
    }
    return result;
  }, [openTool]);

  const current = tools.find(tool => tool.id === activeTool) ?? tools[0];
  const legacyActive = usesLegacyWorkspace(activeTool);

  return (
    <div className="forge-app">
      <aside className="sidebar" aria-label="Tools">
        <div className="brand">THE FORGE</div>
        <nav className="tool-nav" aria-label="Select a tool">
          {tools.map(tool => (
            <button
              className={`tool-link${activeTool === tool.id ? ' is-active' : ''}`}
              type="button"
              key={tool.id}
              aria-current={activeTool === tool.id ? 'page' : undefined}
              onClick={() => { if (tool.id === 'storyboard') setStoryboardMode('story'); openTool(tool.id); }}
            >{tool.label}</button>
          ))}
        </nav>
      </aside>
      <main className="main-area">
        <header className="topbar"><h1>{current.label}</h1></header>
        {activeTool === 'link-generator' && <LinkGenerator />}
        <div className="native-tool" hidden={activeTool !== 'logo-resizer'}><LogoResizer /></div>
        <div className="native-tool" hidden={activeTool !== 'image-splitter'}><ImageSplitter /></div>
        <div className="native-tool" hidden={activeTool !== 'pdf-to-image'}><PdfToImage /></div>
        <div className="native-tool" hidden={activeTool !== 'video-stills'}><VideoStills onTransfer={handleStillsTransfer} /></div>
        <div className="native-tool" hidden={activeTool !== 'storyboard'}><Storyboard ref={storyboardRef} preferredMode={storyboardMode} /></div>
        <div className="native-tool" hidden={activeTool !== 'ad-downloader'}><AdDownloader /></div>
        <div className="legacy-container" hidden={!legacyActive}>
          <LegacyWorkspace storyboardMode={storyboardMode} toolId={legacyActive ? activeTool : 'video-compressor'} onToolChange={tool => {
            if (legacyActive) openTool(tool);
          }} />
        </div>
      </main>
    </div>
  );
}
