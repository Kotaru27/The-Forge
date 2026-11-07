import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { createPdf } from './helpers/pdf-fixture';

function pdf(name: string, pages: number, color: 'red'|'blue'|'green' = 'red') {
  return { name, mimeType: 'application/pdf', buffer: createPdf(pages,color) };
}
async function zipFromButton(page: Page, buttonName: string | RegExp) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: buttonName}).click();
  const download = await downloadPromise;
  return { name: download.suggestedFilename(), zip: await JSZip.loadAsync(await readFile(await download.path())) };
}
function entries(zip: JSZip): string[] {
  return Object.keys(zip.files).filter(name=>!zip.files[name].dir).sort();
}
function imageSize(bytes: Buffer): [number,number] {
  expect(bytes.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
}
async function waitDone(page: Page, count: number) {
  await expect(page.getByRole('button',{name:'Download all converted PDF pages as a ZIP archive'})).toBeEnabled();
  await expect(page.locator('.pdf-doc-card')).toHaveCount(count);
  await expect(page.locator('.pdf-doc-details small')).toHaveCount(0);
}

test.beforeEach(async ({page}) => {
  await page.goto('#/pdf-to-image');
  await expect(page.getByRole('region',{name:'PDF to Image'})).toBeVisible();
});

test('PNG export retains 2x resolution, page order and white background',async ({page})=>{
  await expect(page.getByLabel('Output format')).toHaveValue('image/png');
  await page.getByLabel('Upload PDF files').setInputFiles(pdf('two.pdf',2));
  await waitDone(page,1);
  await expect(page.locator('.pdf-doc-card')).toContainText('2/2 pages');
  const {name,zip}=await zipFromButton(page,'Download all converted PDF pages as a ZIP archive');
  expect(name).toBe('pdf-images.zip');
  expect(entries(zip)).toEqual(['001.png','002.png']);
  const png=await zip.file('001.png')!.async('nodebuffer');
  expect(imageSize(png)).toEqual([240,160]);
  const sample = await page.evaluate(async base64=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
    const canvas=document.createElement('canvas');
    canvas.width=bitmap.width; canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d')!;
    ctx.drawImage(bitmap,0,0);
    return [Array.from(ctx.getImageData(20,80,1,1).data).slice(0,3),Array.from(ctx.getImageData(200,80,1,1).data).slice(0,3)];
  },png.toString('base64'));
  expect(sample).toEqual([[255,0,0],[255,255,255]]);
});

test('JPG format supports individual saves and selected-page ZIP',async ({page})=>{
  await page.getByLabel('Output format').selectOption('image/jpeg');
  await page.getByLabel('Upload PDF files').setInputFiles(pdf('slides.pdf',3,'blue'));
  await waitDone(page,1);
  await page.getByRole('button',{name:'Inspect PDF slides.pdf'}).click();
  const dialog=page.getByRole('dialog',{name:'Pages from slides.pdf'});
  await expect(dialog.locator('.pdf-page-card')).toHaveCount(3);
  const individualPromise=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Download page 2'}).click();
  expect((await individualPromise).suggestedFilename()).toBe('slides_002.jpg');
  await dialog.getByLabel('Select page 2').uncheck();
  const {name,zip}=await zipFromButton(page,'Download Selected (Ctrl+S)');
  expect(name).toBe('slides.pdf_images.zip');
  expect(entries(zip)).toEqual(['1.jpg','3.jpg']);
  const jpeg=await zip.file('1.jpg')!.async('nodebuffer');
  expect(jpeg.subarray(0,2)).toEqual(Buffer.from([0xff,0xd8]));
});

test('multiple same-name PDFs zip into distinct folders, regardless of selection',async ({page})=>{
  await page.getByLabel('Upload PDF files').setInputFiles([pdf('report.pdf',2),pdf('report.pdf',1,'green')]);
  await waitDone(page,2);
  await page.getByRole('button',{name:'Inspect PDF report.pdf'}).first().click();
  await page.getByLabel('Select page 1').uncheck();
  await page.getByRole('button',{name:'Close PDF pages'}).click();
  const {zip}=await zipFromButton(page,'Download all converted PDF pages as a ZIP archive');
  expect(entries(zip)).toEqual(['01_report/001.png','01_report/002.png','02_report/001.png']);
});

test('select all keyboard shortcut and Ctrl+S selected download',async ({page})=>{
  await page.getByLabel('Upload PDF files').setInputFiles(pdf('keyboard.pdf',2));
  await waitDone(page,1);
  await page.getByRole('button',{name:'Inspect PDF keyboard.pdf'}).click();
  await page.getByLabel('Select page 2').uncheck();
  await expect(page.getByLabel('Select all pages')).not.toBeChecked();
  await page.keyboard.press('Control+a');
  await expect(page.getByLabel('Select all pages')).toBeChecked();
  const next=page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  expect((await next).suggestedFilename()).toBe('keyboard.pdf_images.zip');
});

test('clear, confirmation, and undo retain page previews and individual selections',async ({page})=>{
  await page.getByLabel('Upload PDF files').setInputFiles(pdf('draft.pdf',2));
  await waitDone(page,1);
  await page.getByRole('button',{name:'Inspect PDF draft.pdf'}).click();
  await page.getByLabel('Select page 2').uncheck();
  await page.getByRole('button',{name:'Close PDF pages'}).click();
  await page.getByRole('button',{name:'Clear all',exact:true}).click();
  const confirm=page.getByRole('dialog',{name:'Clear all PDFs'});
  await confirm.getByRole('button',{name:'Cancel'}).click();
  await expect(page.locator('.pdf-doc-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Clear all',exact:true}).click();
  await confirm.getByRole('button',{name:'Clear all',exact:true}).click();
  await expect(page.locator('.pdf-doc-card')).toHaveCount(0);
  await page.getByRole('button',{name:'Undo'}).click();
  await expect(page.locator('.pdf-doc-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Inspect PDF draft.pdf'}).click();
  await expect(page.getByLabel('Select page 2')).not.toBeChecked();
  const {zip}=await zipFromButton(page,'Download Selected (Ctrl+S)');
  expect(entries(zip)).toEqual(['1.png']);
});

test('invalid PDF displays error without preventing a following valid document',async ({page})=>{
  await page.getByLabel('Upload PDF files').setInputFiles([
    {name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')},
    pdf('good.pdf',1),
  ]);
  await expect(page.locator('.pdf-doc-card')).toHaveCount(2);
  await expect(page.locator('.pdf-doc-details small[role="alert"]')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Download all converted PDF pages as a ZIP archive'})).toBeEnabled();
  const {zip}=await zipFromButton(page,'Download all converted PDF pages as a ZIP archive');
  expect(entries(zip)).toEqual(['001.png']);
});

test('file drop accepts PDF documents and cancel stops active processing',async ({page})=>{
  const buffer=createPdf(1);
  await page.locator('.pdf-drop').evaluate((element,payload)=>{
    const transfer=new DataTransfer();
    const bytes=Uint8Array.from(atob(payload),s=>s.charCodeAt(0));
    transfer.items.add(new File([bytes],'dropped.pdf',{type:'application/pdf'}));
    element.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));
  },buffer.toString('base64'));
  await waitDone(page,1);
  await page.getByLabel('Upload PDF files').setInputFiles(pdf('many-pages.pdf',150));
  await expect(page.getByRole('button',{name:'Cancel processing'})).toBeVisible();
  await page.getByRole('button',{name:'Cancel processing'}).click();
  await expect(page.getByRole('button',{name:'Cancel processing'})).toHaveCount(0);
  await expect(page.locator('.pdf-doc-card')).toHaveCount(2);
  await expect(page.locator('.pdf-doc-card').last()).toContainText('Conversion canceled');
});
