import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const rootString = process.env.FORGE_PAGES_ROOT || 'https://kotaru27.github.io/The-Forge/';
const root = new URL(rootString);
const preview = new URL('amoled-preview/', root);
assert.equal(root.protocol, 'https:');
assert.equal(root.pathname, '/The-Forge/');
assert.equal(preview.pathname, '/The-Forge/amoled-preview/');

const tools = [
  ['logo-resizer', 'Logo Resizer'],
  ['pdf-to-image', 'PDF to Image'],
  ['image-splitter', 'Image Splitter'],
  ['video-stills', 'Video Stills'],
  ['storyboard', 'Storyboard'],
  ['link-generator', 'Link Generator'],
  ['ad-downloader', 'Ad Downloader'],
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
const jsErrors = [];
const badAssets = [];
page.on('pageerror', error => jsErrors.push(error.message));
page.on('response', response => {
  const url = new URL(response.url());
  if (url.origin === preview.origin && url.pathname.startsWith(preview.pathname) &&
      response.status() >= 400) badAssets.push(response.status() + ' ' + url.pathname);
});
page.on('requestfailed', request => {
  const url = new URL(request.url());
  if (url.origin === preview.origin && url.pathname.startsWith(preview.pathname)) {
    badAssets.push('request failed ' + url.pathname);
  }
});
try {
  // Production still serves its original Home at the original URL.
  await page.goto(root.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await expect(page.locator('.forge-app')).toBeVisible();
  await expect(page.locator('.forge-amoled-ui')).toHaveCount(0);

  // GitHub Pages can take a moment to propagate to its edge cache.
  let ready = false;
  let lastError = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await page.goto(preview.href + '#/logo-resizer', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page).toHaveURL(/#\/home$/);
      await expect(page.locator('.forge-amoled-home')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
      ready = true;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
  assert.ok(ready, 'AMOLED preview did not become ready: ' + lastError);
  jsErrors.length = 0;
  badAssets.length = 0;

  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.sketch-notebook-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('.sketch-tool-card').first()).toHaveCSS('transition-property', 'none');
  await page.screenshot({ path: 'forge-amoled-home-live.png' });

  const scriptSources = await page.locator('script[type="module"][src]').evaluateAll(elements =>
    elements.map(element => element.getAttribute('src')));
  assert.ok(scriptSources.length > 0, 'Missing preview entrypoint');
  assert.ok(scriptSources.every(path => path.startsWith(preview.pathname + 'assets/')),
    'Preview is using the wrong asset base: ' + scriptSources);
  for (const path of scriptSources) {
    const result = await page.request.get(new URL(path, preview).href);
    assert.equal(result.status(), 200, 'Missing bundled script ' + path);
  }

  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  await expect(nav.getByRole('button')).toHaveCount(8);
  await page.screenshot({ path: 'forge-amoled-logo-live.png' });
  for (const [id, label] of tools) {
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp('#/' + id + '$'));
    await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
    await expect(page.locator('.native-tool:not([hidden])')).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
  }

  await nav.getByRole('button', { name: 'Link Generator' }).click();
  await page.getByLabel('Folder / Path').fill('Pages smoke');
  await page.getByLabel('Filenames').fill('preview-smoke.png');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#link-exposure')).toHaveValue(/preview-smoke\.png/);

  await nav.getByRole('button', { name: 'Image Splitter' }).click();
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8; canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Missing canvas context');
    ctx.fillStyle = '#333333'; ctx.fillRect(0, 0, 8, 4);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload images').setInputFiles({
    name: 'smoke.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64'),
  });
  await expect(page.locator('.split-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Split Images' }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Zip' }).click();
  const file = await event;
  assert.equal(file.suggestedFilename(), 'split_images.zip');
  assert.ok(await file.path(), 'No ZIP was downloaded');

  assert.deepEqual(jsErrors, [], 'Live AMOLED preview reported script errors');
  assert.deepEqual(badAssets, [], 'Live AMOLED preview had missing assets');
  console.log('AMOLED LIVE PAGES SMOKE PASSED:', preview.href,
    '- production root unchanged, seven tools, lazy workspaces, local ZIP.');
} finally {
  await browser.close();
}
