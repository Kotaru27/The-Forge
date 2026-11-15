import { expect, test } from '@playwright/test';

const nativePanels = [
  ['logo-resizer', '.logo-gallery'],
  ['pdf-to-image', '.pdf-list'],
  ['image-splitter', '.split-card-grid'],
  ['video-stills', '.vs-stacks'],
  ['storyboard', '.sb-controls'],
  ['link-generator', '.link-generator'],
  ['ad-downloader', '.adw-workspace'],
] as const;

test('every workroom scrolls natively without parallax layers or wheel interception', async ({ page }) => {
  await page.setViewportSize({ width: 1496, height: 880 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const [route, selector] of nativePanels) {
    await page.goto('#/' + route);
    const tool = page.locator('.native-tool:not([hidden])');
    await expect(tool).toBeVisible();
    const panel = tool.locator(selector).first();
    await expect(panel).toBeVisible();
    // All route-specific parallax portals are completely removed.
    await expect(page.locator('.forge-parallax-art, .forge-parallax-near, .forge-parallax-far')).toHaveCount(0);
    await expect(panel).toHaveCSS('scroll-behavior', 'smooth');

    // Verify the actual scroll container is still browser-driven.
    // A synthetic empty-state spacer tests scrolling without importing media
    // or changing any processing engine, preset, image or canvas.
    const before = await panel.evaluate(el => ({
      width: el.scrollWidth,
      viewport: el.clientWidth,
      height: el.scrollHeight,
      visible: el.clientHeight,
    }));
    await panel.evaluate(el => {
      const filler = document.createElement('div');
      filler.dataset.performanceFixture = 'true';
      filler.style.cssText = 'display:block;min-height:1600px;width:1px;pointer-events:none';
      el.appendChild(filler);
      el.scrollTop = 190;
    });
    await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    // No unusual horizontal overflow is introduced by the parallax portal.
    const after = await panel.evaluate(el => ({
      width: el.scrollWidth,
      viewport: el.clientWidth,
      height: el.scrollHeight,
      visible: el.clientHeight,
    }));
    expect(after.width).toBeLessThanOrEqual(Math.max(before.width, before.viewport) + 3);
    expect(after.height).toBeGreaterThan(before.height);
    // Responsive result grids may increase their own height when data is
    // inserted. Preserve usable scrolling instead of imposing fixed geometry.
    expect(after.visible).toBeGreaterThan(70);
  }
  expect(errors).toEqual([]);
});

test('sidebar expands within fixed rail and focus remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 850 });
  await page.goto('#/storyboard');
  const rail = page.locator('.sketch-sidebar');
  await expect(rail).toBeVisible();
  await expect(rail).toHaveCSS('transition-property', 'width');
  // A changing min-width used to jump straight to 210px and clamp width's transition.
  await expect(rail).toHaveCSS('min-width', '0px');

  const before = await rail.evaluate(el => el.getBoundingClientRect().width);
  await rail.hover({ position: { x: 18, y: 140 } });
  await expect.poll(() => rail.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBeGreaterThan(Math.round(before) + 60);
  const label = page.locator('.sketch-subtool-label').first();
  await expect(label).toHaveCSS('clip-path', 'none');
  // Decorative SVG width changes must not initiate additional layout animations.
  await expect(page.locator('.sketch-brand-btn svg').first()).toHaveCSS('transition-property', 'none');
  await expect(page.locator('.sketch-sidebar-doodle svg').first()).toHaveCSS('transition-property', 'none');
  const highlight = await page.locator('.sketch-subtool-link').first().evaluate(el => {
    const before = getComputedStyle(el, '::before');
    return { clip: before.clipPath, transition: before.transitionProperty };
  });
  expect(highlight.clip).toBe('none');
  expect(highlight.transition).toBe('transform');
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);
});

test('sidebar opens smoothly without moving the workroom or losing hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 850 });
  await page.goto('#/logo-resizer');
  const sidebar = page.locator('.sketch-sidebar');
  const rail = page.locator('.sketch-sidebar-rail');
  const main = page.locator('.sketch-main-area');
  await expect(rail).toBeVisible();
  const before = await main.evaluate(el => el.getBoundingClientRect().left);
  await expect(rail).toHaveCSS('width', '76px');
  await expect(sidebar).toHaveCSS('transition-property', 'width');
  await expect(sidebar).toHaveCSS('min-width', '0px');

  await sidebar.hover({ position: { x: 22, y: 170 } });
  await expect.poll(() => sidebar.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(210);
  const after = await main.evaluate(el => el.getBoundingClientRect().left);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1);

  const bounds = await sidebar.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(bounds!.x + 145, bounds!.y + 210);
  await expect.poll(() => sidebar.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(210);
  const brand = sidebar.getByRole('button', { name: 'The Forge home' });
  await expect(brand).toBeVisible();
  await page.getByRole('button', { name: 'Storyboard', exact: true }).click();
  await expect(page).toHaveURL(/#\/storyboard$/);
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-tool-opening/);
  expect(Math.abs((await main.evaluate(el => el.getBoundingClientRect().left)) - before)).toBeLessThanOrEqual(1);
});

test('populated workroom motion does not scale the whole tool surface', async ({ page }) => {
  await page.setViewportSize({ width: 1470, height: 880 });
  await page.goto('#/home');
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page.locator('.forge-app')).toHaveClass(/forge-tool-opening/);
  const workspace = page.locator('.native-tool:not([hidden])');
  await expect(workspace).toHaveCSS('animation-name', 'none');
  await expect(workspace).toHaveCSS('transform', 'none');
  await expect(workspace).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-motion="tool-card-to-workspace"]')).toHaveCSS('pointer-events', 'none');
  await expect(page.getByRole('spinbutton', { name: 'Width in pixels' })).toBeVisible();
  await expect(page.locator('[data-motion="tool-card-to-workspace"]')).toHaveCount(0);
});

test('reduced motion preserves native scrolling but removes smooth programmatic transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/storyboard');
  await expect(page.getByRole('button', { name: 'Add Assets' })).toBeVisible();
  await expect(page.locator('.sb-controls')).toHaveCSS('scroll-behavior', 'auto');
  await expect(page.locator('.forge-parallax-art, .forge-parallax-near, .forge-parallax-far')).toHaveCount(0);
});

test('sidebar quick-switch has header-only interruptible motion and does not scale workrooms', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 860 });
  await page.goto('#/logo-resizer');
  await page.evaluate(() => {
    const main = document.querySelector('.sketch-main-area')!;
    const globals = window as typeof window & { __routeCueCount?: number };
    globals.__routeCueCount = 0;
    new MutationObserver(() => {
      if (main.querySelector('.forge-switching-tool .forge-route-pencil-stroke'))
        globals.__routeCueCount!++;
    }).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await page.getByRole('button', { name: 'Storyboard', exact: true }).click();
  await expect(page).toHaveURL(/#\/storyboard$/);
  await page.getByRole('button', { name: 'PDF to Image', exact: true }).click();
  await expect(page).toHaveURL(/#\/pdf-to-image$/);
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __routeCueCount?: number }).__routeCueCount ?? 0
  )).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-tool-opening/);
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('transform', 'none');
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('opacity', '1');
  await expect(page.locator('.forge-route-pencil-stroke')).toHaveCount(0, { timeout: 1000 });
});

test('sidebar tool-switch cue is disabled for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/logo-resizer');
  await page.getByRole('button', { name: 'Storyboard', exact: true }).click();
  await expect(page).toHaveURL(/#\/storyboard$/);
  await expect(page.locator('.forge-route-pencil-stroke')).toHaveCount(0);
  await expect(page.locator('.sketch-topbar')).not.toHaveClass(/forge-switching-tool/);
});
