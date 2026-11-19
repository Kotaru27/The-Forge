import { test, expect } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

test('AMOLED Home renders immediately without an intro overlay', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('.forge-amoled-home')).toBeVisible();
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  await expect(page.locator('.forge-intro-portal, .forge-tool-opening')).toHaveCount(0);
  await expect(page.locator('.sketch-tool-card').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.sketch-tool-card').first()).toHaveCSS('transition-property', 'none');
});

test('Home search and tool opening are immediate and functional', async ({ page }) => {
  await openForgeRoute(page, 'home');
  await page.getByRole('searchbox', { name: 'Find a Forge tool' }).fill('Logo');
  await expect(page.locator('.sketch-tool-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page).toHaveURL(/#\/logo-resizer$/);
  await expect(page.locator('.logo-workspace')).toBeVisible();
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
});

test('bookmarked tool routes open at Home on a fresh document', async ({ page }) => {
  await page.goto('./#/storyboard');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('.forge-amoled-home')).toBeVisible();
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
});

test('refreshing a working tool returns to Home without motion', async ({ page }) => {
  for (const route of ['logo-resizer', 'pdf-to-image', 'image-splitter', 'video-stills', 'storyboard', 'link-generator', 'ad-downloader']) {
    await openForgeRoute(page, route);
    await expect(page.locator('.native-tool:not([hidden])')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/#\/home$/);
    await expect(page.locator('.forge-amoled-home')).toBeVisible();
    await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  }
});

test('reduced motion preference has identical zero-motion navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openForgeRoute(page, 'home');
  await page.getByRole('button', { name: 'Open Storyboard' }).click();
  await expect(page).toHaveURL(/#\/storyboard$/);
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.forge-intro-portal, .forge-tool-opening')).toHaveCount(0);
});
