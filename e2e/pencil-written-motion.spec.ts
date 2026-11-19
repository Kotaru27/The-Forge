import { test, expect } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

const routes = [
  'logo-resizer', 'pdf-to-image', 'image-splitter', 'video-stills',
  'storyboard', 'link-generator', 'ad-downloader',
] as const;

test('all seven workrooms are immediately visible with zero CSS animation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 880 });
  for (const route of routes) {
    await openForgeRoute(page, route);
    const tool = page.locator('.native-tool:not([hidden])');
    await expect(tool, route).toBeVisible();
    await expect(tool, route).toHaveCSS('animation-name', 'none');
    await expect(tool, route).toHaveCSS('transition-property', 'none');
    await expect(page.locator('.pencil-written-glyph, .forge-intro-portal')).toHaveCount(0);
  }
});

test('tool switching does not animate the workroom or remount an intro', async ({ page }) => {
  await openForgeRoute(page, 'link-generator');
  await page.getByLabel('Folder / Path').fill('KeepThisState');
  await openForgeRoute(page, 'storyboard');
  await openForgeRoute(page, 'link-generator');
  await expect(page.getByLabel('Folder / Path')).toHaveValue('KeepThisState');
  await expect(page.locator('.forge-intro-portal, .forge-tool-opening')).toHaveCount(0);
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('transform', 'none');
});

test('Home typography is static on direct and reduced-motion visits', async ({ page }) => {
  await openForgeRoute(page, 'home');
  await expect(page.locator('.sketch-hero-center h1')).toHaveText('THE FORGE');
  await expect(page.locator('.sketch-hero-center h1')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.sketch-hero-center h1')).toHaveCSS('transition-property', 'none');
  await expect(page.locator('.pencil-wordmark-art, .pencil-written-glyph')).toHaveCount(0);
});
