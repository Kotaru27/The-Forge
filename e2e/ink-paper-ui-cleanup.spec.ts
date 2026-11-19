import { test, expect } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

test('Link Generator hides the redundant review title without losing outputs', async ({ page }) => {
  await openForgeRoute(page, 'link-generator');
  await expect(page.getByText('Review & generate', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Filename order' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Generated outputs' })).toBeVisible();

  await page.getByLabel('Folder / Path').fill('Campaign');
  await page.getByLabel('Filenames').fill('first.jpg\nsecond.mp4');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#link-exposure')).toHaveValue(/first\.jpg/);
  await expect(page.locator('#link-exposure')).toHaveValue(/second\.mp4/);
});

test('Storyboard places Board Name next to Add Assets and hides advanced UI only', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openForgeRoute(page, 'storyboard');

  const toolbar = page.locator('.sb-toolbar');
  const addAssets = toolbar.getByRole('button', { name: 'Add Assets' });
  const boardName = toolbar.getByRole('textbox', { name: 'Board Name' });
  await expect(addAssets).toBeVisible();
  await expect(boardName).toBeVisible();
  const addBox = await addAssets.boundingBox();
  const nameBox = await boardName.boundingBox();
  expect(addBox && nameBox).toBeTruthy();
  if (addBox && nameBox) {
    expect(nameBox.x).toBeGreaterThanOrEqual(addBox.x + addBox.width);
    expect(Math.abs(nameBox.y - addBox.y)).toBeLessThan(22);
  }

  await expect(page.getByRole('button', { name: 'Add Folder' })).toHaveCount(0);
  await expect(page.locator('input[aria-label="Choose storyboard folder"]')).toHaveCount(1);
  await expect(page.getByText('More layout settings', { exact: true })).toBeHidden();
  await expect(page.locator('input[aria-label="Board gap"]')).toBeHidden();

  await boardName.fill('Campaign Board');
  await expect(boardName).toHaveValue('Campaign Board');
  await page.getByRole('button', { name: '+ New Board' }).click();
  await expect(boardName).toHaveValue('Board_2');
  await page.getByLabel('Choose a storyboard').selectOption({ label: 'Campaign Board' });
  await expect(boardName).toHaveValue('Campaign Board');
});

test('Fit to Platform hides typography controls while retaining upload and statement', async ({ page }) => {
  await openForgeRoute(page, 'storyboard');
  await page.getByRole('tab', { name: 'Fit to Platform' }).click();
  await expect(page.getByText('Image and typography', { exact: true })).toBeHidden();
  await expect(page.locator('select[aria-label="Fit image mode"]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Upload Image' })).toBeVisible();
  await expect(page.getByLabel('Fit statement')).toBeVisible();
  await expect(page.locator('.sb-fit-stage canvas')).toBeVisible();
});


test('all seven workspaces use legible static typography on AMOLED', async ({ page }) => {
  const samples = [
    ['logo-resizer', '.forge-v5-group-title'],
    ['pdf-to-image', '.pdf-setup h2'],
    ['image-splitter', '.split-settings h2'],
    ['video-stills', '.vs-options'],
    ['storyboard', '.sb-section-head strong'],
    ['link-generator', '.link-panel .link-subheading h3'],
    ['ad-downloader', '.adw-header p'],
  ] as const;
  for (const [route, selector] of samples) {
    await openForgeRoute(page, route);
    const target = page.locator(selector).first();
    await expect(target, route).toBeVisible();
    await expect(target).toHaveCSS('animation-name', 'none');
    const actual = await target.evaluate(el => getComputedStyle(el).color);
    expect(actual, route + ': text should not be paper-dark').not.toBe('rgb(31, 35, 40)');
  }
});

test('sketch illustrations, handwriting and transitions are absent', async ({ page }) => {
  await openForgeRoute(page, 'home');
  await expect(page.locator('.sketch-tool-card')).toHaveCount(7);
  await expect(page.locator('.pencil-wordmark-art, .sketch-card-border-svg, .sketch-card-spiral')).toHaveCount(0);
  await expect(page.locator('.sketch-hero-center h1')).toHaveText('THE FORGE');
  await expect(page.locator('.sketch-tool-card').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.sketch-tool-card').first()).toHaveCSS('transition-property', 'none');
  await openForgeRoute(page, 'storyboard');
  await expect(page.getByRole('button', { name: 'Add Assets' })).toBeVisible();
});
