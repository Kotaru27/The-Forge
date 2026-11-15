import { test, expect } from '@playwright/test';

test('uploaded pencil drawing completes and continues into the actual seven-card Forge Home', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1586, height: 992 });
  await page.goto('./');
  const intro = page.getByRole('dialog', { name: 'The Forge opening pencil sketch' });
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute('data-intro-stage', 'drawing');
  await expect(intro.locator('#forge-intro-layer-drafting-guides')).toHaveCount(1);
  await expect(intro.locator('#forge-intro-layer-frame-and-emblem')).toHaveCount(1);
  await expect(intro.locator('#forge-intro-layer-title')).toHaveCount(1);
  await expect(intro.locator('#forge-intro-layer-caption')).toHaveCount(1);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);

  await page.waitForTimeout(2150);
  await page.screenshot({ path: testInfo.outputPath('intro-pencil-drawing.png') });
  await expect(intro).toHaveAttribute('data-intro-stage', 'handoff', { timeout: 5500 });
  await expect(page.locator('.forge-app')).toHaveClass(/forge-intro-handoff/);
  await page.screenshot({ path: testInfo.outputPath('intro-home-handoff.png') });
  await expect(intro).toHaveCount(0, { timeout: 3500 });
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-intro-handoff/);
  await expect(page.getByRole('heading', { name: 'THE FORGE', level: 1 })).toBeVisible();
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  await page.screenshot({ path: testInfo.outputPath('intro-home-finished.png') });

  // A direct second visit to root in this tab does not replay the animation.
  await page.goto('./');
  await expect(intro).toHaveCount(0);
});

test('intro skip and user-triggered replay never change tool routing', async ({ page }) => {
  await page.goto('./');
  const intro = page.getByRole('dialog', { name: 'The Forge opening pencil sketch' });
  await expect(intro).toBeVisible();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(intro).toHaveCount(0);
  await page.getByRole('button', { name: /Replay pencil sketch intro/ }).click();
  await expect(intro).toBeVisible();

  // Hash navigation remains available throughout; direct route bypasses intro.
  await page.evaluate(() => { window.location.hash = '#/logo-resizer'; });
  await expect(intro).toHaveCount(0);
  await expect(page.locator('.logo-workspace')).toBeVisible();
  await page.goto('#/home');
  await expect(intro).toHaveCount(0);
  // Existing search matches card description text as well as tool names.
  // Use a uniquely matching query; do not change the application's search.
  await page.getByRole('searchbox', { name: 'Find a Forge tool' }).fill('ad downloader');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open Ad Downloader' }).click();
  await expect(page).toHaveURL(/#\/ad-downloader$/);
});

test('deep links and reduced-motion preferences show settled Home without animation', async ({ page }) => {
  await page.goto('#/home');
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
});
