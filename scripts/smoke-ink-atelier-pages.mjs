import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const rootUrl = new URL('https://kotaru27.github.io/The-Forge/');
const previewUrl = new URL('https://kotaru27.github.io/The-Forge/ink-atelier-preview/');
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
    const expectedAssets = label === 'production' ? '/The-Forge/assets/' : '/The-Forge/ink-atelier-preview/assets/';
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
    await expect.poll(() => page.locator('.ink-atelier-card-linework > g').count()).toBe(21);
    await page.screenshot({path: 'ink-atelier-home-smoke.png'});

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
    await page.goto(previewUrl.href + '#/link-generator', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Folder / Path').fill('Ink Atelier');
    await page.getByLabel('Filenames').fill('sample.png');
    await page.getByRole('button', {name: 'Generate', exact: true}).click();
    await expect(page.locator('#link-exposure')).toHaveValue(/sample\.png/);
  }
  assert.deepEqual(errors, [], 'JavaScript errors on live Pages');
  assert.deepEqual(brokenAssets, [], 'Missing static assets');
  console.log('INK ATELIER PAGES SMOKE PASSED: production root + isolated design preview + 7 routes');
} finally {
  await browser.close();
}
