/* Real desktop browser regression checks. Runs against Vite's production preview. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.FORGE_QA_URL || 'http://127.0.0.1:4173/The-Forge/';
await mkdir('artifacts/browser-qa', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });

  // The real pinned engine runs inside the React-owned workspace frame.
  const iframe = page.frameLocator('iframe[title="The Forge tool workspace"]');
  await iframe.locator('#section-logo.active').waitFor({ state: 'visible', timeout: 30_000 });
  const presetButtons = iframe.locator('#section-logo .forge-preset');
  await presetButtons.first().waitFor({ state: 'visible', timeout: 15_000 });
  assert.equal(await presetButtons.count(), 4, 'All four requested presets must exist');

  const shell = await page.locator('.tool-link.is-active').textContent();
  assert.match(shell || '', /Logo Resizer/);
  await page.screenshot({ path: 'artifacts/browser-qa/logo-empty-1440.png' });

  // An actual browser-generated PNG, not a mocked engine or synthetic card.
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 180, 120);
    ctx.fillStyle = '#222222';
    ctx.fillRect(22, 22, 136, 76);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Arial';
    ctx.fillText('F.', 76, 75);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await iframe.locator('#logoInput').setInputFiles({
    name: 'forge-qa.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });

  const dimensionDialog = iframe.locator('#logoDimensionOverlay:not([hidden])');
  await dimensionDialog.waitFor({ state: 'visible', timeout: 15_000 });
  await iframe.locator('#logoDimWidth').fill('200');
  await iframe.locator('#logoDimHeight').fill('150');
  await iframe.locator('#logoDimOkBtn').click();

  const card = iframe.locator('#logoGrid > .logo-card-item').first();
  await card.waitFor({ state: 'visible', timeout: 25_000 });
  assert.equal(await iframe.locator('#logoGrid > .logo-card-item').count(), 1);
  assert.equal(await iframe.locator('#exportWidth').inputValue(), '200');
  assert.equal(await iframe.locator('#exportHeight').inputValue(), '150');

  const initialLayout = await iframe.locator('#section-logo').evaluate(root => {
    const rect = selector => {
      const r = (selector === ':scope' ? root : root.querySelector(selector)).getBoundingClientRect();
      return { x:r.x, right:r.right, width:r.width, height:r.height };
    };
    return {
      section:rect(':scope'), settings:rect('.sidebar-panel'), board:rect('#logoGrid'),
      card:rect('.logo-card-item'), toolbar:rect('.forge-stage-toolbar'),
      assetCount:root.querySelector('.forge-stage-count')?.textContent,
    };
  });
  assert.ok(initialLayout.settings.width > 200, 'Global settings sidebar clipped');
  assert.ok(initialLayout.board.width > 450, 'Asset board too narrow');
  assert.ok(initialLayout.card.width >= 200, 'Logo card compressed');
  assert.ok(initialLayout.toolbar.height >= 50, 'Board toolbar is missing');
  assert.match(initialLayout.assetCount || '', /1 ASSET/);
  await page.screenshot({ path: 'artifacts/browser-qa/logo-imported-1440.png' });

  const preview = card.locator('.card-preview-area');
  await preview.click();
  await iframe.locator('#logoDetailOverlay.active').waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(650);
  const focus = await iframe.locator('#section-logo').evaluate(root => {
    const r = s => (s === ':scope' ? root : root.querySelector(s)).getBoundingClientRect();
    return { sectionRight:r(':scope').right, sidebar:r('.sidebar-panel').width,
      board:r('#logoGrid').width, inspector:r('#logoDetailOverlay').width,
      inspectorRight:r('#logoDetailOverlay').right,
      panelVisibility:getComputedStyle(root.querySelector('#logoDetailOverlay')).visibility };
  });
  assert.ok(focus.sidebar > 200, 'Global settings sidebar disappeared in focus mode');
  assert.ok(focus.board > 280, 'Asset board disappeared in focus mode');
  assert.ok(focus.inspector >= 300 && focus.inspector <= 380, 'Inspector did not dock as right sidebar');
  assert.ok(focus.inspectorRight <= focus.sectionRight + 3, 'Inspector overflows tool workspace');
  assert.equal(focus.panelVisibility, 'visible');
  await page.screenshot({ path: 'artifacts/browser-qa/logo-inspector-open-1440.png' });

  const singleDownloadPromise = page.waitForEvent('download', { timeout: 25_000 });
  await iframe.locator('#logoDetailDownload').click();
  const singleDownload = await singleDownloadPromise;
  assert.match(singleDownload.suggestedFilename(), /\.png$/i, 'Single-logo download must be PNG');

  await iframe.locator('#logoDetailClose').click();
  await iframe.locator('#logoDetailOverlay.active').waitFor({ state: 'hidden', timeout: 10_000 });
  await page.waitForTimeout(650);
  const closed = await iframe.locator('#logoDetailOverlay').evaluate(el => ({
    visible:getComputedStyle(el).visibility,
    width:el.getBoundingClientRect().width,
  }));
  assert.equal(closed.visible, 'hidden', 'Focus inspector remains visible after close');
  await preview.focus();
  await preview.press('Enter');
  await iframe.locator('#logoDetailOverlay.active').waitFor({ state: 'visible', timeout: 10_000 });
  await iframe.locator('#logoDetailClose').click();
  await iframe.locator('#logoDetailOverlay.active').waitFor({ state: 'hidden' });

  await presetButtons.filter({ hasText:'250 × 250' }).click();
  assert.equal(await iframe.locator('#exportWidth').inputValue(), '250');
  assert.equal(await iframe.locator('#exportHeight').inputValue(), '250');
  assert.equal(await presetButtons.filter({ hasText:'250 × 250' }).getAttribute('aria-pressed'), 'true');

  const zipPromise = page.waitForEvent('download', { timeout: 40_000 });
  await iframe.locator('#exportAllBtn').click();
  const zipDownload = await zipPromise;
  assert.match(zipDownload.suggestedFilename(), /\.zip$/i, 'Batch export must produce a ZIP');
  assert.deepEqual(errors, [], 'Uncaught browser runtime errors');

  console.log('FORGE_LOGO_BROWSER_QA_PASSED ' + JSON.stringify({
    initialLayout, focus, closed,
    singleDownload:singleDownload.suggestedFilename(),
    zipDownload:zipDownload.suggestedFilename(),
    browserErrors:errors,
  }));
  await context.close();
} finally {
  await browser.close();
}
