import { test, expect } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

const tools = [
  'logo-resizer', 'pdf-to-image', 'image-splitter', 'video-stills',
  'storyboard', 'link-generator', 'ad-downloader',
] as const;

test('AMOLED Home preserves seven working cards, 4+3 grouping and tool search', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  await openForgeRoute(page, 'home');
  await expect(page.locator('.sketch-notebook-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('.sketch-home')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  const spans = await page.locator('.sketch-card-slot').evaluateAll(items =>
    items.map(el => Math.round(el.getBoundingClientRect().width)));
  expect(spans.length).toBe(7);
  expect(spans[4]).toBeGreaterThan(spans[0]);
  await page.getByRole('searchbox', { name: 'Find a Forge tool' }).fill('logo');
  await expect(page.locator('.sketch-tool-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show all tools' }).click();
  await expect(page.locator('.sketch-tool-card')).toHaveCount(7);
});

test('all seven workrooms retain their native tool container and black header', async ({ page }) => {
  for (const tool of tools) {
    await openForgeRoute(page, tool);
    await expect(page.locator('.native-tool:not([hidden])'), tool).toBeVisible();
    await expect(page.locator('.topbar.sketch-topbar')).toHaveCSS('background-color', 'rgb(6, 6, 6)');
    await expect(page.locator('.main-area.sketch-main-area')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  }
});

test('navigation includes all eight destinations and the active label remains accessible', async ({ page }) => {
  await openForgeRoute(page, 'logo-resizer');
  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  await expect(nav.locator('.sketch-nav-icon svg, .sketch-subtool-icon svg')).toHaveCount(8);
  await expect(nav.locator('.sketch-subtool-link[aria-current=page]')).toHaveCount(1);
  await nav.getByRole('button', { name: 'PDF to Image' }).click();
  await expect(page.locator('.topbar h1')).toHaveText('PDF to Image');
});

test('Logo Resizer controls remain accessible and previews are not filtered', async ({ page }) => {
  await openForgeRoute(page, 'logo-resizer');
  await expect(page.locator('.forge-v5-command-deck')).toBeVisible();
  await expect(page.locator('.logo-gallery')).toBeVisible();
  await expect(page.locator('.logo-workspace')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

test('Image Splitter drop zone and actions remain visible on AMOLED', async ({ page }) => {
  await openForgeRoute(page, 'image-splitter');
  await expect(page.locator('.split-settings')).toBeVisible();
  await expect(page.locator('.split-results')).toBeVisible();
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('animation-name', 'none');
});

test('sidebar has no horizontal scrolling while all tools stay reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 850 });
  await openForgeRoute(page, 'storyboard');
  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  const size = await nav.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
  await nav.getByRole('button', { name: 'Link Generator' }).click();
  await expect(page.locator('.link-generator')).toBeVisible();
});
