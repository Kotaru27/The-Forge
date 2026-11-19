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
  for (const route of routes) {
    await openForgeRoute(page, route);
    const host = page.locator('.forge-amoled-ui');
    await expect(host, route).toBeVisible();
    await expect(page.locator('.sketch-main-area')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    const leaks = await paletteLeaks(page);
    if (leaks.length) console.info('PALETTE LEAK', route, JSON.stringify(leaks.slice(0, 35)));
    expect(leaks, route + ' has old non-neutral paint or text').toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('amoled-pure-' + route + '.png'), animations: 'disabled' });
  }
});

test('hover and keyboard focus states do not restore old green palettes', async ({ page }) => {
  for (const route of routes) {
    await openForgeRoute(page, route);
    const first = page.locator('.native-tool:not([hidden]) button:visible').first();
    if (await first.count()) {
      await first.hover();
      const leaks = await paletteLeaks(page);
      if (leaks.length) console.info('HOVER PALETTE LEAK', route, JSON.stringify(leaks.slice(0, 20)));
      expect(leaks, route + ' hover has green/paper paint').toEqual([]);
    }
    const field = page.locator('.native-tool:not([hidden]) input:visible:not([type="file"]), .native-tool:not([hidden]) textarea:visible').first();
    if (await field.count()) {
      await field.focus();
      const leaks = await paletteLeaks(page);
      if (leaks.length) console.info('FOCUS PALETTE LEAK', route, JSON.stringify(leaks.slice(0, 20)));
      expect(leaks, route + ' focus has green/paper paint').toEqual([]);
    }
  }
});
