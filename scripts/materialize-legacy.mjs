import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve('.');
const source = resolve(process.env.CTK_SOURCE_DIR || join(root, 'legacy-source'));
const target = join(root, 'public', 'legacy');
const pinnedCommit = '617615c0b4370c795ddfd6dc4c300920cd595883';

if (!existsSync(join(source, 'package.json'))) {
  if (process.env.CTK_SOURCE_DIR) throw new Error('CTK_SOURCE_DIR not found: ' + source);
  console.log('Fetching pinned CTK baseline...');
  execFileSync('git', ['clone', 'https://github.com/Kotaru27/CTK.git', source], { stdio: 'inherit' });
  execFileSync('git', ['checkout', '--detach', pinnedCommit], { cwd: source, stdio: 'inherit' });
}
if (!existsSync(join(source, 'scripts', 'build.mjs'))) throw new Error('Invalid CTK source directory');
if (!process.env.CTK_SOURCE_DIR) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim();
  if (head !== pinnedCommit) throw new Error('Expected pinned CTK commit ' + pinnedCommit + ', got ' + head);
}
execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: source, stdio: 'inherit' });
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(join(source, 'dist', 'js'), join(target, 'dist', 'js'), { recursive: true });
cpSync(join(source, 'dist', 'css'), join(target, 'dist', 'css'), { recursive: true });
cpSync(join(source, 'compressor'), join(target, 'compressor'), { recursive: true });
for (const path of ['favicon.svg', 'manifest.json']) cpSync(join(source, path), join(target, path));

const minimalCss = [
 ':root{color-scheme:dark;--m3-surface:#000!important;--m3-surface-container:#090909!important;--m3-surface-container-low:#090909!important;--m3-surface-container-high:#111!important;--m3-on-surface:#f3f3f3!important;--m3-on-surface-variant:#a3a3a3!important;--m3-outline-variant:#292929!important;--bg-canvas:#000!important;--text-main:#f3f3f3!important;--text-muted:#a3a3a3!important;--border:#292929!important}',
 'html,body{height:100%!important;background:#000!important;color:#f3f3f3!important;margin:0!important}',
 'body::before,body::after{display:none!important;content:none!important}',
 'body.light-mode,body.dark-mode{background:#000!important;color:#f3f3f3!important;--m3-surface:#000!important;--m3-on-surface:#f3f3f3!important;--bg-canvas:#000!important;--text-main:#f3f3f3!important;--text-muted:#a3a3a3!important;--m3-surface-container:#090909!important}',
 '.forge-intro,.forge-whatsnew,#view-home,.header,.nav-sidebar,.forge-approved-home,.forge-hero-updates{display:none!important}',
 '.main-layout,.view-container{width:100%!important;height:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important;background:#000!important;border-radius:0!important}',
 '#view-app,#view-app.active{display:block!important;width:100%!important;height:100%!important;overflow:auto!important;padding:12px 18px 30px!important;background:#000!important;animation:none!important}',
 '.tool-section.active{animation:none!important;min-height:0!important}',
 '.tool-section>.tool-header{background:transparent!important}',
 '.glass-panel,.sidebar-panel,.right-panel,.canvas-panel,.control-group{box-shadow:none!important}',
 '.liquid-btn,.liquid-input,button,input,select,textarea{border-radius:4px!important}',
 '#section-yt-helper>.forge-compressor-surface{display:flex!important;flex-direction:column!important;width:100%!important;flex:1!important}',
 '#section-yt-helper>.forge-compressor-surface~*{display:none!important}',
 '#section-yt-helper .forge-compressor-frame{display:block;width:100%;height:calc(100vh - 96px);min-height:550px;border:0;background:#000}',
 '@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}'
].join('\n');

const bridge = [
 '<script>',
 '(function(){',
 "'use strict';",
 'const routes={',
 "'logo-resizer':['section-logo'],",
 "'pdf-to-image':['section-pdf','convert'],",
 "'image-splitter':['section-pdf','split'],",
 "'video-stills':['section-stills-boards','video'],",
 "'storyboard':['section-stills-boards','story'],",
 "'link-generator':['section-adlinks','gen'],",
 "'ad-downloader':['section-adlinks','downloader'],",
 "'video-compressor':['section-yt-helper']};",
 "const send=(type,details={})=>window.parent.postMessage({source:'the-forge-bridge',type,...details},location.origin);",
 "function select(id,subMode){const route=routes[id];if(!route)return send('error',{message:'Unknown tool'});",
 "try{UI._openTool(route[0],id==='storyboard'&&['story','filmstrip','fit'].includes(subMode)?subMode:route[1]);send('selected',{toolId:id});}",
 "catch(err){send('error',{message:'Could not open this workspace: '+String(err?.message||err)});}}",
 "window.addEventListener('message',event=>{",
 "if(event.origin!==location.origin||event.source!==window.parent||event.data?.source!=='the-forge-shell')return;",
 "if(event.data.type==='hello')send('ready');",
 "if(event.data.type==='open')select(event.data.toolId,event.data.subMode);",
 "});",
 "if(typeof UI!=='undefined'){",
 "const original=UI.openTool.bind(UI);",
 "UI.openTool=function(section,mode){",
 "original(section,mode);",
 "const match=Object.entries(routes).find(([,route])=>route[0]===section&&(!route[1]||route[1]===mode));",
 "if(match)send('selected',{toolId:match[0]});",
 "};}",
 "send('ready');",
 '})();',
 '</script>'
].join('\n');

let html = readFileSync(join(source, 'index.html'), 'utf8');
html = html
  .replace(/<style id="forge-first-paint-css">[\s\S]*?<\/style>/, '')
  .replace(/<script id="forge-first-paint-js">[\s\S]*?<\/script>/, '');
html = html.replace('<head>', "<head>\n<script>window.__forgeDisableSharedHandoff=true;try{sessionStorage.setItem('forge_intro_suppress','1');localStorage.setItem('forge_whatsnew_dismissed_2026_v3','1')}catch(e){}</script>");
html = html.replace('</head>', '<style id="forge-amoled-bridge">' + minimalCss + '</style></head>');
const stillsTransferBridge = readFileSync(join(root, 'scripts', 'legacy-stills-transfer.js'), 'utf8');
html = html.replace('</body>', bridge + '<script>' + stillsTransferBridge + '</script></body>');
writeFileSync(join(target, 'index.html'), html);

let compressorHtml = readFileSync(join(target, 'compressor', 'index.html'), 'utf8');
const compressorCss = 'html,body{background:#000!important;color:#f3f3f3!important;color-scheme:dark}body{--bg-canvas:#000!important;--m3-surface:#000!important;--text-main:#f3f3f3!important}body::before{display:none!important}';
compressorHtml = compressorHtml.replace('</head>', '<style>' + compressorCss + '</style></head>');
writeFileSync(join(target, 'compressor', 'index.html'), compressorHtml);
console.log('Generated AMOLED compatibility workspace at public/legacy');
