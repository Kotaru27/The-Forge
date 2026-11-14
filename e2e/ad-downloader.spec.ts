import {test,expect,type Page} from '@playwright/test';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';

function fixture(withSharePoint=false):Buffer {
  const book=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([
    ['Ad No','URL','Type'],
    [1,'Photo.jpg','Print'],
    [2,'Broken.html','Static'],
    ...(withSharePoint?[[3,'SharePoint Video','TVC']]:[]),
  ]);
  sheet.B2.l={Target:'http://127.0.0.1:4173/asset-photo'};
  sheet.B3.l={Target:'http://127.0.0.1:4173/asset-bad'};
  if(withSharePoint) sheet.B4.l={Target:'https://tenant.sharepoint.com/sites/Team/Shared%20Documents/Video.mp4'};
  XLSX.utils.book_append_sheet(book,sheet,'Campaign');
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Bucket','Type'],['Target','Print']]),'Buckets');
  return Buffer.from(XLSX.write(book,{type:'buffer',bookType:'xlsx'}));
}
const app=(page:Page)=>page.getByRole('region',{name:'Ad Downloader'});
async function folder(page:Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:async()=>({
      kind:'directory',name:'Downloads',queryPermission:async()=> 'granted',
      async *entries() {},
    })});
  });
}
test.beforeEach(async ({page})=>{
  await folder(page);
  await page.goto('#/ad-downloader');
  await expect(app(page)).toBeVisible();
});
test('Excel cannot be uploaded before selecting an approved folder',async({page})=>{
  const upload=app(page).getByLabel('Upload Excel workbook');
  await expect(upload).toBeDisabled();
  await expect(app(page).getByText('Choose a writable Auto-name folder')).toBeVisible();
  await app(page).getByRole('button',{name:'Choose Auto-name folder'}).click();
  await expect(upload).toBeEnabled();
  await expect(app(page).getByRole('status')).toContainText('Folder ready');
});
test('Excel import parses names and exposes all copy/bucket controls',async({page})=>{
  await app(page).getByRole('button',{name:'Choose Auto-name folder'}).click();
  await app(page).getByLabel('Upload Excel workbook').setInputFiles({name:'ads.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fixture()});
  await expect(app(page).locator('.adw-table tbody tr[data-stage="ready"]')).toHaveCount(2);
  await expect(app(page).locator('.adw-summary')).toHaveCount(0);
  await expect(app(page).getByRole('group',{name:'Filter assets'})).toHaveCount(0);
  await expect(app(page).getByText('AD1_Photo')).toBeVisible();
  await expect(app(page).getByRole('button',{name:'Copy Script'})).toBeEnabled();
  await expect(app(page).getByRole('button',{name:'Copy Bucket Table'})).toBeEnabled();
  await app(page).getByRole('button',{name:'Deselect ready'}).click();
  await expect(app(page).getByRole('button',{name:'Download selected (0)'})).toBeDisabled();
  await app(page).getByRole('button',{name:'Select ready',exact:true}).click();
  await expect(app(page).getByRole('button',{name:'Download selected (2)'})).toBeEnabled();
});
test('Single file download uses actual JPEG signature and generated name',async({page})=>{
  await page.route('**/asset-photo',route=>route.fulfill({status:200,body:Buffer.from([255,216,255,224,1,2,3]),headers:{'content-type':'application/octet-stream','access-control-allow-origin':'*'}}));
  await app(page).getByRole('button',{name:'Choose Auto-name folder'}).click();
  await app(page).getByLabel('Upload Excel workbook').setInputFiles({name:'ads.xlsx',buffer:fixture(),mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const pending=page.waitForEvent('download');
  await app(page).getByRole('row',{name:/AD1_Photo/}).getByRole('button',{name:'Download'}).click();
  const download=await pending;
  expect(download.suggestedFilename()).toBe('AD1_Photo.jpg');
  await expect(app(page).getByText('Prepared / requested')).toBeVisible();
});
test('ZIP includes valid selected assets but rejects HTML/login previews',async({page})=>{
  await page.route('**/asset-photo',route=>route.fulfill({body:Buffer.from([255,216,255,224,1]),headers:{'content-type':'image/jpeg'}}));
  await page.route('**/asset-bad',route=>route.fulfill({body:'<html>login</html>',headers:{'content-type':'text/html'}}));
  await app(page).getByRole('button',{name:'Choose Auto-name folder'}).click();
  await app(page).getByLabel('Upload Excel workbook').setInputFiles({name:'ads.xlsx',buffer:fixture(),mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const pending=page.waitForEvent('download');
  await app(page).getByRole('button',{name:'Download selected (2)'}).click();
  const download=await pending;
  expect(download.suggestedFilename()).toBe('ad_assets.zip');
  const zip=await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files)).toContain('AD1_Photo.jpg');
  expect(Object.keys(zip.files)).not.toContain('AD2_Broken.html');
  await expect(app(page).getByRole('alert')).toContainText('1 failed');
});
test('SharePoint remains a native request and cannot enter browser ZIP',async({page})=>{
  await page.evaluate(()=>{
    (window as Window & {__opened?:string[]}).__opened=[];
    const original=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){
      if(this.target==='_blank'){(window as Window & {__opened?:string[]}).__opened?.push(this.href);return;}
      original.call(this);
    };
  });
  await app(page).getByRole('button',{name:'Choose Auto-name folder'}).click();
  await app(page).getByLabel('Upload Excel workbook').setInputFiles({name:'ads.xlsx',buffer:fixture(true),mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const nativeRow=app(page).getByRole('row',{name:/AD3_SharePoint/});
  await nativeRow.getByRole('button',{name:'Download'}).click();
  await expect(nativeRow).toContainText('Download requested');
  const opened=await page.evaluate(()=>(window as Window & {__opened?:string[]}).__opened);
  expect(opened?.[0]).toContain('/_layouts/15/download.aspx');
  await nativeRow.locator('details summary').click();
  await expect(nativeRow.getByRole('button',{name:'Fix downloaded name'})).toBeVisible();
  await expect(nativeRow.getByRole('button',{name:'Save named copy'})).toBeVisible();
});

test('CTK queue places completed downloads after ready rows with readable light colors',async({page})=>{
  await page.route('**/asset-photo',route=>route.fulfill({
    status:200,body:Buffer.from([255,216,255,224,1,2,3]),
    headers:{'content-type':'image/jpeg','access-control-allow-origin':'*'}
  }));
  await app(page).getByRole('button',{name:'Choose Auto-name folder'}).click();
  await app(page).getByLabel('Upload Excel workbook').setInputFiles({
    name:'ads.xlsx',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer:fixture()
  });
  const ready=app(page).getByRole('row',{name:/AD1_Photo/});
  await expect(ready).toHaveCSS('background-color','rgb(255, 255, 255)');
  const pending=page.waitForEvent('download');
  await ready.getByRole('button',{name:'Download',exact:true}).click();
  await pending;
  const prepared=app(page).locator('.adw-table tbody tr[data-stage="prepared"]');
  await expect(prepared).toHaveCount(1);
  await expect(prepared).toHaveCSS('background-color','rgb(237, 244, 235)');
  await expect(prepared.locator('.adw-name')).toHaveCSS('color','rgb(36, 67, 49)');
  const order=await app(page).locator('.adw-table tbody tr').allTextContents();
  expect(order[0]).toContain('AD2_Broken');
  expect(order[1]).toContain('Prepared or verified downloads');
  expect(order[2]).toContain('AD1_Photo');
  await expect(prepared.getByRole('button',{name:'Download again'})).toBeVisible();
});
