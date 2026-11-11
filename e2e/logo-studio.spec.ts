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
