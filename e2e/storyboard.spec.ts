import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

async function png(page: Page, color = '#e63b3b'): Promise<Buffer> {
  const value = await page.evaluate(fill => {
    const canvas = document.createElement('canvas');canvas.width=240;canvas.height=120;
    const ctx = canvas.getContext('2d')!;ctx.fillStyle=fill;ctx.fillRect(0,0,240,120);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color);
  return Buffer.from(value,'base64');
}
async function add(page: Page, names: string[]) {
  const buffer = await png(page);
  await page.getByLabel('Choose storyboard assets').setInputFiles(names.map(name=>({name,mimeType:'image/png',buffer})));
  await expect(page.locator('.sb-frame')).toHaveCount(names.length,{timeout:15000});
}
async function downloaded(page: Page, name: string, click: () => Promise<void>): Promise<Buffer> {
  const pending=page.waitForEvent('download');await click();const result=await pending;
  expect(result.suggestedFilename()).toBe(name);
  return await readFile(await result.path());
}
const tool=(page: Page)=>page.getByRole('region',{name:'Storyboard'});

test.beforeEach(async ({page})=>{
  await page.goto('#/storyboard');
  await expect(page.getByRole('heading',{name:'Storyboard'})).toBeVisible();
  await expect(page.getByRole('tab',{name:'Grid Board'})).toHaveAttribute('aria-selected','true');
});

test('uploads images, shows original pixels and exports JPG',async ({page})=>{
  await add(page,['frame_1.png','frame_2.png']);
  await expect(page.locator('.sb-canvas canvas')).toBeVisible();
  const dims=await page.locator('.sb-canvas canvas').first().evaluate((node)=>[ (node as HTMLCanvasElement).width,(node as HTMLCanvasElement).height ]);
  expect(dims[0]).toBeGreaterThan(200);expect(dims[1]).toBeGreaterThan(100);
  const data=await downloaded(page,'Board_1.jpg',()=>page.getByRole('button',{name:'Save JPG'}).click());
  expect(Array.from(data.subarray(0,3))).toEqual([0xff,0xd8,0xff]);
});

test('board list navigation, rename, per-board settings and reorder work', async ({page})=>{
  await add(page,['one.png','two.png','three.png']);
  await page.getByRole('button',{name:'Move down one.png'}).click();
  await expect(page.locator('.sb-frame').first()).toContainText('two.png');
  await page.getByLabel('Columns', { exact: true }).selectOption('2');
  await page.getByLabel('Auto width').uncheck();
  await page.getByLabel('Board width').fill('1200');
  await expect(page.locator('.sb-canvas canvas').first()).toHaveJSProperty('width',1200);
  await page.getByRole('button',{name:'+ New Board'}).click();
  await page.getByLabel('Board Name').fill('Ad Two');
  await page.getByRole('button',{name:'List',exact:true}).click();
  await expect(page.getByRole('button',{name:'Ad Two',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Board_1',exact:true}).click();
  await expect(page.locator('.sb-frame')).toHaveCount(3);
});

test('bulk ZIP includes all populated boards without duplicate filenames',async ({page})=>{
  await add(page,['first.png']);
  await page.getByRole('button',{name:'+ New Board'}).click();
  await page.getByLabel('Board Name').fill('Board_1');
  await page.getByLabel('Choose storyboard assets').setInputFiles({name:'second.png',mimeType:'image/png',buffer:await png(page,'#3377dd')});
  await expect(page.locator('.sb-frame')).toHaveCount(1);
  const data=await downloaded(page,'boards.zip',()=>page.getByRole('button',{name:'Download All ZIP'}).click());
  const zip=await JSZip.loadAsync(data);
  const entries=Object.keys(zip.files).filter(f=>f.endsWith('.jpg')).sort();
  expect(entries).toHaveLength(2);
  expect(entries[0]).not.toBe(entries[1]);
  for(const name of entries){const bytes=await zip.file(name)!.async('uint8array');expect(Array.from(bytes.slice(0,3))).toEqual([0xff,0xd8,0xff]);}
});

test('clear and delete require confirmation; Cancel retains frames',async ({page})=>{
  await add(page,['one.png']);
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(page.getByRole('alertdialog',{name:'Clear storyboard?'})).toBeVisible();
  await page.getByRole('button',{name:'Cancel'}).click();
  await expect(page.locator('.sb-frame')).toHaveCount(1);
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  await page.getByRole('button',{name:'Confirm'}).click();
  await expect(page.locator('.sb-frame')).toHaveCount(0);
  await page.getByRole('button',{name:'Delete selected storyboard'}).click();
  await page.getByRole('button',{name:'Confirm'}).click();
  await expect(page.getByLabel('Choose a storyboard').locator('option')).toHaveCount(1);
});

test('folder import creates one board per subfolder, natural frame order',async ({page})=>{
  const image=(await png(page)).toString('base64');
  await page.evaluate(value=>{
    const input=document.querySelector<HTMLInputElement>('input[aria-label="Choose storyboard folder"]')!;
    const transfer=new DataTransfer();
    for(const [folder,name] of [['Ad 2','frame_10.png'],['Ad 2','frame_2.png'],['Ad 1','frame_1.png']]){
      const bytes=Uint8Array.from(atob(value),ch=>ch.charCodeAt(0));
      const file=new File([bytes],name,{type:'image/png'});
      Object.defineProperty(file,'webkitRelativePath',{value:`Campaign/${folder}/${name}`});transfer.items.add(file);
    }
    Object.defineProperty(input,'files',{value:transfer.files,configurable:true});
    input.dispatchEvent(new Event('change',{bubbles:true}));
  },image);
  await expect(page.getByLabel('Choose a storyboard').locator('option')).toHaveCount(2,{timeout:15000});
  await expect(page.locator('.sb-frame')).toHaveCount(1);
  await page.getByLabel('Choose a storyboard').selectOption({label:'Ad 2'});
  await expect(page.locator('.sb-frame')).toHaveCount(2);
  await expect(page.locator('.sb-frame').first()).toContainText('frame_2.png');
});

test('Storyboard exposes only Grid Board and Fit to Platform',async ({page})=>{
  const tabs = page.getByRole('tablist',{name:'Storyboard modes'}).getByRole('tab');
  await expect(tabs).toHaveCount(2);
  await expect(tabs).toHaveText(['Grid Board','Fit to Platform']);
  await expect(page.getByRole('button',{name:'View in Filmstrip'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Send to Filmstrip'})).toHaveCount(0);
  await add(page,['keep.png']);
  await tabs.getByText('Fit to Platform').click();
  await page.getByRole('button',{name:'Use Grid Board'}).click();
  await expect(page.getByRole('button',{name:'Save PNG'})).toBeEnabled();
  await tabs.getByText('Grid Board').click();
  await expect(page.locator('.sb-frame')).toHaveCount(1);
});

test('Fit uses Grid Board and exports reference-size PNG and JPG',async ({page})=>{
  await add(page,['fit.png']);
  await page.getByRole('tab',{name:'Fit to Platform'}).click();
  await page.getByRole('button',{name:'Use Grid Board'}).click();
  await expect(page.locator('.sb-fit-stage canvas')).toHaveJSProperty('width',3099);
  await expect(page.locator('.sb-fit-stage canvas')).toHaveJSProperty('height',585);
  const data=await downloaded(page,'fit_to_platform_3099x585.png',()=>page.getByRole('button',{name:'Save PNG'}).click());
  expect(data.readUInt32BE(16)).toBe(3099);
  expect(data.readUInt32BE(20)).toBe(585);
  await page.getByRole('button',{name:'Save JPG'}).click();
});

test('Fit blocks exports for clipped statements and restores them for shorter text',async ({page})=>{
  await add(page,['fit.png']);
  await page.getByRole('tab',{name:'Fit to Platform'}).click();
  await page.getByRole('button',{name:'Use Grid Board'}).click();
  await page.getByLabel('Fit statement').fill('MMMMMMMMMM '.repeat(32));
  await expect(page.getByRole('button',{name:'Save PNG'})).toBeDisabled();
  await page.getByLabel('Fit statement').fill('Short statement');
  await expect(page.getByRole('button',{name:'Save PNG'})).toBeEnabled();
});

test('navigation away preserves multiple board state',async ({page})=>{
  await add(page,['keep.png']);
  await page.getByRole('navigation',{name:'Select a tool'}).getByRole('button',{name:'Logo Resizer'}).click();
  await page.getByRole('navigation',{name:'Select a tool'}).getByRole('button',{name:'Storyboard'}).click();
  await expect(page.locator('.sb-frame')).toHaveCount(1);
});

