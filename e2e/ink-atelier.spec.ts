import { test, expect } from '@playwright/test';

test('Ink Atelier Home has real seeded Rough.js ink paths over all seven original cards', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('#/home');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  await expect(page.locator('.ink-atelier-card-linework')).toHaveCount(7);
  await expect.poll(async () => page.locator('.ink-atelier-card-linework > g').count()).toBe(21);

  const geometry = await page.locator('.ink-atelier-card-linework').evaluateAll(elements =>
    elements.map(el => ({
      groupCount: el.querySelectorAll('g').length,
      firstPath: el.querySelector('path')?.getAttribute('d') || '',
      pointerEvents: getComputedStyle(el).pointerEvents,
      box: el.getBoundingClientRect().width,
    }))
  );
  expect(geometry.every(item => item.groupCount === 3 && item.box > 200)).toBe(true);
  expect(new Set(geometry.map(item => item.firstPath)).size).toBeGreaterThan(4);
  expect(geometry.every(item => item.pointerEvents === 'none')).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('atelier-home-desktop.png') });
  expect(errors).toEqual([]);
});

test('Ink Atelier keeps 7 workspace routes and native controls intact', async ({ page }, testInfo) => {
  const routes = [
    ['logo-resizer', '.logo-workspace'],
    ['pdf-to-image', '.pdf-workspace'],
    ['image-splitter', '.split-workspace'],
    ['video-stills', '.video-stills'],
    ['storyboard', '.storyboard-tool'],
    ['link-generator', '.link-generator'],
    ['ad-downloader', '.adw-workspace'],
  ] as const;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const [route, selector] of routes) {
    await page.goto('#/' + route);
    const root = page.locator(selector);
    await expect(root).toBeVisible();
    await expect(root.locator('button').first()).toBeVisible();
    await expect(root).toHaveCSS('font-family', /Kalam/);
    const border = await page.evaluate(() => getComputedStyle(document.querySelector('.forge-app')!).getPropertyValue('--sk-border-ctrl'));
    expect(border).toContain('data:image/svg+xml');
    if (route === 'logo-resizer' || route === 'storyboard') {
      await page.screenshot({ path: testInfo.outputPath('atelier-' + route + '.png') });
    }
  }
  expect(errors).toEqual([]);
});

test('Ink Atelier cards remain accessible on smaller desktops without layout overlap', async ({ page }) => {
  for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 768 });
    await page.goto('#/home');
    const cards = await page.locator('.sketch-home-grid .sketch-tool-card').evaluateAll(els => els.map(el => {
      const r = el.getBoundingClientRect();
      return { x:r.x, y:r.y, right:r.right, bottom:r.bottom };
    }));
    for (let a=0;a<cards.length;a++) {
      for (let b=a+1;b<cards.length;b++) {
        const overX = Math.min(cards[a].right,cards[b].right)-Math.max(cards[a].x,cards[b].x);
        const overY = Math.min(cards[a].bottom,cards[b].bottom)-Math.max(cards[a].y,cards[b].y);
        expect(overX <= 1 || overY <= 1, width + 'px: no card overlap').toBe(true);
      }
    }
  }
});
