import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import { createPdf } from './helpers/pdf-fixture';
import { readFile } from 'node:fs/promises';

// Controlled OOXML/PDF fixtures: regression coverage, NOT substitutes for customer files.
// These exercise code paths omitted by the original smoke tests.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAHUlEQVR4nGP8z8Dwn4GGgImWho9aMGrBqAXDxQIARZACFmekxckAAAAASUVORK5CYII=', 'base64');
const redSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="18"><rect width="36" height="18" fill="#ec3333"/></svg>');
const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

async function uploadLogoOffice(page: import('@playwright/test').Page, name: string, mimeType: string, bytes: Buffer) {
  await page.goto('#/logo-resizer');
  await expect(page.getByRole('region', { name: 'Logo Resizer' })).toBeVisible();
  await page.locator('.logo-workspace input[type="file"]').setInputFiles({ name, mimeType, buffer: bytes });
  const dimensions = page.getByRole('dialog', { name: 'Set logo dimensions' });
  await expect(dimensions).toBeVisible();
  await dimensions.getByRole('button', { name: 'Apply & process' }).click();
}

async function powerPointWithSvgFallback(): Promise<Buffer> {
  const zip = new JSZip();
  const blip = '<a:blip r:embed="rIdRaster"><a:extLst><a:ext><asvg:svgBlip r:embed="rIdVector"/></a:ext></a:extLst></a:blip>';
  const header = '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" xmlns:r="' + relNs + '">';
  // Intentionally insert slide 10 first. CTK sorts slides by their numeric index.
  zip.file('ppt/slides/slide10.xml', header + '<a:blip r:embed="rIdRaster"/></p:sld>');
  zip.file('ppt/slides/_rels/slide10.xml.rels', '<Relationships><Relationship Id="rIdRaster" Target="../media/fallback.png"/></Relationships>');
  zip.file('ppt/slides/slide2.xml', header + blip + blip + '</p:sld>');
  zip.file('ppt/slides/_rels/slide2.xml.rels', '<Relationships><Relationship Id="rIdRaster" Target="../media/fallback.png"/><Relationship Id="rIdVector" Target="../media/vector.svg"/></Relationships>');
  zip.file('ppt/media/fallback.png', png);
  zip.file('ppt/media/vector.svg', redSvg);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function macroWorkbookMedia(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<workbook xmlns:r="' + relNs + '"><sheets><sheet name="Media" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', '<worksheet/>');
  zip.file('xl/media/one.png', png);
  zip.file('xl/media/duplicate.png', png);
  zip.file('xl/media/different.svg', redSvg);
  return zip.generateAsync({ type: 'nodebuffer' });
}

function rotatedVectorPdf(): Buffer {
  const drawing = 'q\n0 0.4 1 rg\n0 0 50 80 re\nf\nQ\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 120 80] /Rotate 90 /Resources << >> /Contents 4 0 R >>',
    '<< /Length ' + Buffer.byteLength(drawing, 'ascii') + ' >>\nstream\n' + drawing + 'endstream',
  ];
  let body = '%PDF-1.4\n%forge-rotated-test\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(body, 'ascii'));
    body += (i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n';
  }
  const start = Buffer.byteLength(body, 'ascii');
  body += 'xref\n0 5\n0000000000 65535 f \n';
  for (const at of offsets.slice(1)) body += String(at).padStart(10, '0') + ' 00000 n \n';
  body += 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + start + '\n%%EOF\n';
  return Buffer.from(body, 'ascii');
}

test('PPTX media uses SVG rather than its PNG fallback, deduplicates and orders numbered slides', async ({ page }) => {
  await uploadLogoOffice(page, 'slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', await powerPointWithSvgFallback());
  await expect(page.locator('.logo-card')).toHaveCount(2, { timeout: 20000 });
  const names = await page.locator('.logo-card-heading input').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  expect(names).toEqual(['Slide10_IMG3', 'Slide2_IMG1']); // CTK prepends cards visually
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export batch ZIP/ }).click();
  const zip = await JSZip.loadAsync(await readFile(await (await event).path()));
  expect(Object.keys(zip.files).filter(name => !zip.files[name].dir)).toEqual(['Slide10_IMG3.png', 'Slide2_IMG1.png']); // CTK prepends new entries
});

test('XLSM unanchored media is deduplicated by bytes, including SVG assets', async ({ page }) => {
  await uploadLogoOffice(page, 'assets.xlsm', 'application/vnd.ms-excel.sheet.macroEnabled.12', await macroWorkbookMedia());
  await expect(page.locator('.logo-card')).toHaveCount(2, { timeout: 20000 });
  const names = await page.locator('.logo-card-heading input').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  expect(names).toEqual(['Unanchored_IMG3', 'Unanchored_IMG1']); // newest card appears first
  await expect(page.locator('.logo-error')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export batch ZIP/ }).click();
  const zip = await JSZip.loadAsync(await readFile(await (await download).path()));
  expect(Object.keys(zip.files).filter(name => !zip.files[name].dir)).toEqual(['Unanchored_IMG3.png', 'Unanchored_IMG1.png']);
});

test('rotated PDF page still exports 2x resolution in rotated orientation', async ({ page }) => {
  await page.goto('#/pdf-to-image');
  await page.getByLabel('Upload PDF files').setInputFiles({
    name: 'rotated.pdf', mimeType: 'application/pdf', buffer: rotatedVectorPdf(),
  });
  const save = page.getByRole('button', { name: 'Download all converted PDF pages as a ZIP archive' });
  await expect(save).toBeEnabled({ timeout: 20000 });
  const event = page.waitForEvent('download');
  await save.click();
  const zip = await JSZip.loadAsync(await readFile(await (await event).path()));
  const bytes = await zip.file('001.png')!.async('nodebuffer');
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([160, 240]);
});

test('PDF with massive page dimensions fails without allocating an enormous canvas', async ({ page }) => {
  await page.goto('#/pdf-to-image');
  await page.getByLabel('Upload PDF files').setInputFiles({
    name: 'oversized-page.pdf',
    mimeType: 'application/pdf',
    buffer: createPdf(1, 'red', [50000, 50000]),
  });
  const alert = page.locator('.pdf-doc-details small[role="alert"]');
  await expect(alert).toHaveCount(1, { timeout: 20000 });
  await expect(alert).toContainText('safe browser canvas size limit');
  await expect(page.getByRole('button', { name: 'Download all converted PDF pages as a ZIP archive' })).toBeDisabled();
});
