import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowUpRight, Download, FileImage, Film, Image, LayoutGrid, Link2, Scissors, Video, type LucideIcon } from 'lucide-react';
import { LegacyWorkspace } from './components/LegacyWorkspace';
import { LinkGenerator } from './tools/link-generator/LinkGenerator';
import { defaultTool, isToolId, tools, type ToolId } from './tools';

const toolIcons: Record<ToolId, LucideIcon> = {
  'logo-resizer': Image,
  'pdf-to-image': FileImage,
  'image-splitter': Scissors,
  'video-stills': Film,
  storyboard: LayoutGrid,
  'link-generator': Link2,
  'ad-downloader': Download,
  'video-compressor': Video,
};
const ease = [0.22, 1, 0.36, 1] as const;

function initialTool(): ToolId {
  const saved = window.location.hash.replace(/^#\/?/, '');
  return isToolId(saved) ? saved : defaultTool;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>(initialTool);

  const openTool = useCallback((tool: ToolId) => {
    setActiveTool(tool);
    if (window.location.hash !== '#/' + tool) history.replaceState(null, '', '#/' + tool);
  }, []);

  useEffect(() => {
    function onHashChange() { openTool(initialTool()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [openTool]);

  const current = tools.find(tool => tool.id === activeTool) ?? tools[0];
  const currentIndex = tools.findIndex(tool => tool.id === activeTool) + 1;

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.42, ease }}>
      <div className="forge-app">
        <aside className="sidebar" aria-label="Tools">
          <div className="brand">
            <span className="brand-glyph" aria-hidden="true">F<span className="brand-glyph-dot">.</span></span>
            <div className="brand-wordmark"><strong>THE FORGE</strong><span>CREATIVE WORKSPACE</span></div>
          </div>
          <div className="nav-eyebrow"><span>YOUR TOOLS</span><span>08</span></div>
          <nav className="tool-nav" aria-label="Select a tool">
            {tools.map((tool, index) => {
              const Icon = toolIcons[tool.id];
              const selected = activeTool === tool.id;
              return (
                <motion.button
                  type="button"
                  key={tool.id}
                  className={'tool-link' + (selected ? ' is-active' : '')}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => openTool(tool.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.2, ease }}
                >
                  {selected && <motion.span layoutId="forge-nav-selection" className="tool-link-selection" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                  <Icon size={17} strokeWidth={selected ? 1.9 : 1.55} aria-hidden="true" className="tool-link-icon" />
                  <span className="tool-link-label">{tool.label}</span>
                  <span className="tool-link-number">{String(index + 1).padStart(2, '0')}</span>
                </motion.button>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-footer-label"><span className="status-dot" /> WORKSPACE ACTIVE</div>
            <div className="sidebar-footer-note">Local-first creative utilities. Built for precision.</div>
            <span className="sidebar-footer-version">THE FORGE <span>©</span> 2026</span>
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <div className="topbar-left"><span className="topbar-crumb">THE FORGE</span><span className="crumb-separator">/</span><span>STUDIO</span></div>
            <div className="topbar-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={activeTool} className="topbar-title" initial={{ opacity: 0, y: 9, filter: 'blur(3px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -7, filter: 'blur(3px)' }} transition={{ duration: 0.23, ease }}>
                  <h1>{current.label}</h1>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="topbar-right"><span className="topbar-location">TOOL {String(currentIndex).padStart(2, '0')} / 08</span><span className="topbar-corner" aria-hidden="true"><ArrowUpRight size={15} /></span></div>
          </header>
          {activeTool === 'link-generator' && <LinkGenerator />}
          <div className="legacy-container" hidden={activeTool === 'link-generator'}>
            <LegacyWorkspace
              toolId={activeTool === 'link-generator' ? 'logo-resizer' : activeTool}
              onToolChange={tool => { if (activeTool !== 'link-generator') openTool(tool); }}
            />
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
