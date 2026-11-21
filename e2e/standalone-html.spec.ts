import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as XLSX from 'xlsx';
import {createPdf} from './helpers/pdf-fixture';

const htmlFile=pathToFileURL(resolve('dist-standalone/the-forge.html')).href;
const names=['Logo Resizer','PDF to Image','Image Splitter','Video Stills','Storyboard','Link Generator','Ad Downloader'];

test.beforeEach(async({page})=>{
  await page.goto(htmlFile);
  await expect(page.getByRole('region',{name:'Tool selection'})).toBeVisible();
});

test('single HTML file opens all seven intact tool workspaces without app assets',async({page})=>{
  const nav=page.getByRole('navigation',{name:'Select a tool'});
  await expect(nav.getByRole('button')).toHaveCount(7);
  for(const name of names){
    await nav.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('heading',{name,exact:true}).first()).toBeVisible();
    await expect(page.locator('.native-tool:not([hidden])')).toHaveCount(1);
  }
  await page.getByRole('button',{name:'All tools'}).click();
  await expect(page.getByRole('region',{name:'Tool selection'})).toBeVisible();
});

test('standalone Ad Downloader accepts XLSX without permission to monitor a folder',async({page})=>{
  const nav=page.getByRole('navigation',{name:'Select a tool'});
  await nav.getByRole('button',{name:'Ad Downloader'}).click();
  const book=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([['Ad No','URL','Type'],[8,'Sample.jpg','Print']]);
  sheet.B2.l={Target:'https://example.test/sample.jpg'};
  XLSX.utils.book_append_sheet(book,sheet,'Ads');
  const upload=page.getByLabel('Upload Excel workbook');
  await expect(upload).toBeEnabled();
  await upload.setInputFiles({
    name:'ads.xlsx',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer:Buffer.from(XLSX.write(book,{type:'buffer',bookType:'xlsx'})),
  });
  await expect(page.locator('.adw-table tbody tr[data-stage="ready"]')).toHaveCount(1);
  await expect(page.getByText('AD8_Sample.jpg')).toBeVisible();
  await expect(page.getByRole('button',{name:'Download selected (1)'})).toBeEnabled();
});

test('PDF worker operates from the file itself: render a PDF without an asset server',async({page})=>{
  await page.getByRole('navigation',{name:'Select a tool'}).getByRole('button',{name:'PDF to Image'}).click();
  await page.getByLabel('Upload PDF files').setInputFiles({
    name:'sample.pdf',
    mimeType:'application/pdf',
    buffer:createPdf(1),
  });
  await expect(page.locator('.pdf-doc-card')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Download all converted PDF pages as a ZIP archive'})).toBeEnabled({timeout:25000});
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download all converted PDF pages as a ZIP archive'}).click();
  expect((await download).suggestedFilename()).toBe('pdf-images.zip');
});
