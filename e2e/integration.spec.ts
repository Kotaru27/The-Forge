import { test, expect, type Page } from '@playwright/test';

const released = [
  ['logo-resizer', 'Logo Resizer'],
  ['pdf-to-image', 'PDF to Image'],
  ['image-splitter', 'Image Splitter'],
  ['video-stills', 'Video Stills'],
  ['storyboard', 'Storyboard'],
  ['link-generator', 'Link Generator'],
  ['ad-downloader', 'Ad Downloader'],
] as const;

function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Select a tool' });
}

test('seven React tools navigate together without loading the legacy compressor iframe', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('#/logo-resizer');
  await expect(nav(page).getByRole('button')).toHaveCount(7);
  await expect(nav(page).getByRole('button', { name: 'Video Compressor' })).toHaveCount(0);

  for (const [id, label] of released) {
    await nav(page).getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
    await expect(page).toHaveURL(new RegExp('#/' + id + '$'));
    await expect(page.locator('iframe')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('direct Storyboard links work and compressor/invalid links fall back safely', async ({ page }) => {
  await page.goto('#/storyboard');
  await expect(page.getByRole('heading', { name: 'Storyboard', level: 1 })).toBeVisible();
  await expect(nav(page).getByRole('button', { name: 'Storyboard' })).toHaveAttribute('aria-current', 'page');
  await page.evaluate(() => { window.location.hash = '#/video-compressor'; });
  await expect(page).toHaveURL(/#\/logo-resizer$/);
  await expect(page.getByRole('heading', { name: 'Logo Resizer', level: 1 })).toBeVisible();
  await page.evaluate(() => { window.location.hash = '#/not-a-tool'; });
  await expect(page).toHaveURL(/#\/logo-resizer$/);
  await page.reload();
  await expect(nav(page).getByRole('button')).toHaveCount(7);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('Link Generator keeps entered data and output when switching to another tool', async ({ page }) => {
  await page.goto('#/link-generator');
  await page.getByLabel('Folder / Path').fill('Campaign/Launch');
  await page.getByLabel('Filenames').fill('first.jpg\nsecond.mp4');
  await page.getByLabel('Server').selectOption('s3');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const before = await page.locator('#link-exposure').inputValue();
  expect(before).toContain('first.jpg');
  expect(before).toContain('second.mp4');

  await nav(page).getByRole('button', { name: 'PDF to Image' }).click();
  await expect(page.getByRole('heading', { name: 'PDF to Image', level: 1 })).toBeVisible();
  await nav(page).getByRole('button', { name: 'Link Generator' }).click();
  await expect(page.getByLabel('Folder / Path')).toHaveValue('Campaign/Launch');
  await expect(page.getByLabel('Filenames')).toHaveValue('first.jpg\nsecond.mp4');
  await expect(page.getByLabel('Server')).toHaveValue('s3');
  await expect(page.locator('#link-exposure')).toHaveValue(before);
});

test('Image Splitter retains uploaded assets and settings across navigation', async ({ page }) => {
  await page.goto('#/image-splitter');
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 9;
    canvas.height = 6;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3988aa';
    ctx.fillRect(0, 0, 9, 6);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload images').setInputFiles({
    name: 'saved.png',
    mimeType: 'image/png',
    buffer: Buffer.from(encoded, 'base64'),
  });
  await expect(page.locator('.split-card')).toHaveCount(1);
  await page.getByLabel('Number of columns').fill('3');
  await nav(page).getByRole('button', { name: 'Storyboard' }).click();
  await nav(page).getByRole('button', { name: 'Image Splitter' }).click();
  await expect(page.locator('.split-card')).toHaveCount(1);
  await expect(page.locator('img[alt="Preview saved.png"]')).toBeVisible();
  await expect(page.getByLabel('Number of columns')).toHaveValue('3');
});

test('preview serves the same /The-Forge/ asset paths GitHub Pages uses', async ({ page, request }) => {
  await page.goto('#/link-generator');
  await expect(page.getByRole('heading', { name: 'Link Generator', level: 1 })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/The-Forge/');
  const modulePath = await page.locator('script[type="module"][src]').first().getAttribute('src');
  expect(modulePath).toMatch(/^\/The-Forge\/assets\//);
  const result = await request.get(new URL(modulePath!, page.url()).toString());
  expect(result.status()).toBe(200);
});
