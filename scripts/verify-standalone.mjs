import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
const dir='dist-standalone';
const files=readdirSync(dir);
assert.deepEqual(files,['the-forge.html'],'A true standalone build must contain exactly one file');
const html=readFileSync(dir+'/the-forge.html','utf8');
assert.match(html,/<!doctype html>/i);
assert.match(html,/<style>/);
assert.match(html,/<script type="module">/);
assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+rel="stylesheet"/i);
assert.doesNotMatch(html,/https:\/\/fonts\.googleapis\.com|https:\/\/fonts\.gstatic\.com/);
for (const name of ['Logo Resizer','PDF to Image','Image Splitter','Video Stills','Storyboard','Link Generator','Ad Downloader']) {
  assert(html.includes(name),'Missing tool in bundle: '+name);
}
assert(statSync(dir+'/the-forge.html').size>200000,'Unexpectedly small standalone bundle');
console.log('Standalone HTML structural verification passed: seven tools, one self-contained file');
