import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const routes = readFileSync(resolve('src/tools.ts'), 'utf8');
const legacy = readFileSync(resolve('scripts/materialize-legacy.mjs'), 'utf8');
const source = readFileSync(resolve('src/components/LegacyWorkspace.tsx'), 'utf8');

const ids = ['logo-resizer', 'pdf-to-image', 'image-splitter', 'video-stills', 'storyboard', 'link-generator', 'ad-downloader', 'video-compressor'];
test('all eight routes exist in the shell and compatibility adapter', () => {
  for (const id of ids) {
    assert.match(routes, new RegExp("id: '" + id + "'"));
    assert.ok(legacy.includes("'" + id + "'"));
  }
});
test('messages are restricted to the embedded frame and same origin', () => {
  assert.match(source, /event\.origin !== window\.location\.origin/);
  assert.match(source, /event\.source !== frame\.current\?\.contentWindow/);
  assert.match(legacy, /event\.origin!==location\.origin/);
});
test('generated compatibility page exists after setup', () => {
  if (process.env.CTK_SOURCE_DIR || existsSync(resolve('legacy-source'))) {
    assert.ok(existsSync(resolve('public/legacy/index.html')));
    assert.ok(existsSync(resolve('public/legacy/dist/js/app.js')));
    assert.ok(existsSync(resolve('public/legacy/compressor/index.html')));
  }
});

test('logo studio assets are generated and never replace image processing', () => {
  const css = readFileSync(resolve('src/legacy/forge-logo-studio.css'), 'utf8');
  const interactions = readFileSync(resolve('src/legacy/forge-logo-studio.js'), 'utf8');
  assert.match(legacy, /forge-logo-studio\.css/);
  assert.match(legacy, /forge-logo-studio\.js/);
  assert.match(css, /grid-template-columns.*important/);
  assert.match(css, /prefers-reduced-motion/);
  for (const size of ['150, 150', '200, 200', '200, 150', '250, 250']) {
    assert.ok(interactions.includes(size));
  }
  assert.match(interactions, /Tools\.Logo\.handleFiles\(files\)/);
  assert.doesNotMatch(interactions, /innerHTML\s*=\s*file\.name/);
});
test('generated logo studio assets exist after compatibility build', () => {
  if (process.env.CTK_SOURCE_DIR || existsSync(resolve('legacy-source'))) {
    assert.ok(existsSync(resolve('public/legacy/forge-logo-studio.css')));
    assert.ok(existsSync(resolve('public/legacy/forge-logo-studio.js')));
    const html = readFileSync(resolve('public/legacy/index.html'), 'utf8');
    assert.match(html, /forge-logo-studio\.css/);
    assert.match(html, /forge-logo-studio\.js/);
  }
});
