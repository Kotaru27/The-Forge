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
import { ForgeHome, ToolGlyph } from './home/ForgeHome';
import { ForgeSketchIntro } from './intro/ForgeSketchIntro';
import {
  AnvilMark,
  MountainDoodle,
  SketchDividerLine,
  SketchPageFrameBorder,
  SketchSpiralRingSvg,
  SketchSvgDefs,
  SketchVerticalDivider,
} from './home/SketchIllustrations';
import { isToolId, tools, type ToolId } from './tools';
import './workroom-system.css';

type Route = ToolId | 'home';
type IntroPhase = 'pending' | 'handoff' | 'finishing' | 'settled';

// First root visit sketches once per tab; deep links are never delayed.
const INTRO_SESSION_KEY = 'forge-pencil-intro-played-v2';
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
function initialIntroPhase(): IntroPhase {
  if (window.location.hash || reducedMotion()) return 'settled';
  try { return sessionStorage.getItem(INTRO_SESSION_KEY) ? 'settled' : 'pending'; }
  catch { return 'pending'; }
}

function initialTool(): Route {
  const saved = window.location.hash.replace(/^#\/?/, '');
  return saved === 'home' ? 'home' : isToolId(saved) ? saved : 'home';
}

export default function App() {
  const [activeTool, setActiveTool] = useState<Route>(initialTool);
  const storyboardRef = useRef<StoryboardRef>(null);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(initialIntroPhase);
  const [introRun, setIntroRun] = useState(0);
  const finishIntro = useCallback(() => {
    try { sessionStorage.setItem(INTRO_SESSION_KEY, '1'); } catch { /* Storage is optional. */ }
    // Only a completed handoff may finish writing. Skip and direct routes
    // always show the fully drawn interface without animation.
    setIntroPhase(phase => phase === 'handoff' ? 'finishing' : 'settled');
  }, []);
  const skipIntro = useCallback(() => {
    try { sessionStorage.setItem(INTRO_SESSION_KEY, '1'); } catch { /* Storage is optional. */ }
    setIntroPhase('settled');
  }, []);
  const handoffIntro = useCallback(() => setIntroPhase('handoff'), []);
  const replayIntro = useCallback(() => {
    if (reducedMotion()) return;
    setIntroRun(previous => previous + 1);
    setIntroPhase('pending');
  }, []);

  useEffect(() => {
    if (introPhase !== 'finishing') return;
    // Allow the longest Home description to finish handwriting once.
    // This timer does not run while working in any tool or revisiting Home.
    const timeout = window.setTimeout(() => setIntroPhase('settled'), 2200);
    return () => window.clearTimeout(timeout);
  }, [introPhase]);

  const openTool = useCallback((tool: Route) => {
    if (tool !== 'home' && !isToolId(tool)) return;
    setActiveTool(tool);
    if (tool !== 'home') setIntroPhase('settled');
    if (window.location.hash !== '#/' + tool) history.replaceState(null, '', '#/' + tool);
  }, []);

  useEffect(() => {
    openTool(initialTool());
    function onHashChange() { openTool(initialTool()); }
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

  const current = tools.find((tool) => tool.id === activeTool);
  const isLogo = activeTool === 'logo-resizer';
  const isHome = activeTool === 'home';

  return (
    <div
      className={
        (isLogo ? 'forge-app forge-v5-shell' : 'forge-app forge-collection-shell') +
        ' forge-ctk-ui forge-sketch-ui' +
        (isHome ? ' forge-ctk-home-route forge-sketch-home-route' : '') +
        (isHome && introPhase === 'pending' ? ' forge-intro-before-home' : '') +
        (isHome && introPhase === 'handoff' ? ' forge-intro-handoff' : '') +
        (isHome && introPhase === 'finishing' ? ' forge-home-finishing' : '') +
        (isHome && introPhase === 'settled' ? ' forge-home-resting' : '')
      }
    >
      <SketchSvgDefs />
      <div className="sketch-notebook-frame">
        <SketchPageFrameBorder />
        <span className="sketch-spiral-margin" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, idx) => (
            <SketchSpiralRingSvg key={idx} />
          ))}
        </span>

        {!isHome && (
          <aside className="sidebar sketch-sidebar" aria-label="Workspace navigation">
            <SketchVerticalDivider />
            <div className="brand sketch-brand">
              <button
                type="button"
                className="sketch-brand-btn"
                onClick={() => openTool('home')}
                aria-label="The Forge home"
                title="The Forge home"
              >
                <AnvilMark size={50} />
                <span className="sketch-brand-word">{"THE FORGE"}</span>
              </button>
            </div>
            <SketchDividerLine compact />

            <nav className="tool-nav sketch-nav" aria-label="Select a tool">
              <button
                type="button"
                className="sketch-nav-link"
                onClick={() => openTool('home')}
                aria-label="Home"
                title="Home"
              >
                <span className="sketch-nav-icon" aria-hidden="true">
                  <ToolGlyph tool="home" size={20} />
                </span>
                <span className="sketch-nav-label">{"Home"}</span>
              </button>

              <div className="sketch-tool-sublist" role="group" aria-label="Creative tools">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={'sketch-subtool-link' + (activeTool === tool.id ? ' is-active' : '')}
                    aria-current={activeTool === tool.id ? 'page' : undefined}
                    aria-label={tool.label}
                    title={tool.label}
                    onClick={() => {
                      if (tool.id === 'storyboard') storyboardRef.current?.openMode('story');
                      openTool(tool.id);
                    }}
                  >
                    <span className="sketch-subtool-icon" aria-hidden="true">
                      <ToolGlyph tool={tool.id} size={19} />
                    </span>
                    <span className="sketch-subtool-label">{tool.label}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="sketch-sidebar-footer">
              <SketchDividerLine compact />
              <div className="sketch-sidebar-doodle" aria-hidden="true">
                <MountainDoodle />
              </div>
              <p className="sketch-sidebar-tagline">
                One place
                <br />
                for your
                <br />
                creative tools.
              </p>
            </div>
          </aside>
        )}

        <main className="main-area sketch-main-area">
          {!isHome && current && (
            <header className="topbar sketch-topbar">
              <div className="forge-ctk-top-leading">
                <span className="forge-ctk-header-icon" aria-hidden="true">
                  <ToolGlyph tool={current.id} size={19} />
                </span>
              </div>
              <h1 className="forge-ctk-tool-name">
                <span key={current.id} className="sketch-highlight-mark">{current.label}</span>
              </h1>
              <span className="forge-ctk-top-privacy">{"LOCAL PROCESSING"}</span>
              <span className="sketch-topbar-seam" aria-hidden="true">
                <SketchDividerLine />
              </span>
            </header>
          )}

          <div className="native-tool" hidden={!isHome}>
            <ForgeHome
              onOpenTool={openTool}
              onReplayIntro={replayIntro}
              animateWriting={isHome && (introPhase === 'handoff' || introPhase === 'finishing')}
            />
          </div>
          <div className="native-tool" hidden={activeTool !== 'link-generator'}>
            <LinkGenerator />
          </div>
          <div className="native-tool" hidden={!isLogo}>
            <LogoResizer />
          </div>
          <div className="native-tool" hidden={activeTool !== 'image-splitter'}>
            <ImageSplitter />
          </div>
          <div className="native-tool" hidden={activeTool !== 'pdf-to-image'}>
            <PdfToImage />
          </div>
          <div className="native-tool" hidden={activeTool !== 'video-stills'}>
            <VideoStills onTransfer={handleStillsTransfer} />
          </div>
          <div className="native-tool" hidden={activeTool !== 'storyboard'}>
            <Storyboard ref={storyboardRef} />
          </div>
          <div className="native-tool" hidden={activeTool !== 'ad-downloader'}>
            <AdDownloader />
          </div>
        </main>
      </div>
      {isHome && (introPhase === 'pending' || introPhase === 'handoff') && (
        <ForgeSketchIntro key={introRun} onHandoff={handoffIntro} onFinish={finishIntro} onSkip={skipIntro} />
      )}
    </div>
  );
}
