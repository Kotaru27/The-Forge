import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
const base = (process.env.FORGE_BASE_PATH || '/').replace(/\/?$/, '/');
const htmlPath = resolve(output, 'index.html');
assert.ok(existsSync(htmlPath), 'Vite must produce dist/index.html');
for (const forbidden of ['legacy', 'compressor']) {
  assert.equal(existsSync(resolve(output, forbidden)), false, 'Do not deploy the old CTK runtime: ' + forbidden);
}
const html = readFileSync(htmlPath, 'utf8');
const src = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
assert.ok(src, 'Expected a bundled React entry script');
assert.ok(src.startsWith(base + 'assets/'), 'Production script must use the configured Pages base: ' + src);
assert.ok(existsSync(resolve(output, src.slice(base.length))), 'Production script must exist on disk');
function deployedFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = prefix + entry.name;
    const abs = resolve(dir, entry.name);
    return entry.isDirectory() ? deployedFiles(abs, rel + '/') : [rel];
  });
}
const files = deployedFiles(output);
assert.ok(files.some(file => file.startsWith('assets/') && file.endsWith('.js')), 'Expected bundled JS files');
assert.ok(!files.some(file => /(^|\/)(legacy|compressor)(\/|$)/i.test(file)), 'Legacy files remain in deployment');
const bytes = files.reduce((n, file) => n + statSync(resolve(output, file)).size, 0);
console.log('Native-only build verified: ' + files.length + ' files, ' + bytes + ' bytes; base ' + base);
