import { test, expect } from '@playwright/test';

const workbenches = [
  ['pdf-to-image', 'PDF to Image', '.pdf-workspace'],
  ['image-splitter', 'Image Splitter', '.split-workspace'],
  ['video-stills', 'Video Stills', '.video-stills'],
  ['storyboard', 'Storyboard', '.storyboard-tool'],
  ['link-generator', 'Link Generator', '.link-generator'],
  ['ad-downloader', 'Ad Downloader', '.adw-workspace'],
] as const;

test('Home is the landing page and every workbench card launches a real tool', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('./');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByRole('region', { name: 'The Forge home' })).toBeVisible();
  await expect(page.locator('.forge-home-card')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png') });
  await page.getByRole('button', { name: 'Open PDF to Image' }).click();
  await expect(page).toHaveURL(/#\/pdf-to-image$/);
  await expect(page.getByRole('region', { name: 'PDF to Image' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('region', { name: 'The Forge home' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page.locator('.forge-v5-shell')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Logo Resizer' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.forge-collection-shell')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [id, label, selector] of workbenches) {
  test(label + ' has the redesigned workspace and retains its controls', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('#/' + id);
    const workspace = page.locator(selector);
    await expect(workspace).toBeVisible();
    await expect(page.locator('.forge-collection-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
    const geometry = await workspace.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, right: rect.right, width: rect.width, height: rect.height };
    });
    expect(geometry.width).toBeGreaterThan(500);
    expect(geometry.height).toBeGreaterThan(350);
    expect(geometry.right).toBeLessThanOrEqual(1442);
    await page.screenshot({ path: testInfo.outputPath(id + '-desktop.png') });
    if (id === 'video-stills') {
      const side = workspace.locator('.vs-workbench-side');
      const gallery = workspace.locator('.vs-content');
      await expect(side).toBeVisible();
      await expect(gallery).toBeVisible();
      const widths = await Promise.all([side, gallery].map(x => x.evaluate(el => el.getBoundingClientRect().width)));
      expect(widths[0]).toBeGreaterThan(235);
      expect(widths[1]).toBeGreaterThan(350);
    }
    expect(errors).toEqual([]);
  });
}

test('approved Logo Resizer V5 retains its own styling and processing UI', async ({ page }, testInfo) => {
  await page.goto('#/logo-resizer');
  await expect(page.locator('.forge-v5-shell')).toBeVisible();
  await expect(page.locator('.forge-collection-shell')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Logo Resizer' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('logo-approved-v5.png') });
});
