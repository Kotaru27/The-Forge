import { test, expect } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

test('opening a Home card shows its workroom directly without FLIP or cloning', async ({ page }) => {
  await openForgeRoute(page, 'home');
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page).toHaveURL(/#\/logo-resizer$/);
  await expect(page.locator('.logo-workspace')).toBeVisible();
  await expect(page.locator('.forge-intro-portal, .forge-tool-opening, .forge-route-pencil-stroke')).toHaveCount(0);
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('transform', 'none');
});

test('sidebar switches directly and preserves existing workrooms', async ({ page }) => {
  await openForgeRoute(page, 'logo-resizer');
  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  await nav.getByRole('button', { name: 'PDF to Image' }).click();
  await expect(page.locator('.pdf-workspace')).toBeVisible();
  await nav.getByRole('button', { name: 'Storyboard' }).click();
  await expect(page.locator('.storyboard-tool')).toBeVisible();
  await expect(page.locator('.forge-tool-opening, .forge-route-pencil-stroke')).toHaveCount(0);
});

test('tool controls and navigation have no CSS transitions', async ({ page }) => {
  for (const route of ['logo-resizer', 'storyboard', 'link-generator']) {
    await openForgeRoute(page, route);
    await expect(page.locator('.topbar')).toHaveCSS('transition-property', 'none');
    await expect(page.locator('.sketch-subtool-link').first()).toHaveCSS('transition-property', 'none');
    await expect(page.locator('.native-tool:not([hidden]) button').first()).toHaveCSS('animation-name', 'none');
  }
});

test('workroom scroll remains native and no parallax overlays are created', async ({ page }) => {
  for (const route of ['logo-resizer', 'video-stills', 'storyboard']) {
    await openForgeRoute(page, route);
    await expect(page.locator('.forge-parallax-near, .forge-parallax-far, .forge-parallax-art')).toHaveCount(0);
    await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('scroll-behavior', 'auto');
  }
});

test('reduced motion preference does not change functionality', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openForgeRoute(page, 'home');
  await page.getByRole('button', { name: 'Open PDF to Image' }).click();
  await expect(page.locator('.pdf-workspace')).toBeVisible();
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
});
