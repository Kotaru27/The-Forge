import { test, expect } from '@playwright/test';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAHUlEQVR4nGP8z8Dwn4GGgImWho9aMGrBqAXDxQIARZACFmekxckAAAAASUVORK5CYII=', 'base64');
const sample = { name: 'PencilSample.png', mimeType: 'image/png', buffer: png };

test('Logo Resizer buttons are native with real stable authored pencil strokes and accessible states', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1586, height: 992 });
  await page.goto('#/logo-resizer');
  const buttons = page.locator('.logo-workspace button.pencil-art-button');
  await expect(buttons).toHaveCount(8);
  const add = page.getByRole('button', { name: /Add assets/i });
  await expect(add).toBeVisible();
  expect(await add.evaluate(el => ({ tag: el.tagName, paths: el.querySelectorAll('svg path').length, hidden: el.querySelector('svg')?.getAttribute('aria-hidden') })))
    .toMatchObject({ tag: 'BUTTON', hidden: 'true' });
  expect(await add.locator('svg path').count()).toBeGreaterThan(13);
  const before = await add.locator('.pencil-button-graphite path').first().getAttribute('d');
  await page.getByRole('button',{ name: '150 × 150' }).click();
  await expect(page.getByRole('button',{ name: '150 × 150' })).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{ name: '150 × 150' }).locator('.pencil-button-yellow')).toHaveCSS('opacity','1');
  expect(await add.locator('.pencil-button-graphite path').first().getAttribute('d')).toBe(before);

  // Deliberately navigate back with the keyboard: :focus-visible does not
  // necessarily activate from a programmatic .focus() after a pointer click.
  await add.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(add).toBeFocused();
  await expect(add.locator('.pencil-button-focus')).toHaveCSS('opacity','0.9');
  await page.screenshot({path:testInfo.outputPath('pencil-logo-header-focus.png')});
});

test('Logo Resizer text, select, checkbox, and sliders remain real editable HTML controls', async ({ page }) => {
  await page.goto('#/logo-resizer');
  const w = page.getByRole('spinbutton',{ name: 'Width in pixels' });
  await w.fill('245');
  await expect(w).toHaveValue('245');
  await expect(w).toHaveCSS('background-image', new RegExp('data:image/svg'));

  const format = page.getByRole('combobox',{ name: 'Download format' });
  await format.selectOption('jpeg');
  await expect(format).toHaveValue('jpeg');
  await expect(format).toHaveCSS('background-image', new RegExp('data:image/svg'));

  const bold = page.locator('.forge-v5-checkboxes input[type="checkbox"]').first();
  const wasChecked = await bold.isChecked();
  await bold.click();
  expect(await bold.isChecked()).toBe(!wasChecked);

  const slider = page.getByRole('slider', { name: 'Global image padding' });
  const before = Number(await slider.inputValue());
  await slider.focus();
  await slider.press('ArrowRight');
  expect(Number(await slider.inputValue())).toBeGreaterThan(before);
});

test('Paper workboard / upload / dialogs / focus preserve image output and clickability', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('#/logo-resizer');
  await expect(page.locator('.pencil-drop-sketch svg')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('pencil-logo-empty.png')});

  await page.locator('.logo-workspace input[type="file"]').setInputFiles(sample);
  const modal = page.getByRole('dialog',{ name: 'Set logo dimensions' });
  await expect(modal).toBeVisible();
  const apply = modal.getByRole('button',{ name: 'Apply & process' });
  await expect(apply.locator('svg.pencil-button-linework')).toHaveCount(1);
  await apply.click();
  await expect(page.locator('.logo-card')).toHaveCount(1);
  const card = page.locator('.logo-card').first();
  await expect(card.locator('button.pencil-art-button')).toHaveCount(2);
  await card.locator('.logo-card-controls textarea').fill('MY BRAND');
  await card.getByRole('button',{name:'Save'}).focus();
  await page.screenshot({path:testInfo.outputPath('pencil-logo-imported.png')});

  const canvas = card.locator('canvas').first();
  const corner = await canvas.evaluate(el => {
    const cv=el as HTMLCanvasElement, data=cv.getContext('2d')!.getImageData(cv.width-1,cv.height-1,1,1).data;
    return Array.from(data.slice(0,3));
  });
  expect(corner).toEqual([255,255,255]);

  await card.getByRole('button',{name:/Open Focus Mode/}).click();
  await expect(page.getByLabel('Focus Mode',{exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('pencil-logo-focus.png')});
  await page.getByRole('button',{name:'Close Focus Mode'}).click();
  await expect(page.getByLabel('Focus Mode',{exact:true})).toHaveCount(0);
});
