import { expect, test } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

const nativePanels = [
  ['logo-resizer', '.logo-gallery'],
  ['pdf-to-image', '.pdf-list'],
  ['image-splitter', '.split-card-grid'],
  ['video-stills', '.vs-stacks'],
  ['storyboard', '.sb-controls'],
  ['link-generator', '.link-generator'],
  ['ad-downloader', '.adw-workspace'],
] as const;

test('all seven workrooms retain native scrolling, with no parallax or smooth-scroll layer', async ({ page }) => {
  await page.setViewportSize({ width: 1496, height: 880 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [route, selector] of nativePanels) {
    await openForgeRoute(page, route);
    const panel = page.locator('.native-tool:not([hidden])').locator(selector).first();
    await expect(panel, route).toBeVisible();
    await expect(panel, route).toHaveCSS('scroll-behavior', 'auto');
    await expect(page.locator('.forge-parallax-art, .forge-parallax-near, .forge-parallax-far')).toHaveCount(0);
    const before = await panel.evaluate(el => ({ width: el.scrollWidth, client: el.clientWidth }));
    await panel.evaluate(el => {
      const spacer = document.createElement('div');
      spacer.style.cssText = 'display:block;min-height:1600px;width:1px;pointer-events:none';
      spacer.dataset.performanceFixture = 'true';
      el.appendChild(spacer);
      el.scrollTop = 190;
    });
    await expect.poll(() => panel.evaluate(el => el.scrollTop), { message: route }).toBeGreaterThan(0);
    const after = await panel.evaluate(el => ({ width: el.scrollWidth, client: el.clientWidth }));
    expect(after.width).toBeLessThanOrEqual(Math.max(before.width, before.client) + 3);
  }
  expect(errors).toEqual([]);
});

test('the navigation rail expands instantly without moving the workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 850 });
  await openForgeRoute(page, 'storyboard');
  const rail = page.locator('.sketch-sidebar-rail');
  const sidebar = page.locator('.sketch-sidebar');
  const main = page.locator('.sketch-main-area');
  const before = await main.evaluate(el => el.getBoundingClientRect().left);
  await expect(rail).toHaveCSS('width', '78px');
  await expect(sidebar).toHaveCSS('transition-property', 'none');
  await rail.hover({ position: { x: 20, y: 140 } });
  await expect.poll(() => sidebar.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(210);
  const after = await main.evaluate(el => el.getBoundingClientRect().left);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
});

test('sidebar switch and Home return do not mount visual transitions', async ({ page }) => {
  await openForgeRoute(page, 'logo-resizer');
  await page.getByRole('navigation', { name: 'Select a tool' })
    .getByRole('button', { name: 'Storyboard' }).click();
  await expect(page).toHaveURL(/#\/storyboard$/);
  await expect(page.locator('.forge-tool-opening, .forge-route-pencil-stroke')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/#\/home$/);
});

test('large workroom elements are never scaled or animated on route change', async ({ page }) => {
  await openForgeRoute(page, 'home');
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('transform', 'none');
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.forge-tool-opening')).toHaveCount(0);
});

test('reduced-motion mode still scrolls and switches immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openForgeRoute(page, 'storyboard');
  await expect(page.locator('.sb-controls')).toHaveCSS('scroll-behavior', 'auto');
  await openForgeRoute(page, 'logo-resizer');
  await expect(page.locator('.logo-gallery')).toBeVisible();
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('animation-name', 'none');
});
