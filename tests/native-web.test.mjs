import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');

test('seven-tool production app no longer imports the iframe compatibility runtime', () => {
  const app = read('src/App.tsx');
  const routes = read('src/tools.ts');
  assert.doesNotMatch(app, /LegacyWorkspace|legacyActive|stills-transfer/);
  assert.doesNotMatch(routes, /id:\s*'video-compressor'/);
  for (const path of [
    'src/components/LegacyWorkspace.tsx',
    'src/bridge/stills-transfer.ts',
    'scripts/materialize-legacy.mjs',
    'scripts/legacy-stills-transfer.js',
  ]) {
    assert.equal(existsSync(path), false, 'Removed obsolete runtime: ' + path);
  }
});

test('native builds remove stale generated CTK output and verify dist assets', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.prebuild, /clean:generated-legacy/);
  assert.match(pkg.scripts.build, /verify-native-dist/);
  assert.doesNotMatch(pkg.scripts.dev, /materialize-legacy/);
  const clean = read('scripts/clean-generated-legacy.mjs');
  assert.match(clean, /public.*legacy|public', 'legacy'/);
  assert.match(read('scripts/verify-native-dist.mjs'), /dist|assets/);
  // Original CTK remains test-only; every native browser build can run alone.
  assert.match(pkg.scripts['test:legacy'], /test-legacy/);
  assert.ok(existsSync('scripts/test-legacy.mjs'));
});

test('CI keeps pinned CTK oracle for verification, not browser artifacts', () => {
  const ci = read('.github/workflows/ci.yml');
  const pages = read('.github/workflows/pages.yml');
  assert.equal((ci.match(/repository: Kotaru27\/CTK/g) || []).length, 1);
  assert.doesNotMatch(ci, /prepare:legacy/);
  assert.doesNotMatch(pages, /prepare:legacy/);
  assert.match(ci, /FORGE_BASE_PATH: \/The-Forge\//);
  assert.match(pages, /workflow_dispatch/);
});
