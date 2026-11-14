import { test, expect } from '@playwright/test';

const workrooms = [
  ['logo-resizer', '.logo-workspace'],
  ['pdf-to-image', '.pdf-workspace'],
  ['image-splitter', '.split-workspace'],
  ['video-stills', '.video-stills'],
  ['storyboard', '.storyboard-tool'],
  ['link-generator', '.link-generator'],
  ['ad-downloader', '.adw-workspace'],
] as const;

test('CTK home identity, mosaic and tool finder remain fully interactive', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');

  await expect(page.locator('.ctk-home-top')).toHaveCSS('background-color', 'rgb(17, 46, 34)');
  await expect(page.locator('.ctk-home')).toHaveCSS('background-color', 'rgb(240, 238, 228)');
  await expect(page.getByRole('heading', { name: 'The Forge' })).toBeVisible();
  await expect(page.locator('.ctk-home-card')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');

  const finder = page.getByRole('searchbox', { name: 'Find a Forge tool' });
  await finder.fill('PDF');
  await expect(page.getByRole('button', { name: 'Open PDF to Image' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Open Storyboard' })).toBeDisabled();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(finder).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Open Storyboard' })).toBeEnabled();

  await page.screenshot({ path: testInfo.outputPath('ctk-home-native.png') });
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page).toHaveURL(/#\/logo-resizer$/);
  expect(errors).toEqual([]);
});

for (const [tool, selector] of workrooms) {
  test('CTK light workroom shell: ' + tool, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('#/' + tool);
    await expect(page.locator('.forge-ctk-ui')).toBeVisible();
    await expect(page.locator('.topbar')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('.forge-ctk-tool-name')).toBeVisible();
    await expect(page.locator(selector)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('ctk-' + tool + '.png') });
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('region', { name: 'The Forge home' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('Every React workroom uses the same CTK pictogram rail and centered tool header', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [tool] of workrooms) {
    await page.goto('#/' + tool);
    const sidebar = page.locator('.sidebar');
    const nav = page.getByRole('navigation', { name: 'Select a tool' });
    const selected = nav.locator('.tool-link[aria-current="page"]');
    await expect(sidebar).toHaveCSS('background-color', 'rgb(38, 54, 47)');
    await expect(nav.getByRole('button')).toHaveCount(8);
    await expect(nav.locator('.forge-ctk-rail-icon svg')).toHaveCount(8);
    await expect(selected).toHaveAttribute('aria-current', 'page');
    await expect(selected).toHaveCSS('background-color', 'rgb(229, 236, 228)');
    await expect(page.locator('.forge-ctk-header-icon svg')).toHaveCount(1);
    await expect(page.locator('.forge-ctk-top-home')).toHaveText('The Forge');
    await expect(page.locator('.topbar')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const title = await page.locator('.forge-ctk-tool-name').boundingBox();
    const topbar = await page.locator('.topbar').boundingBox();
    expect(title && topbar).toBeTruthy();
    if (title && topbar) {
      expect(Math.abs(title.x + title.width / 2 - (topbar.x + topbar.width / 2))).toBeLessThan(2);
    }
    await page.screenshot({ path: testInfo.outputPath('ctk-unified-' + tool + '.png') });
  }
});
