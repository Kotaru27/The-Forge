import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const videoPath = path.resolve('e2e/fixtures/stills.webm');

async function upload(page: import('@playwright/test').Page, name = 'Campaign One.webm', itemCount = 3) {
  await page.getByLabel('Choose video files').setInputFiles({ name, mimeType: 'video/webm', buffer: await readFile(videoPath) });
  const card = page.getByRole('button', { name: /Inspect stills from/ }).filter({ hasText: `${itemCount} items` });
  await expect(card).toBeEnabled({ timeout: 40_000 });
  return card;
}
async function downloadZip(page: import('@playwright/test').Page, button: import('@playwright/test').Locator) {
  const received = page.waitForEvent('download');
  await button.click();
  const download = await received;
  const buffer = await readFile(await download.path());
  return { download, zip: await JSZip.loadAsync(buffer) };
}

async function assertStoryboardOpened(page: import('@playwright/test').Page) {
  try {
    await expect(page.getByRole('heading', { name: 'Storyboard' })).toBeVisible({ timeout: 30_000 });
  } catch (cause) {
    const errors = await page.locator('.vs-error').allTextContents();
    const messages = await page.locator('.vs-notice').allTextContents();
    const frameReady = await page.locator('iframe[title="The Forge tool workspace"]').getAttribute('data-ready');
    throw new Error(`Storyboard transfer did not open. Errors: ${errors.join(' | ')}; notices: ${messages.join(' | ')}; frame ready: ${frameReady}; underlying: ${String(cause)}`);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('#/video-stills');
  await expect(page.getByRole('heading', { name: 'Video Stills' })).toBeVisible();
});

test('uploads video, extracts three uniform full-size JPEGs and downloads selected ZIP', async ({ page }) => {
  const card = await upload(page);
  await card.click();
  await expect(page.getByRole('dialog', { name: /Frames from Campaign_One/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Preview frame/ })).toHaveCount(3);
  await page.getByLabel('Select frame 2').uncheck();
  const { download, zip } = await downloadZip(page, page.getByRole('button', { name: 'Download selected' }));
  expect(download.suggestedFilename()).toBe('Campaign_One_stills.zip');
  expect(Object.keys(zip.files).filter(name => name.endsWith('.jpg'))).toEqual(['1.jpg','2.jpg']);
  const frame = await zip.file('1.jpg')!.async('uint8array');
  expect(Array.from(frame.slice(0, 3))).toEqual([0xff, 0xd8, 0xff]);
  const blobData = Array.from(frame);
  const dims = await page.evaluate(async data => {
    const blob = new Blob([new Uint8Array(data)], { type: 'image/jpeg' });
    const bitmap = await createImageBitmap(blob);
    const result = [bitmap.width, bitmap.height];
    bitmap.close();
    return result;
  }, blobData);
  expect(dims).toEqual([160,90]);
});

test('preview keyboard navigation and Select all work without changing each frame', async ({ page }) => {
  await (await upload(page)).click();
  const modal = page.getByRole('dialog', { name: /Frames from/ });
  await expect(modal.getByRole('img', { name: /frame 1/ })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(modal.getByRole('img', { name: /frame 2/ })).toBeVisible();
  await modal.getByLabel('Select frame 3').uncheck();
  await expect(modal.getByText('2 selected')).toBeVisible();
  await page.keyboard.press('Control+a');
  await expect(modal.getByText('3 selected')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
});

test('Download All keeps collections separate even when filenames collide', async ({ page }) => {
  const buffer = await readFile(videoPath);
  await page.getByLabel('Choose video files').setInputFiles([
    { name: 'Same Name.webm', mimeType: 'video/webm', buffer },
    { name: 'Same Name.webm', mimeType: 'video/webm', buffer },
  ]);
  await expect(page.getByText('3 items')).toHaveCount(2, { timeout: 60_000 });
  const { download, zip } = await downloadZip(page, page.getByRole('button', { name: 'Download All' }));
  expect(download.suggestedFilename()).toBe('video_extras.zip');
  expect(Object.keys(zip.files).filter(name => name.endsWith('.jpg')).sort()).toEqual([
    'Same_Name/1.jpg','Same_Name/2.jpg','Same_Name/3.jpg',
    'Same_Name_2/1.jpg','Same_Name_2/2.jpg','Same_Name_2/3.jpg',
  ]);
});

test('optional contact sheet exports storyboard.jpg and keeps still frame count', async ({ page }) => {
  await page.getByLabel('Create contact sheet').check();
  await page.getByLabel('Contact sheet layout').selectOption('6');
  await expect(page.getByLabel('Contact sheet layout')).toHaveValue('6');
  const card = await upload(page, 'Campaign One.webm', 4);
  await expect(card).toContainText('4 items');
  await card.click();
  const { zip } = await downloadZip(page, page.getByRole('button', { name: 'Download selected' }));
  expect(zip.file('storyboard.jpg')).not.toBeNull();
  expect(zip.file('3.jpg')).not.toBeNull();
});

test('clear is confirmed and cancel keeps videos intact', async ({ page }) => {
  await upload(page);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: 'Clear workspace?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: /Inspect stills/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByText('0 videos')).toBeVisible();
});

test('Send to Board creates new Storyboard project with chosen JPEG stills', async ({ page }) => {
  await upload(page);
  await page.getByRole('button', { name: 'Send to Board' }).click();
  await assertStoryboardOpened(page);
  const story = page.frameLocator('iframe[title="The Forge tool workspace"]');
  await expect(story.locator('#stillsTabContentStory')).toBeVisible();
  await expect(story.locator('#storyFileList .story-asset-row')).toHaveCount(3);
});

test('Send to Filmstrip sends only checked stills and opens Filmstrip', async ({ page }) => {
  await (await upload(page)).click();
  await page.getByLabel('Select frame 2').uncheck();
  await page.getByRole('button', { name: 'Send to Filmstrip' }).click();
  await assertStoryboardOpened(page);
  const filmstrip = page.frameLocator('iframe[title="The Forge tool workspace"]');
  await expect(filmstrip.locator('#stillsTabContentFilmstrip')).toBeVisible();
  await expect(filmstrip.locator('#filmstripFileList .story-asset-row')).toHaveCount(2);
});

test('navigating away does not discard extracted frames', async ({ page }) => {
  await upload(page);
  await page.getByRole('navigation', { name: 'Select a tool' }).getByRole('button', { name: 'Logo Resizer' }).click();
  await page.getByRole('navigation', { name: 'Select a tool' }).getByRole('button', { name: 'Video Stills' }).click();
  await expect(page.getByRole('button', { name: /Inspect stills/ })).toHaveCount(1);
});

test('non-video upload reports skipped files without losing workspace', async ({ page }) => {
  await page.getByLabel('Choose video files').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('text') });
  await expect(page.getByRole('alert')).toContainText('non-video');
  await expect(page.getByText('0 videos')).toBeVisible();
});


test('two video sources become separate boards and repeated transfer does not duplicate frames', async ({ page }) => {
  const buffer = await readFile(videoPath);
  await page.getByLabel('Choose video files').setInputFiles([
    { name: 'Ad A.webm', mimeType: 'video/webm', buffer },
    { name: 'Ad B.webm', mimeType: 'video/webm', buffer },
  ]);
  await expect(page.getByText('3 items')).toHaveCount(2, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Send to Board' }).click();
  await assertStoryboardOpened(page);
  const story = page.frameLocator('iframe[title="The Forge tool workspace"]');
  const chooser = story.locator('#storyBoardSelect');
  await expect(chooser.locator('option')).toHaveCount(2);
  await chooser.selectOption({ label: 'Ad_A' });
  await expect(story.locator('#storyFileList .story-asset-row')).toHaveCount(3);
  await chooser.selectOption({ label: 'Ad_B' });
  await expect(story.locator('#storyFileList .story-asset-row')).toHaveCount(3);
  await page.getByRole('navigation', { name: 'Select a tool' }).getByRole('button', { name: 'Video Stills' }).click();
  await page.getByRole('button', { name: 'Send to Board' }).click();
  await expect(chooser.locator('option')).toHaveCount(2);
});

test('clear during an active batch does not block later uploads', async ({ page }) => {
  const buffer = await readFile(videoPath);
  await page.getByLabel('Choose video files').setInputFiles([
    { name: 'Old A.webm', mimeType: 'video/webm', buffer },
    { name: 'Old B.webm', mimeType: 'video/webm', buffer },
  ]);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByText('0 videos')).toBeVisible();
  await upload(page, 'New Video.webm');
  await expect(page.getByRole('button', { name: /Inspect stills from/ })).toHaveCount(1);
});
