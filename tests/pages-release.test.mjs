import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('release workflow is strictly manual, gated and branch-restricted', () => {
  const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /push:\s*(?:\n|\r)/);
  assert.match(workflow, /refs\/heads\/release\/pages-preview/);
  assert.match(workflow, /needs: verify/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run test:e2e/);
  assert.match(workflow, /FORGE_BASE_PATH: \/The-Forge\//);
  assert.match(workflow, /upload-pages-artifact@v3/);
  assert.match(workflow, /configure-pages@v5/);
  assert.match(workflow, /deploy-pages@v4/);
  assert.match(workflow, /needs: deploy/);
  assert.match(workflow, /smoke-live-pages\.mjs/);
  assert.doesNotMatch(workflow, /enablement:\s*true/);
});

test('release candidate is built and archived on release branch without deploying', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(ci, /release\/pages-preview/);
  assert.match(ci, /upload-artifact@v4/);
  assert.match(ci, /the-forge-pages-preview/);
  assert.ok(existsSync('scripts/smoke-live-pages.mjs'));
  const smoke = readFileSync('scripts/smoke-live-pages.mjs', 'utf8');
  assert.match(smoke, /https:/);
  assert.match(smoke, /Split Images/);
  assert.match(smoke, /pageerror/);
  assert.match(smoke, /The-Forge\/assets/);
});
