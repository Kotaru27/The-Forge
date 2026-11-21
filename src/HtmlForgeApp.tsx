import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AdDownloader } from './tools/ad-downloader/AdDownloader';
import { ImageSplitter } from './tools/image-splitter/ImageSplitter';
import { LinkGenerator } from './tools/link-generator/LinkGenerator';
import { LogoResizer } from './tools/logo-resizer/LogoResizer';
import { PdfToImage } from './tools/pdf-to-image/PdfToImage';
import { Storyboard } from './tools/storyboard/Storyboard';
import type { StoryboardRef } from './tools/storyboard/engine';
import { VideoStills } from './tools/video-stills/VideoStills';
import type { TransferGroup, TransferResult } from './tools/video-stills/engine';
import { tools, isToolId, type ToolId } from './tools';

type Route = ToolId | 'home';
const descriptions: Record<ToolId,string> = {
  'logo-resizer': 'Resize and label images in batches.',
  'pdf-to-image': 'Export selected PDF pages as images.',
  'image-splitter': 'Split artwork into equal columns.',
  'video-stills': 'Extract and select frames from videos.',
  'storyboard': 'Arrange stills into grids and layouts.',
  'link-generator': 'Generate campaign links and code.',
  'ad-downloader': 'Import Excel lists and retrieve assets.',
};
// Preserve all workroom state when switching tools, including the Video Stills
// -> Storyboard transfer. Only the presentation shell differs from The Forge.
const StableLogo = memo(LogoResizer);
const StablePdf = memo(PdfToImage);
const StableSplit = memo(ImageSplitter);
const StableStills = memo(VideoStills);
const StableStoryboard = memo(Storyboard);
const StableLinks = memo(LinkGenerator);
const StableAds = memo(AdDownloader);

export default function HtmlForgeApp() {
  const [active,setActive] = useState<Route>('home');
  const storyboard = useRef<StoryboardRef>(null);
  const open = useCallback((route:Route) => {
    if (route !== 'home' && !isToolId(route)) return;
    setActive(route);
    if (window.location.hash !== '#/' + route) history.replaceState(null,'','#/' + route);
  },[]);
  useEffect(() => {
    // A new document load or refresh opens Home, matching The Forge's route rule.
    const onHashChange = () => {
      const id = location.hash.replace(/^#\/?/,'');
      setActive(isToolId(id) ? id : 'home');
    };
    open('home');
    window.addEventListener('hashchange',onHashChange);
    return () => window.removeEventListener('hashchange',onHashChange);
  },[open]);
  const transfer = useCallback(async (groups:TransferGroup[]):Promise<TransferResult> => {
    if (!storyboard.current) throw Error('Storyboard is not ready.');
    const result=await storyboard.current.importStills(groups);
    if (result.imported) open('storyboard');
    return result;
  },[open]);
  const title = active==='home' ? 'Workspaces' : tools.find(t=>t.id===active)?.label ?? 'Workspaces';
  return <div className="forge-app forge-html-app">
    <aside className="sidebar html-sidebar" aria-label="Workspace navigation">
      <div className="html-brand"><button type="button" onClick={()=>open('home')} aria-label="The Forge home">
        <span className="html-symbol" aria-hidden="true">F</span><span>THE FORGE<small>HTML EDITION</small></span>
      </button></div>
      <div className="html-nav-caption">TOOLS</div>
      <nav className="tool-nav html-tool-nav" aria-label="Select a tool">
        {tools.map((tool,index)=><button type="button" key={tool.id}
          className={'tool-link html-tool-link'+(active===tool.id?' is-active':'')}
          aria-current={active===tool.id?'page':undefined}
          onClick={()=>{if(tool.id==='storyboard')storyboard.current?.openMode('story');open(tool.id);}}>
          <span className="html-tool-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span>{tool.label}</span>
        </button>)}
      </nav>
      <div className="html-sidebar-footer">Seven tools · One local workspace</div>
    </aside>
    <main className="main-area html-main">
      <header className="topbar html-topbar">
        <div><span className="html-eyebrow">THE FORGE / {active==='home'?'HOME':'TOOL'}</span><h1>{title}</h1></div>
        {active !== 'home' && <button type="button" className="html-home-button" onClick={()=>open('home')}>All tools</button>}
      </header>
      <section className="native-tool html-home" hidden={active!=='home'} aria-label="Tool selection">
        <div className="html-home-intro"><span className="html-eyebrow">CREATIVE PRODUCTION</span><h2>Tools, without the overhead.</h2>
          <p>Select a workspace. Existing processing, presets and exports remain available; files are processed locally where supported.</p></div>
        <div className="html-card-grid">{tools.map((tool,index)=><button type="button" key={tool.id} className="html-tool-card" onClick={()=>open(tool.id)}>
          <span className="html-card-index">{String(index+1).padStart(2,'0')} / 07</span>
          <strong>{tool.label}</strong><span>{descriptions[tool.id]}</span>
          <span className="html-card-open" aria-hidden="true">Open →</span>
        </button>)}</div>
      </section>
      <div className="native-tool" hidden={active!=='logo-resizer'}><StableLogo /></div>
      <div className="native-tool" hidden={active!=='pdf-to-image'}><StablePdf /></div>
      <div className="native-tool" hidden={active!=='image-splitter'}><StableSplit /></div>
      <div className="native-tool" hidden={active!=='video-stills'}><StableStills onTransfer={transfer} /></div>
      <div className="native-tool" hidden={active!=='storyboard'}><StableStoryboard ref={storyboard} /></div>
      <div className="native-tool" hidden={active!=='link-generator'}><StableLinks /></div>
      <div className="native-tool" hidden={active!=='ad-downloader'}><StableAds /></div>
    </main>
  </div>;
}
