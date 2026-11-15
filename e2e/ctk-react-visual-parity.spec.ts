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

test('Ink & Paper Home artwork, seven cards and tool finder remain interactive', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');

  await expect(page.locator('.sketch-notebook-frame')).toHaveCSS('background-color', 'rgb(243, 236, 221)');
  await expect(page.locator('.forge-sketch-ui')).toHaveCSS('color', 'rgb(31, 35, 40)');
  await expect(page.locator('.sketch-header-band')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'THE FORGE', level: 1, exact: true })).toBeVisible();
  await expect(page.locator('.forge-home-card.sketch-tool-card')).toHaveCount(7);
  await expect(page.locator('.sketch-card-art')).toHaveCount(7);
  await expect(page.locator('.sidebar')).toHaveCount(0);

  const finder = page.getByRole('searchbox', { name: 'Find a Forge tool' });
  await finder.fill('PDF');
  await expect(page.getByRole('button', { name: 'Open PDF to Image' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Open Storyboard' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show all tools' }).click();
  await expect(finder).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Open Storyboard' })).toBeEnabled();

  await page.screenshot({ path: testInfo.outputPath('ctk-home-native.png') });
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page).toHaveURL(/#\/logo-resizer$/);
  expect(errors).toEqual([]);
});

for (const [tool, selector] of workrooms) {
  test('Ink & Paper workroom shell: ' + tool, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('#/' + tool);
    await expect(page.locator('.forge-ctk-ui')).toBeVisible();
    await expect(page.locator('.topbar.sketch-topbar')).toHaveCSS('background-color', 'rgba(244, 236, 220, 0.72)');
    await expect(page.locator('.forge-ctk-tool-name')).toBeVisible();
    await expect(page.locator(selector)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('ctk-' + tool + '.png') });
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('region', { name: 'The Forge home' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('Every Ink & Paper workroom uses accessible illustrated navigation and centered header', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [tool] of workrooms) {
    await page.goto('#/' + tool);
    const sidebar = page.locator('.sidebar');
    const nav = page.getByRole('navigation', { name: 'Select a tool' });
    const selected = nav.locator('.sketch-subtool-link[aria-current="page"]');
    await expect(sidebar).toHaveCSS('background-color', 'rgba(238, 229, 210, 0.72)');
    await expect(nav.getByRole('button')).toHaveCount(8);
    await expect(nav.locator('.sketch-nav-icon svg, .sketch-subtool-icon svg')).toHaveCount(8);
    await expect(selected).toHaveAttribute('aria-current', 'page');
    await expect(selected).toHaveClass(/is-active/);
    await expect(page.locator('.forge-ctk-header-icon svg')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'The Forge home' })).toBeVisible();
    await expect(page.locator('.topbar.sketch-topbar')).toHaveCSS('background-color', 'rgba(244, 236, 220, 0.72)');
    const title = await page.locator('.forge-ctk-tool-name').boundingBox();
    const topbar = await page.locator('.topbar').boundingBox();
    expect(title && topbar).toBeTruthy();
    if (title && topbar) {
      expect(Math.abs(title.x + title.width / 2 - (topbar.x + topbar.width / 2))).toBeLessThan(2);
    }
    await page.screenshot({ path: testInfo.outputPath('ctk-unified-' + tool + '.png') });
  }
});

test('Ink & Paper Logo Resizer keeps input actions and accessible control contrast', async ({ page }) => {
  await page.goto('#/logo-resizer');
  await expect(page.locator('.logo-empty .forge-v5-drop-icon svg')).toHaveCount(1);
  await expect(page.locator('.logo-empty .forge-v5-drop-icon svg')).toHaveCSS('color','rgb(31, 35, 40)');
  await expect(page.getByRole('button', { name: /Choose files/ })).toHaveCount(0);
  await expect(page.locator('.forge-v5-board-heading > small')).toHaveCount(0);
  await expect(page.getByText('LIVE PREVIEW', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Add assets/ })).toBeVisible();
  await expect(page.locator('.forge-v5-checkboxes label').first()).toHaveCSS('background-color','rgb(246, 239, 224)');
  await expect(page.locator('.forge-v5-checkboxes label').first()).toHaveCSS('color','rgb(31, 35, 40)');
  await expect(page.locator('.forge-v5-swatch')).toHaveCSS('background-color','rgb(246, 239, 224)');
});

test('Ink & Paper Image Splitter drop zone retains contrast and action', async ({ page }) => {
  await page.goto('#/image-splitter');
  await expect(page.locator('.split-drop')).toHaveCSS('background-color','rgba(247, 241, 227, 0.85)');
  await expect(page.locator('.split-drop > span')).toHaveCSS('color','rgb(47, 69, 98)');
  await expect(page.getByRole('button',{name:'Add Images'})).toHaveCSS('background-color','rgb(248, 241, 226)');
  await expect(page.getByRole('button',{name:'Add Images'})).toHaveCSS('color','rgb(31, 35, 40)');
});

test('Ink & Paper sidebar never scrolls sideways while all eight destinations remain reachable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('#/logo-resizer');
  const nav = page.getByRole('navigation', { name: 'Select a tool' });
  await expect(nav.getByRole('button')).toHaveCount(8);
  await expect(nav).toHaveCSS('overflow-x', 'hidden');
  await expect(nav).toHaveCSS('overflow-y', 'auto');
  const measure = () => nav.evaluate(el => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
    scrollTop: el.scrollTop,
  }));
  const desktop = await measure();
  expect(desktop.scrollWidth).toBeLessThanOrEqual(desktop.clientWidth);
  await page.screenshot({ path: testInfo.outputPath('ctk-sidebar-no-horizontal-scroll.png') });

  await page.setViewportSize({ width: 1280, height: 500 });
  const compact = await measure();
  expect(compact.scrollWidth).toBeLessThanOrEqual(compact.clientWidth);
  expect(compact.scrollHeight).toBeGreaterThan(compact.clientHeight);
  await nav.hover();
  await page.mouse.wheel(0, 420);
  await expect.poll(async () => (await measure()).scrollTop).toBeGreaterThan(0);
  await nav.getByRole('button', { name: 'Ad Downloader' }).click();
  await expect(page).toHaveURL(/#\/ad-downloader$/);
  await expect(nav.getByRole('button', { name: 'Ad Downloader' })).toHaveAttribute('aria-current', 'page');
  const after = await measure();
  expect(after.scrollWidth).toBeLessThanOrEqual(after.clientWidth);
});
