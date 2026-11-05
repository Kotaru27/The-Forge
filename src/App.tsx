import { useCallback, useEffect, useState } from 'react';
import { LegacyWorkspace } from './components/LegacyWorkspace';
import { LinkGenerator } from './tools/link-generator/LinkGenerator';
import { LogoResizer } from './tools/logo-resizer/LogoResizer';
import { ImageSplitter } from './tools/image-splitter/ImageSplitter';
import { PdfToImage } from './tools/pdf-to-image/PdfToImage';
import { defaultTool, isToolId, tools, type ToolId } from './tools';

function initialTool(): ToolId {
  const saved = window.location.hash.replace(/^#\/?/, '');
  return isToolId(saved) ? saved : defaultTool;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>(initialTool);

  const openTool = useCallback((tool: ToolId) => {
    setActiveTool(tool);
    if (window.location.hash !== `#/${tool}`) history.replaceState(null, '', `#/${tool}`);
  }, []);

  useEffect(() => {
    function onHashChange() { openTool(initialTool()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [openTool]);

  const current = tools.find(tool => tool.id === activeTool) ?? tools[0];

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
              onClick={() => openTool(tool.id)}
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
        <div className="legacy-container" hidden={activeTool === 'link-generator' || activeTool === 'logo-resizer' || activeTool === 'image-splitter' || activeTool === 'pdf-to-image'}>
          <LegacyWorkspace toolId={activeTool === 'link-generator' || activeTool === 'logo-resizer' || activeTool === 'image-splitter' || activeTool === 'pdf-to-image' ? 'video-stills' : activeTool} onToolChange={tool => {
            if (activeTool !== 'link-generator' && activeTool !== 'logo-resizer' && activeTool !== 'image-splitter' && activeTool !== 'pdf-to-image') openTool(tool);
          }} />
        </div>
      </main>
    </div>
  );
}
