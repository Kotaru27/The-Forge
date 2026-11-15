import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const rootUrl = 'https://kotaru27.github.io/The-Forge/';
const introUrl = 'https://kotaru27.github.io/The-Forge/intro-sketch-preview/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1586, height: 992 } });
const errors = [];
const missingAssets = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', r => {
  if (r.status() >= 400 && ['document','script','stylesheet','font'].includes(r.request().resourceType())) {
    missingAssets.push(r.status() + ': ' + r.url());
  }
});

try {
  await page.goto(rootUrl + '#/home', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  await page.screenshot({ path: 'forge-intro-live-production-untouched.png' });

  // The preview is a distinct Pages subdirectory, NOT the production root.
  let loaded = false;
  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      await page.goto(introUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await expect(page.getByRole('dialog', { name: 'The Forge opening pencil sketch' })).toBeVisible({ timeout: 9000 });
      loaded = true;
      break;
    } catch (error) {
      if (attempt === 6) throw error;
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  }
  assert(loaded);
  const assetBase = '/The-Forge/intro-sketch-preview/assets/';
  const scripts = await page.locator('script[type="module"][src]').evaluateAll(nodes => nodes.map(x=>x.getAttribute('src')));
  assert(scripts.length && scripts.every(x=>x.startsWith(assetBase)), 'Wrong isolated asset base: ' + scripts);
  await expect(page.locator('#forge-intro-layer-title')).toHaveCount(1);
  await page.screenshot({ path: 'forge-intro-live-sketch-start.png' });
  const dialog = page.getByRole('dialog', { name: 'The Forge opening pencil sketch' });
  await expect(dialog).toHaveAttribute('data-intro-stage','handoff',{timeout:7000});
  await page.screenshot({ path: 'forge-intro-live-handoff.png' });
  await expect(dialog).toHaveCount(0,{timeout:3500});
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  await page.screenshot({ path: 'forge-intro-live-home-complete.png' });

  await page.getByRole('button',{name:'Replay pencil sketch intro'}).click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button',{name:/Skip intro/}).click();
  await expect(dialog).toHaveCount(0);

  await page.goto(introUrl+'#/logo-resizer');
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.logo-workspace')).toBeVisible();
  await expect(page.locator('.logo-workspace button.pencil-art-button')).toHaveCount(8);
  assert.deepEqual(errors,[],'Unexpected JavaScript errors');
  assert.deepEqual(missingAssets,[],'Missing published files');
  console.log('FORGE SKETCH INTRO LIVE SMOKE PASSED: unchanged production + authentic pencil intro + animated Home continuation + replay/skip + Logo route');
} finally {
  await browser.close();
}
