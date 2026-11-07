import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

// Runs AFTER GitHub Pages deploy, against the actual HTTPS site.
// No credentials or campaign files are used; generated local image only.
const liveUrl = process.env.FORGE_LIVE_URL || process.argv[2];
assert.ok(liveUrl, 'Set FORGE_LIVE_URL to the URL returned by actions/deploy-pages');
const site = new URL(liveUrl);
assert.equal(site.protocol, 'https:', 'Live preview must use HTTPS');
assert.equal(site.pathname.replace(/\/?$/, '/'), '/The-Forge/', 'Wrong GitHub Pages project path');

const expected = [
  ['logo-resizer', 'Logo Resizer'],
  ['pdf-to-image', 'PDF to Image'],
  ['image-splitter', 'Image Splitter'],
  ['video-stills', 'Video Stills'],
  ['storyboard', 'Storyboard'],
  ['link-generator', 'Link Generator'],
  ['ad-downloader', 'Ad Downloader'],
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const jsErrors = [];
const missingAssets = [];
page.on('pageerror', error => jsErrors.push(error.message));
page.on('response', response => {
  const u = new URL(response.url());
  if (u.origin === site.origin && response.status() >= 400
    && ['script', 'stylesheet', 'document', 'font', 'image', 'worker'].includes(response.request().resourceType())) {
    missingAssets.push(response.status() + ' ' + u.pathname);
  }
});
page.on('requestfailed', request => {
  const u = new URL(request.url());
  if (u.origin === site.origin) missingAssets.push('request failed ' + u.pathname);
});
try {
  let ready = false;
  let lastError = '';
  // Newly published Pages content can take a short time to reach the CDN.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await page.goto(new URL('#/logo-resizer', site).href, { waitUntil: 'domcontentloaded', timeout: 25_000 });
      await expect(page.getByRole('navigation', { name: 'Select a tool' }).getByRole('button')).toHaveCount(8, { timeout: 10_000 });
      ready = true;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  assert.ok(ready, 'Published site did not become ready: ' + lastError);
  // Clear transient errors from pre-propagation retries.
  jsErrors.length = 0;
  missingAssets.length = 0;

  const scripts = await page.locator('script[type="module"][src]').evaluateAll(elements =>
    elements.map(element => element.getAttribute('src')));
  assert.ok(scripts.length > 0, 'No JS module entrypoint on published page');
  assert.ok(scripts.every(path => path.startsWith('/The-Forge/assets/')), 'Incorrect JS asset path: ' + scripts);
  for (const path of scripts) {
    const response = await page.request.get(new URL(path, site).href);
    assert.equal(response.status(), 200, 'Bundled script URL returned an error: ' + path);
    assert.match(response.headers()['content-type'] || '', /javascript|ecmascript/, 'Script served with the wrong MIME type');
  }

  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  await expect(nav.getByRole('button', { name: 'Video Compressor' })).toHaveCount(0);
  for (const [id, label] of expected) {
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
    assert.equal(new URL(page.url()).hash, '#/' + id, 'Incorrect route for ' + label);
    await expect(page.locator('iframe')).toHaveCount(0);
  }

  await nav.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('region', { name: 'The Forge home' })).toBeVisible();
  await expect(page.locator('.forge-home-card')).toHaveCount(7);

  await nav.getByRole('button', { name: 'Link Generator', exact: true }).click();
  await page.getByLabel('Folder / Path').fill('Pages Release');
  await page.getByLabel('Filenames').fill('smoke.png');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#link-exposure')).toHaveValue(/smoke\.png/);

  await nav.getByRole('button', { name: 'Image Splitter', exact: true }).click();
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8; canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unsupported');
    ctx.fillStyle = '#2277bb';
    ctx.fillRect(0, 0, 8, 4);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload images').setInputFiles({
    name: 'smoke.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64'),
  });
  await expect(page.locator('.split-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.getByRole('button', { name: 'Download Zip' })).toBeEnabled();
  const fileEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Zip' }).click();
  const download = await fileEvent;
  assert.equal(download.suggestedFilename(), 'split_images.zip');
  assert.ok((await download.path()), 'Browser did not receive a ZIP export');

  await page.evaluate(() => { window.location.hash = '#/video-compressor'; });
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByRole('region', { name: 'The Forge home' })).toBeVisible();
  assert.deepEqual(missingAssets, [], 'Published site has missing assets');
  assert.deepEqual(jsErrors, [], 'Published site has JavaScript exceptions');
  console.log('LIVE PAGES SMOKE PASSED: ' + site.href + ' — Home + 7 tools, assets, image ZIP, no legacy iframe');
} finally {
  await browser.close();
}
