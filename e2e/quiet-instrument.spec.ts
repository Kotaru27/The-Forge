import { expect, test } from '@playwright/test';

/** Visual-only acceptance gates; no processing modules or feature contracts altered. */
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAHUlEQVR4nGP8z8Dwn4GGgImWho9aMGrBqAXDxQIARZACFmekxckAAAAASUVORK5CYII=',
  'base64',
);

test('Quiet Instrument active selection follows all navigation without creating new routes', async ({ page }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  await expect(nav.getByRole('button')).toHaveCount(8);
  await expect(nav.locator('.qi-rail-plate')).toHaveCount(1);
  await expect(nav.getByRole('button', { name: 'Home', exact: true })).toHaveClass(/is-active/);

  await nav.getByRole('button', { name: 'Logo Resizer' }).click();
  await expect(page).toHaveURL(/#\/logo-resizer$/);
  await expect(nav.getByRole('button', { name: 'Logo Resizer' })).toHaveClass(/is-active/);
  await expect(nav.locator('.qi-rail-plate')).toHaveCount(1);

  await nav.getByRole('button', { name: 'PDF to Image' }).click();
  await expect(page).toHaveURL(/#\/pdf-to-image$/);
  await expect(nav.locator('.qi-rail-plate')).toHaveCount(1);
  await nav.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('region', { name: 'The Forge home' })).toBeVisible();
});

test('Logo preset motion and Focus inspector preserve dimensions, controls and gallery space', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('#/logo-resizer');
  await page.locator('.logo-workspace input[type=file]').setInputFiles({
    name: 'motion-parity.png', mimeType: 'image/png', buffer: png,
  });
  await page.getByRole('dialog', { name: 'Set logo dimensions' })
    .getByRole('button', { name: 'Apply & process' }).click();
  await expect(page.locator('.logo-card')).toHaveCount(1);

  await page.locator('.forge-v5-presets').getByRole('button', { name: '200 × 150' }).click();
  await expect(page.locator('.forge-v5-preset-grid .qi-preset-plate')).toHaveCount(1);
  const dims = await page.locator('.logo-preview').first().evaluate(node => {
    const canvas = node as HTMLCanvasElement;
    return [canvas.width, canvas.height];
  });
  expect(dims).toEqual([200, 150]);

  const gallery = page.locator('.logo-gallery');
  const before = await gallery.evaluate(element => element.getBoundingClientRect().width);
  await page.getByRole('button', { name: /Open Focus Mode for/ }).click();
  await expect(page.getByLabel('Focus Mode', { exact: true })).toBeVisible();
  await expect(page.locator('.logo-body')).toHaveClass(/qi-focus-open/);
  await expect.poll(() => gallery.evaluate(element => element.getBoundingClientRect().width))
    .toBeLessThan(before - 220);

  await page.getByRole('button', { name: 'Close Focus Mode' }).click();
  await expect(page.getByLabel('Focus Mode', { exact: true })).toHaveCount(0);
  await expect.poll(() => gallery.evaluate(element => element.getBoundingClientRect().width))
    .toBeGreaterThan(before - 8);
});

test('all eight Logo control groups fit at common desktop widths', async ({ page }) => {
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('#/logo-resizer');
    await expect(page.locator('.forge-v5-group')).toHaveCount(8);
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      gallery: document.querySelector('.logo-gallery')?.getBoundingClientRect().height ?? 0,
    }));
    expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.gallery).toBeGreaterThan(100);
  }
});
