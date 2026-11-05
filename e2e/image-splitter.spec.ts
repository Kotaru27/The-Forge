import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function pngFile(page: Page, name: string, width: number, height = 4) {
  const base64 = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    for (let x = 0; x < width; x++) {
      context.fillStyle = `rgb(${x * 26 % 256}, ${x * 37 % 256}, ${x * 53 % 256})`;
      context.fillRect(x, 0, 1, height);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { width, height });
  return { name, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}
async function upload(page: Page, files: Awaited<ReturnType<typeof pngFile>>[]) {
  await page.getByLabel('Upload images').setInputFiles(files);
  await expect(page.locator('.split-card')).toHaveCount(files.length);
}
async function zipDownload(page: Page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Zip' }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe('split_images.zip');
  return JSZip.loadAsync(await readFile(await download.path()));
}
function outputNames(zip: JSZip) {
  return Object.keys(zip.files).filter(name => !zip.files[name].dir).sort((a,b) => Number(a.split('.')[0]) - Number(b.split('.')[0]));
}
function pngSize(bytes: Buffer): [number, number] {
  expect(bytes.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test.beforeEach(async ({ page }) => {
  await page.goto('#/image-splitter');
  await expect(page.getByRole('region', { name: 'Image Splitter' })).toBeVisible();
});

test('default columns, manual split, and every pixel in nondivisible image stays in PNG exports', async ({ page }) => {
  await expect(page.getByLabel('Number of columns')).toHaveValue('2');
  await expect(page.getByRole('button', { name: 'Split Images' })).toBeDisabled();
  const sample = await pngFile(page, 'seven.png', 7);
  await upload(page, [sample]);
  await expect(page.getByRole('button', { name: 'Download Zip' })).toBeDisabled();
  await expect(page.locator('.split-grid-overlay span')).toHaveCount(2);
  await page.getByLabel('Number of columns').fill('3');
  await expect(page.locator('.split-grid-overlay span')).toHaveCount(3);
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.locator('.split-status')).toHaveText('Done (3)');
  const archive = await zipDownload(page);
  expect(outputNames(archive)).toEqual(['1.png','2.png','3.png']);
  const blobs = await Promise.all(['1.png','2.png','3.png'].map(name => archive.file(name)!.async('nodebuffer')));
  expect(blobs.map(pngSize)).toEqual([[2,4],[2,4],[3,4]]);
  // Decode actual zipped pixels in the browser: the pieces must be the original stripes in order.
  const samples = await page.evaluate(async encoded => {
    const output: number[] = [];
    for (const b64 of encoded) {
      const bytes = Uint8Array.from(atob(b64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        for (let x = 0; x < canvas.width; x++) output.push(context.getImageData(x, 0, 1, 1).data[0]);
      } finally { URL.revokeObjectURL(url); }
    }
    return output;
  }, blobs.map(buffer => buffer.toString('base64')));
  expect(samples).toEqual([0,26,52,78,104,130,156]);
});

test('unselected images remain unchanged in ZIP and retain their upload order', async ({ page }) => {
  const first = await pngFile(page, 'first.png', 10);
  const second = await pngFile(page, 'second.png', 12);
  await upload(page, [first, second]);
  await page.locator('.split-selection input').nth(1).uncheck();
  await page.getByLabel('Number of columns').fill('4');
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.locator('.split-status').first()).toHaveText('Done (4)');
  await expect(page.locator('.split-status').nth(1)).toHaveText('Ready');
  const zip = await zipDownload(page);
  expect(outputNames(zip)).toEqual(['1.png','2.png','3.png','4.png','5.png']);
  expect(await zip.file('5.png')!.async('nodebuffer')).toEqual(second.buffer);
});

test('changing column count discards outdated pieces; clear and undo restore exact selections and pieces', async ({ page }) => {
  const first = await pngFile(page, 'one.png', 9);
  const second = await pngFile(page, 'two.png', 9);
  await upload(page, [first, second]);
  await page.locator('.split-selection input').nth(1).uncheck();
  await page.getByLabel('Number of columns').fill('3');
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.locator('.split-status').first()).toHaveText('Done (3)');
  await page.getByLabel('Number of columns').fill('4');
  await expect(page.getByRole('button', { name: 'Download Zip' })).toBeDisabled();
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.locator('.split-status').first()).toHaveText('Done (4)');
  await page.getByRole('button', { name: 'Clear workspace' }).click();
  await expect(page.getByRole('dialog', { name: 'Reset Image Splitter' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Reset Image Splitter' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.split-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear workspace' }).click();
  await page.getByRole('dialog', { name: 'Reset Image Splitter' }).getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.split-card')).toHaveCount(0);
  await expect(page.getByLabel('Number of columns')).toHaveValue('2');
  await page.getByRole('button', { name: 'Undo reset' }).click();
  await expect(page.locator('.split-card')).toHaveCount(2);
  await expect(page.getByLabel('Number of columns')).toHaveValue('4');
  await expect(page.locator('.split-selection input').nth(1)).not.toBeChecked();
  await expect(page.locator('.split-status').first()).toHaveText('Done (4)');
  expect(outputNames(await zipDownload(page))).toEqual(['1.png','2.png','3.png','4.png','5.png']);
});

test('SVG split exports real PNG pieces and preserves selected/unselected behavior', async ({ page }) => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="11" height="4"><rect width="11" height="4" fill="red"/></svg>');
  await page.getByLabel('Upload images').setInputFiles([{ name:'art.svg', mimeType:'image/svg+xml', buffer:svg }]);
  await expect(page.locator('.split-card')).toHaveCount(1);
  await page.getByLabel('Number of columns').fill('3');
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.locator('.split-status')).toHaveText('Done (3)');
  const zip = await zipDownload(page);
  expect(outputNames(zip)).toEqual(['1.png','2.png','3.png']);
  const pieces = await Promise.all(outputNames(zip).map(n => zip.file(n)!.async('nodebuffer')));
  expect(pieces.map(pngSize)).toEqual([[3,4],[4,4],[4,4]]);
});

test('can reupload identical filenames; invalid files are skipped with a message', async ({ page }) => {
  const sample = await pngFile(page, 'again.png', 8);
  await upload(page, [sample]);
  await page.getByLabel('Upload images').setInputFiles([sample]);
  await expect(page.locator('.split-card')).toHaveCount(2);
  await page.getByLabel('Upload images').setInputFiles([{ name: 'notes.txt', mimeType:'text/plain',buffer:Buffer.from('notes') }]);
  await expect(page.getByRole('alert')).toContainText('Please choose image files');
  await expect(page.locator('.split-card')).toHaveCount(2);
});

test('50 columns supported and too narrow images fail clearly without silently dropping pixels', async ({ page }) => {
  const sample = await pngFile(page, 'tiny.png', 5);
  await upload(page, [sample]);
  await page.getByLabel('Number of columns').fill('50');
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.getByRole('alert')).toContainText('only 5px wide');
  await expect(page.getByRole('button', { name: 'Download Zip' })).toBeDisabled();
  await page.getByLabel('Number of columns').fill('5');
  await page.getByRole('button', { name: 'Split Images' }).click();
  await expect(page.locator('.split-status')).toHaveText('Done (5)');
});
