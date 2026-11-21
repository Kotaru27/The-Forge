import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const directory=resolve('dist-standalone');
const source=join(directory,'standalone.html');
let html=readFileSync(source,'utf8');
const embedded=new Set();
function localAsset(url) {
  assert(!/^(?:[a-z]+:|\/\/)/i.test(url),'External dependency in standalone build: '+url);
  const pathname=decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\.\//,'').replace(/^\//,'');
  assert(!pathname.includes('..') && !pathname.startsWith('/'),'Unsafe asset path: '+url);
  const filepath=join(directory,pathname);
  const buffer=readFileSync(filepath,'utf8');
  embedded.add(filepath);
  return buffer;
}
let scripts=0,styles=0;
html=html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi,(element,url)=>{
  const code=localAsset(url).replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
  scripts++;
  return '<script type="module">\n'+code+'\n</script>';
});
html=html.replace(/<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="([^"]+)"[^>]*>/gi,(element,url)=>{
  styles++;
  return '<style>\n'+localAsset(url).replace(/<\/style/gi,'<\\/style')+'\n</style>';
});
assert.equal(scripts,1,'Standalone build must have one bundled JS entry');
assert.equal(styles,1,'Standalone build must have one bundled CSS asset');
assert(!/<(?:script\b[^>]*\bsrc=|link\b[^>]*\brel="(?:stylesheet|modulepreload)")/i.test(html),'Standalone HTML still references external JS/CSS.');
writeFileSync(join(directory,'the-forge.html'),html);
for(const file of embedded) unlinkSync(file);
const assetsDir=join(directory,'assets');
if(readdirSync(assetsDir).length) throw Error('Unembedded files remain in standalone/assets; a single HTML is not self-contained.');
rmSync(assetsDir,{recursive:true});
unlinkSync(source);
console.log('Standalone HTML ready: dist-standalone/the-forge.html ('+(statSync(join(directory,'the-forge.html')).size/1048576).toFixed(2)+' MiB)');
