import { expect, test } from '@playwright/test';

const routes = [
  'logo-resizer', 'pdf-to-image', 'image-splitter', 'video-stills',
  'storyboard', 'link-generator', 'ad-downloader',
] as const;

// Short desktop windows are a normal workspace configuration (browser chrome,
// split-screen usage and 125–200% browser zoom). No route may force the
// non-scrolling document taller than the viewport.
test('every workroom fits compact landscape windows without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 919, height: 413 });
  for (const route of routes) {
    await page.goto('#/' + route);
    const geometry = await page.evaluate(() => {
      const app = document.querySelector<HTMLElement>('.forge-app')!;
      const main = document.querySelector<HTMLElement>('.sketch-main-area')!;
      const rect = app.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        docWidth: document.documentElement.scrollWidth,
        appBottom: rect.bottom,
        viewportHeight: window.innerHeight,
        mainHeight: main.getBoundingClientRect().height,
      };
    });
    expect(geometry.docWidth, route + ': document horizontal overflow').toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.appBottom, route + ': no window-height clipping').toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.mainHeight, route + ': usable main region').toBeGreaterThan(140);
  }
});

test('Logo Resizer restores all eight control groups without sideways page or header overflow', async ({ page }) => {
  for (const width of [1200, 1024, 919, 700, 390]) {
    await page.setViewportSize({ width, height: width === 919 ? 413 : 780 });
    await page.goto('#/logo-resizer');
    const groups = page.locator('.forge-v5-control-grid > .forge-v5-group');
    await expect(groups).toHaveCount(8);
    const geometry = await page.evaluate(() => {
      const head = document.querySelector<HTMLElement>('.forge-v5-head')!;
      const grid = document.querySelector<HTMLElement>('.forge-v5-control-grid')!;
      const gallery = document.querySelector<HTMLElement>('.logo-gallery')!;
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        headOverflow: head.scrollWidth - head.clientWidth,
        gridOverflow: grid.scrollWidth - grid.clientWidth,
        galleryHeight: gallery.clientHeight,
        headScrollable: head.scrollHeight > head.clientHeight + 1,
      };
    });
    expect(geometry.pageWidth, width + ': page horizontal overflow').toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.headOverflow, width + ': header horizontal overflow').toBeLessThanOrEqual(2);
    expect(geometry.gridOverflow, width + ': control grid horizontal overflow').toBeLessThanOrEqual(2);
    expect(geometry.galleryHeight, width + ': asset board visible').toBeGreaterThan(80);
    if (width === 919) expect(geometry.headScrollable).toBe(true);
  }
});

test('Storyboard preview region remains usable in a short desktop window', async ({ page }) => {
  await page.setViewportSize({ width: 919, height: 413 });
  await page.goto('#/storyboard');
  await expect(page.getByRole('button', { name: 'Add Assets' })).toBeVisible();
  const stage = page.locator('.sb-stage').first();
  await expect(stage).toBeVisible();
  expect(await stage.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(90);
});
