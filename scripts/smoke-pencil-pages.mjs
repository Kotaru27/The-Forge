import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const rootUrl = new URL('https://kotaru27.github.io/The-Forge/');
const previewUrl = new URL('https://kotaru27.github.io/The-Forge/graphite-pencil-preview/');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
const brokenAssets = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400 && ['document','script','stylesheet','font'].includes(response.request().resourceType())) {
    brokenAssets.push(response.status() + ': ' + response.url());
  }
});
try {
  for (const [label, url] of [['production', rootUrl], ['preview', previewUrl]]) {
    let ready = false;
    for (let attempt = 0; attempt < 7; attempt++) {
      try {
        await page.goto(url.href + '#/home', { waitUntil: 'domcontentloaded', timeout: 25_000 });
        await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7, { timeout: 12_000 });
        ready = true;
        break;
      } catch (error) {
        if (attempt === 6) throw Error(label + ' unreachable: ' + error);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    assert(ready, label + ' did not load');
    const expectedAssets = label === 'production' ? '/The-Forge/assets/' : '/The-Forge/graphite-pencil-preview/assets/';
    const js = await page.locator('script[type="module"][src]').evaluateAll(elements => elements.map(el => el.getAttribute('src')));
    assert(js.length > 0 && js.every(src => src.startsWith(expectedAssets)), label + ' wrong asset base: ' + js);
    for (const path of js) {
      const response = await page.request.get(new URL(path, url).href);
      assert.equal(response.status(), 200, label + ' missing JS asset: ' + path);
    }
    if (label === 'production') {
      await page.screenshot({path: 'production-home-smoke.png'});
      continue;
    }
    await expect(page.locator('.pencil-wordmark-art')).toBeVisible();
    await page.screenshot({path: 'graphite-pencil-home-smoke.png'});

    for (const [route, name] of [
      ['logo-resizer', 'Logo Resizer'],
      ['pdf-to-image', 'PDF to Image'],
      ['image-splitter', 'Image Splitter'],
      ['video-stills', 'Video Stills'],
      ['storyboard', 'Storyboard'],
      ['link-generator', 'Link Generator'],
      ['ad-downloader', 'Ad Downloader']
    ]) {
      await page.goto(previewUrl.href + '#/' + route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
      assert.equal(new URL(page.url()).hash, '#/' + route, 'Wrong route: ' + route);
    }
    // Verify the new pencil controls actually render in the publicly deployed
    // Logo Resizer. Native events and file logic are covered by the full E2E suite.
    await page.goto(previewUrl.href + '#/logo-resizer', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.logo-workspace button.pencil-art-button')).toHaveCount(8);
    await expect(page.locator('.logo-workspace .pencil-drop-sketch svg')).toBeVisible();
    const button = page.getByRole('button', { name: /Add assets/i });
    await expect(button.locator('svg.pencil-button-linework')).toHaveCount(1);
    await page.getByRole('button', { name: '150 × 150' }).click();
    await expect(page.getByRole('button', { name: '150 × 150' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('combobox', { name: 'Download format' }).selectOption('jpeg');
    await expect(page.getByRole('combobox', { name: 'Download format' })).toHaveValue('jpeg');
    await page.screenshot({ path: 'graphite-pencil-logo-smoke.png' });

    await page.goto(previewUrl.href + '#/link-generator', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Folder / Path').fill('Graphite Pencil');
    await page.getByLabel('Filenames').fill('sample.png');
    await page.getByRole('button', {name: 'Generate', exact: true}).click();
    await expect(page.locator('#link-exposure')).toHaveValue(/sample\.png/);
  }
  assert.deepEqual(errors, [], 'JavaScript errors on live Pages');
  assert.deepEqual(brokenAssets, [], 'Missing static assets');
  console.log('GRAPHITE PENCIL PAGES SMOKE PASSED: production root + isolated design preview + 7 routes');
} finally {
  await browser.close();
}
