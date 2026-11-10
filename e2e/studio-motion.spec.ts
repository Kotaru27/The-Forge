import { test, expect } from '@playwright/test';

// Visual-only redesign: no permanent nav rail, no lost assets and no viewport overflow.
const sample = {
  name: 'studio-motion.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAHUlEQVR4nGP8z8Dwn4GGgImWho9aMGrBqAXDxQIARZACFmekxckAAAAASUVORK5CYII=', 'base64'),
};

test('studio home keeps seven tools reachable at every target desktop width', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('./');
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('.forge-studio-shell')).toBeVisible();
    await expect(page.locator('.sidebar')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Select a tool' }).getByRole('button')).toHaveCount(8);
    await expect(page.locator('.forge-home-card')).toHaveCount(7);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading', { name: 'THE FORGE' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`studio-home-${width}.png`) });
  }
  // A transformed workspace would trap position:fixed dialogs behind the tool header.
  await page.goto('#/pdf-to-image');
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('transform', 'none');
  await page.goto('#/video-stills');
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('transform', 'none');
  expect(pageErrors).toEqual([]);
});

test('logo import, focus open/close and navigation preserve the existing asset', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('#/logo-resizer');
  await page.locator('.logo-workspace input[type="file"]').setInputFiles(sample);
  await page.getByRole('dialog', { name: 'Set logo dimensions' }).getByRole('button', { name: 'Apply & process' }).click();
  await expect(page.locator('.logo-card')).toHaveCount(1);
  await page.getByRole('button', { name: /Open Focus Mode for/ }).click();
  await expect(page.getByLabel('Focus Mode', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('studio-focus.png') });
  await page.getByRole('button', { name: 'Close Focus Mode' }).click();
  await expect(page.getByLabel('Focus Mode', { exact: true })).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  await nav.getByRole('button', { name: 'PDF to Image' }).click();
  await nav.getByRole('button', { name: 'Logo Resizer' }).click();
  await expect(page.locator('.logo-card')).toHaveCount(1);
  await expect(page.locator('.logo-card-heading input')).toHaveValue('studio-motion');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.logo-preview-frame')).toHaveCSS('transition-duration', '0s');
  expect(pageErrors).toEqual([]);
});
