import { test, expect } from '@playwright/test';

const sample = {
  name: 'VisualParity.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAAAHUlEQVR4nGP8z8Dwn4GGgImWho9aMGrBqAXDxQIARZACFmekxckAAAAASUVORK5CYII=', 'base64'),
};

test('logo instrument ribbon keeps all original controls on a single line', async ({ page }) => {
  await page.goto('#/logo-resizer');
  for (const width of [768, 1024, 1280, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => {
      const ribbon = document.querySelector('.forge-v5-command-deck') as HTMLElement;
      const groups = Array.from(document.querySelectorAll('.forge-v5-control-grid > .forge-v5-group'));
      const ys = groups.map(group => group.getBoundingClientRect().top);
      const stage = document.querySelector('.logo-gallery')!.getBoundingClientRect();
      return {
        groupCount: groups.length, ySpread: Math.max(...ys) - Math.min(...ys),
        documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
        ribbonOverflow: ribbon.scrollWidth > ribbon.clientWidth,
        stageHeight: stage.height,
      };
    });
    expect(metrics.groupCount).toBe(8);
    expect(metrics.ySpread).toBeLessThan(2);
    expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
    expect(metrics.stageHeight).toBeGreaterThan(220);
    if (width === 768) expect(metrics.ribbonOverflow).toBe(true);
  }
});

test('preview follows output aspect, focus drawer exits and retains edits', async ({ page }) => {
  await page.goto('#/logo-resizer');
  await page.locator('.logo-workspace input[type=file]').setInputFiles(sample);
  await page.getByRole('dialog', { name: 'Set logo dimensions' })
    .getByRole('button', { name: 'Apply & process' }).click();
  await expect(page.locator('.logo-card')).toHaveCount(1);
  await page.locator('.forge-v5-presets').getByRole('button', { name: '200 × 150' }).click();
  const ratio = await page.locator('.logo-card').evaluate(el =>
    getComputedStyle(el).getPropertyValue('--logo-preview-ratio').trim());
  expect(ratio).toBe('200 / 150');

  await page.getByRole('button', { name: /Open Focus Mode for/ }).click();
  const focus = page.getByLabel('Focus Mode', { exact: true });
  await expect(focus).toBeVisible();
  await focus.getByLabel('Overlay label').fill('A\nB');
  await focus.getByRole('button', { name: 'Close Focus Mode' }).click();
  await expect(page.locator('.logo-detail')).toHaveCount(0);
  await page.getByRole('button', { name: /Open Focus Mode for/ }).click();
  await expect(page.getByLabel('Focus Mode', { exact: true }).getByLabel('Overlay label')).toHaveValue('A\nB');
  await page.keyboard.press('Escape');
  await expect(page.locator('.logo-detail')).toHaveCount(0);
  await expect(page.locator('.logo-card-controls textarea')).toHaveValue('A\nB');
});

test('focus drawer respects reduced motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/logo-resizer');
  await page.locator('.logo-workspace input[type=file]').setInputFiles(sample);
  await page.getByRole('dialog', { name: 'Set logo dimensions' })
    .getByRole('button', { name: 'Apply & process' }).click();
  await page.getByRole('button', { name: /Open Focus Mode for/ }).click();
  await expect(page.getByLabel('Focus Mode', { exact: true })).toBeVisible();
  await expect(page.locator('.logo-detail')).toHaveCSS('transition-duration', '0s');
});


test('visual QA captures empty canvas, imported cards and focus at desktop sizes', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('#/logo-resizer');
  await page.screenshot({ path: testInfo.outputPath('logo-studio-empty-1366x768.png') });

  const vector = {
    name: 'CreativeStudio.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" fill="white"/><path d="M58 173V70h103v30H92v73z" fill="#1c2921"/><path d="M191 173l54-103h37l55 103h-39l-12-24h-49l-12 24z" fill="#1c2921"/><path d="M250 124h24l-12-27z" fill="white"/></svg>'),
  };
  await page.locator('.logo-workspace input[type=file]').setInputFiles([vector, sample]);
  await page.getByRole('dialog', { name: 'Set logo dimensions' })
    .getByRole('button', { name: 'Apply & process' }).click();
  await expect(page.locator('.logo-card')).toHaveCount(2);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('logo-studio-two-assets-1440x900.png') });
  await page.getByRole('button', { name: /Open Focus Mode for/ }).first().click();
  await expect(page.getByLabel('Focus Mode', { exact: true })).toBeVisible();
  await expect(page.locator('.logo-detail.is-open')).toHaveCount(1);
  await page.waitForTimeout(260);
  await page.screenshot({ path: testInfo.outputPath('logo-studio-focus-1440x900.png') });
  expect(errors).toEqual([]);
});


test('two desktop asset cards use available width and expose editing actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('#/logo-resizer');
  const second = { ...sample, name: 'SecondVisual.png' };
  await page.locator('.logo-workspace input[type=file]').setInputFiles([sample, second]);
  await page.getByRole('dialog', { name: 'Set logo dimensions' })
    .getByRole('button', { name: 'Apply & process' }).click();
  await expect(page.locator('.logo-card')).toHaveCount(2);
  const boxes = await page.evaluate(() => {
    const gallery = document.querySelector('.logo-gallery')!.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.logo-card')].map(x => x.getBoundingClientRect());
    const saves = [...document.querySelectorAll('.logo-card-footer button')].map(x => x.getBoundingClientRect());
    return { widths: cards.map(x => x.width), saveBottoms: saves.map(x => x.bottom), galleryBottom: gallery.bottom };
  });
  expect(Math.min(...boxes.widths)).toBeGreaterThan(400);
  expect(Math.max(...boxes.saveBottoms)).toBeLessThanOrEqual(boxes.galleryBottom + 2);
});
