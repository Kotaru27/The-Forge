import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAHUlEQVR4nGP8z8Dwn4GGgImWho9aMGrBqAXDxQIARZACFmekxckAAAAASUVORK5CYII=', 'base64');
const sample = { name: 'SampleLogo.png', mimeType: 'image/png', buffer: png };

async function createPowerPoint() {
  const zip = new JSZip();
  zip.file('ppt/slides/slide1.xml', '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><a:blip r:embed="rId1"/><a:blip r:embed="rId1"/></p:sld>');
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="../media/image1.png"/></Relationships>');
  zip.file('ppt/media/image1.png', png);
  return zip.generateAsync({ type: 'nodebuffer' });
}
async function createExcel() {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet 1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', '<?xml version="1.0"?><worksheet/>');
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', '<?xml version="1.0"?><Relationships><Relationship Type="https://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
  zip.file('xl/drawings/drawing1.xml', '<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><a:blip r:embed="rId2"/></xdr:wsDr>');
  zip.file('xl/drawings/_rels/drawing1.xml.rels', '<?xml version="1.0"?><Relationships><Relationship Id="rId2" Target="../media/image2.png"/></Relationships>');
  zip.file('xl/media/image2.png', png);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function addFiles(page: import('@playwright/test').Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.locator('.logo-workspace input[type="file"]').setInputFiles(files);
  await expect(page.getByRole('dialog', { name: 'Set logo dimensions' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Set logo dimensions' }).getByRole('button', { name: 'Apply & process' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('#/logo-resizer');
  await expect(page.getByRole('region', { name: 'Logo Resizer' })).toBeVisible();
});

test('four presets, white background, exact output dimensions and matching ZIP filenames', async ({ page }) => {
  await addFiles(page, [sample, { ...sample, name: 'AnotherLogo.png' }]);
  await expect(page.locator('.logo-card')).toHaveCount(2);
  const names = ['150 × 150', '200 × 200', '200 × 150', '250 × 250'];
  const shapes = [[150,150],[200,200],[200,150],[250,250]];
  for (let i = 0; i < names.length; i++) {
    await page.locator('.logo-settings').getByRole('button', { name: names[i] }).click();
    const result = await page.locator('.logo-preview').first().evaluate(canvas => {
      const element = canvas as HTMLCanvasElement;
      const corner = element.getContext('2d')!.getImageData(element.width - 1, element.height - 1, 1, 1).data;
      return [element.width, element.height, ...corner.slice(0, 3)];
    });
    expect(result).toEqual([...shapes[i], 255, 255, 255]);
  }
  const fields = page.locator('.logo-card-heading input');
  await fields.nth(0).fill('Repeat');
  await fields.nth(1).fill('repeat');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP' }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe('batch_logos.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  const paths = Object.keys(zip.files).filter(name => !zip.files[name].dir);
  expect(paths.sort()).toEqual(['Repeat.png','repeat_2.png'].sort());
});

test('individual edits, focus, save image, clear and undo retain edits', async ({ page }) => {
  await addFiles(page, [sample]);
  await expect(page.locator('.logo-card')).toHaveCount(1);
  await page.locator('.logo-card-controls textarea').fill('Brand ABC');
  await expect(page.locator('.logo-card-heading input')).toHaveValue('Brand_ABC');
  await page.getByRole('button', { name: /Open Focus Mode for/ }).click();
  await expect(page.getByLabel('Focus Mode', { exact: true })).toBeVisible();
  const padding = page.getByLabel('Focus Mode', { exact: true }).getByLabel('Image padding');
  await padding.focus();
  await padding.press('ArrowRight');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image' }).click();
  expect((await event).suggestedFilename()).toBe('Brand_ABC.png');
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByRole('dialog', { name: 'Clear logo workspace' }).getByRole('button', { name: 'Clear all' }).click();
  await expect(page.locator('.logo-card')).toHaveCount(0);
  await page.getByRole('button', { name: /Undo with all edits/ }).click();
  await expect(page.locator('.logo-card-controls textarea')).toHaveValue('Brand ABC');
  await expect(page.locator('.logo-card-heading input')).toHaveValue('Brand_ABC');
});

test('extracts from PPTX with duplicates removed, and XLSX drawing media', async ({ page }) => {
  await addFiles(page, [{ name:'slide.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: await createPowerPoint() }]);
  await expect(page.locator('.logo-card')).toHaveCount(1);
  await addFiles(page, [{ name:'sheet.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: await createExcel() }]);
  await expect(page.locator('.logo-card')).toHaveCount(2);
  await expect(page.locator('.logo-error')).toHaveCount(0);
});

test('logo links preserve template, server choice and no-logo fallback', async ({ page }) => {
  await page.getByRole('button', { name: 'Generate links' }).click();
  await page.getByRole('dialog', { name: 'Generate logo links' }).getByLabel('Brand names (one per line)').fill('Brand A');
  await page.getByRole('dialog', { name: 'Generate logo links' }).getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: 'No logos uploaded' })).toBeVisible();
  await page.getByRole('button', { name: 'Proceed anyway' }).click();
  await expect(page.getByRole('dialog', { name: 'Generate logo links' }).getByLabel('Generated HTML')).toHaveValue(/Brand_A\.png/);
});

test('SVGs can scale up, JPG download remains white and focus arrows work', async ({ page }) => {
  const vector = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><rect width="24" height="12" fill="#ff0000"/></svg>');
  await addFiles(page, [{ name: 'Vector.svg', mimeType: 'image/svg+xml', buffer: vector }, sample]);
  await expect(page.locator('.logo-card')).toHaveCount(2);
  await page.locator('.logo-settings').getByRole('button', { name: '250 × 250' }).click();
  const svgPreview = page.locator('.logo-card').nth(1).locator('canvas');
  await expect(svgPreview).toHaveCount(1);
  const center = await svgPreview.evaluate(canvas => {
    const c = canvas as HTMLCanvasElement;
    return [...c.getContext('2d')!.getImageData(125, 125, 1, 1).data].slice(0,3);
  });
  expect(center).toEqual([255,0,0]);

  await page.locator('.logo-settings select').nth(1).selectOption('Georgia');
  await page.locator('.logo-settings').getByLabel('Download format').selectOption('jpeg');
  await page.getByRole('button', { name: /Open Focus Mode for/ }).first().click();
  const firstFilename = await page.getByLabel('Focus Mode', { exact: true }).getByLabel('Filename').inputValue();
  await page.keyboard.press('ArrowRight');
  const secondFilename = await page.getByLabel('Focus Mode', { exact: true }).getByLabel('Filename').inputValue();
  expect(secondFilename).not.toEqual(firstFilename);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Focus Mode', { exact: true })).toHaveCount(0);
  const downloadEvent = page.waitForEvent('download');
  await page.locator('.logo-card-footer').first().getByRole('button', { name: 'Save' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename().endsWith('.jpg')).toBe(true);
  const jpg = await readFile(await download.path());
  expect(Array.from(jpg.subarray(0, 3))).toEqual([0xff,0xd8,0xff]);
});

test('per-logo sliders, reset, matching and branded HTML links', async ({ page }) => {
  await addFiles(page, [sample, { ...sample, name: 'SecondLogo.png' }]);
  await page.getByRole('button', { name: /Open Focus Mode for/ }).first().click();
  const focus = page.getByLabel('Focus Mode', { exact: true });
  const slider = focus.getByLabel('Image padding');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  await focus.getByRole('button', { name: 'Reset padding to global' }).click();
  await expect(slider).toHaveValue('0');
  await focus.getByLabel('Text Y offset').focus();
  await focus.getByLabel('Text Y offset').press('ArrowLeft');
  await expect(focus.getByLabel('Text Y offset')).toHaveValue('89');
  await focus.getByRole('button', { name: 'Close Focus Mode' }).click();
  await page.getByRole('button', { name: 'Generate links' }).click();
  const dialog = page.getByRole('dialog', { name: 'Generate logo links' });
  await dialog.getByLabel('Brand names (one per line)').fill('SampleLogo\nSecondLogo');
  await dialog.getByLabel('Server').selectOption('aldi');
  await dialog.getByLabel('Folder path').fill('campaign');
  await dialog.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(dialog.getByLabel('Generated HTML')).toHaveValue(/aldimediaeu\.blob\.core\.windows\.net/);
  await expect(dialog.getByLabel('Generated HTML')).toHaveValue(/SecondLogo\.png/);
});
