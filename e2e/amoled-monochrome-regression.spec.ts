import { test, expect, type Page } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

const routes = [
  'home', 'logo-resizer', 'pdf-to-image', 'image-splitter',
  'video-stills', 'storyboard', 'link-generator', 'ad-downloader',
] as const;

// A pure AMOLED control must not inherit old paper/green/bronze colors.
// Error/success badges may use semantic color in populated error states; this
// checks the resting, hover and keyboard interaction surfaces on clean visits.
async function paletteLeaks(page: Page) {
  return page.locator('.forge-amoled-ui').evaluate(host => {
    const problems: Array<{ tag: string; className: string; property: string; value: string }> = [];
    const nodes = [host, ...host.querySelectorAll<HTMLElement>('*')];
    for (const element of nodes) {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const css = getComputedStyle(element);
      if (css.display === 'none' || css.visibility === 'hidden') continue;
      const el = element as HTMLElement;
      const properties: Array<[string, string, number]> = [
        ['backgroundColor', css.backgroundColor, 15],
        ['color', css.color, 21],
        ['borderTopColor', css.borderTopColor, 17],
        ['borderBottomColor', css.borderBottomColor, 17],
      ];
      for (const [property, value, maxDelta] of properties) {
        const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value);
        if (!match || (match[4] !== undefined && Number(match[4]) === 0)) continue;
        const channels = [Number(match[1]), Number(match[2]), Number(match[3])];
        const delta = Math.max(...channels) - Math.min(...channels);
        if (delta > maxDelta) {
          problems.push({ tag: element.tagName, className: String(el.className).slice(0, 115), property, value });
        }
      }
    }
    return problems.slice(0, 120);
  });
}

test('all eight Home/workroom surfaces render in a neutral monochrome palette', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues: string[] = [];
  for (const route of routes) {
    await openForgeRoute(page, route);
    if (route === 'ad-downloader') await expect(page.locator('.adw-workspace')).toBeVisible();
    if (route === 'pdf-to-image') await expect(page.locator('.pdf-workspace')).toBeVisible();
    const host = page.locator('.forge-amoled-ui');
    await expect(host, route).toBeVisible();
    await expect(page.locator('.sketch-main-area')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    const leaks = await paletteLeaks(page);
    if (leaks.length) {
      console.info('PALETTE LEAK', route, JSON.stringify(leaks.slice(0, 35)));
      issues.push(route + ': ' + JSON.stringify(leaks.slice(0, 35)));
    }
    await page.screenshot({ path: testInfo.outputPath('amoled-pure-' + route + '.png'), animations: 'disabled' });
    if (routes.includes(route)) {
      const capture = await page.screenshot({ type: 'jpeg', quality: 31, animations: 'disabled' });
      console.info('AMOLED_CAPTURE_' + route + '=' + capture.toString('base64'));
    }
  }
  expect(issues, 'Remaining unapproved UI paint').toEqual([]);
});

test('hover and keyboard focus states do not restore old green palettes', async ({ page }) => {
  const issues: string[] = [];
  for (const route of routes) {
    await openForgeRoute(page, route);
    if (route === 'ad-downloader') await expect(page.locator('.adw-workspace')).toBeVisible();
    if (route === 'pdf-to-image') await expect(page.locator('.pdf-workspace')).toBeVisible();
    const first = page.locator('.native-tool:not([hidden]) button:visible').first();
    if (await first.count()) {
      await first.hover();
      const leaks = await paletteLeaks(page);
      if (leaks.length) {
        console.info('HOVER PALETTE LEAK', route, JSON.stringify(leaks.slice(0, 20)));
        issues.push(route + ' hover: ' + JSON.stringify(leaks.slice(0, 20)));
      }
    }
    const field = page.locator('.native-tool:not([hidden]) input:visible:not([type="file"]), .native-tool:not([hidden]) textarea:visible').first();
    if (await field.count()) {
      await field.focus();
      const leaks = await paletteLeaks(page);
      if (leaks.length) {
        console.info('FOCUS PALETTE LEAK', route, JSON.stringify(leaks.slice(0, 20)));
        issues.push(route + ' focus: ' + JSON.stringify(leaks.slice(0, 20)));
      }
    }
  }
  expect(issues, 'Interactive states contain old colors').toEqual([]);
});

test('populated logo, split, storyboard and link output states stay monochrome', async ({ page }) => {
  test.setTimeout(90_000);
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Canvas unsupported');
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const image = { name: 'TestImage.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };

  await openForgeRoute(page, 'logo-resizer');
  await page.locator('.logo-workspace input[type="file"]').setInputFiles(image);
  await expect(page.locator('.logo-card')).toHaveCount(1);
  expect(await paletteLeaks(page), 'populated Logo Resizer').toEqual([]);

  await openForgeRoute(page, 'image-splitter');
  await page.getByLabel('Upload images').setInputFiles(image);
  await expect(page.locator('.split-card')).toHaveCount(1);
  expect(await paletteLeaks(page), 'populated Image Splitter').toEqual([]);

  await openForgeRoute(page, 'storyboard');
  await page.getByLabel('Choose storyboard assets').setInputFiles(image);
  await expect(page.locator('.sb-frame')).toHaveCount(1);
  expect(await paletteLeaks(page), 'populated Storyboard').toEqual([]);

  await openForgeRoute(page, 'link-generator');
  await page.getByLabel('Folder / Path').fill('Neutral');
  await page.getByLabel('Filenames').fill('TestImage.png');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#link-exposure')).toHaveValue(/TestImage.png/);
  expect(await paletteLeaks(page), 'generated Link Generator output').toEqual([]);
});
