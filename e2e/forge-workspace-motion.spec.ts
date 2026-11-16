import { expect, test } from '@playwright/test';

const panelMap = [
  ['logo-resizer', '.logo-gallery'],
  ['pdf-to-image', '.pdf-list'],
  ['image-splitter', '.split-card-grid'],
  ['video-stills', '.vs-stacks'],
  ['storyboard', '.sb-controls'],
  ['link-generator', '.link-generator'],
  ['ad-downloader', '.adw-workspace'],
] as const;

test('Home card opens a tool with one nonblocking paper FLIP instead of retyping the UI', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto('#/home');
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);

  const card = page.getByRole('button', { name: 'Open Logo Resizer' });
  await expect(card).toBeVisible();
  await card.click();

  await expect(page).toHaveURL(/#\/logo-resizer$/);
  await expect(page.locator('.forge-app')).toHaveClass(/forge-tool-opening/);
  // A populated workspace must not become one large animated GPU surface.
  await expect(page.locator('.native-tool:not([hidden])')).toHaveCSS('animation-name', 'none');
  const flight = page.locator('[data-motion="tool-card-to-workspace"]');
  await expect(flight).toBeAttached();
  await expect(flight).toHaveCSS('pointer-events', 'none');
  await expect(flight.locator('svg')).toHaveCount(0); // no distorted full-workroom frame
  await expect(page.getByRole('spinbutton', { name: 'Width in pixels' })).toBeVisible();
  await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('forge-tool-opening.png') });

  // The transition must clean up unconditionally, including in background tabs.
  await expect(flight).toHaveCount(0, { timeout: 2500 });
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-tool-opening/);
  const width = page.getByRole('spinbutton', { name: 'Width in pixels' });
  await width.fill('250');
  await expect(width).toHaveValue('250');

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.forge-app')).toHaveClass(/forge-home-resting/);
  await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);
  await expect(page.locator('[data-motion="tool-card-to-workspace"]')).toHaveCount(0);
});

test('normal sidebar tool switching is immediate and never mounts a Home-card clone', async ({ page }) => {
  await page.goto('#/storyboard');
  await expect(page.getByRole('button', { name: 'Add Assets' })).toBeVisible();
  await page.getByRole('button', { name: 'Video Stills', exact: true }).click();
  await expect(page).toHaveURL(/#\/video-stills$/);
  await expect(page.getByRole('button', { name: 'Add Videos' })).toBeVisible();
  await expect(page.locator('[data-motion="tool-card-to-workspace"]')).toHaveCount(0);
  await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);
  await page.getByRole('button', { name: 'Storyboard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Assets' })).toBeVisible();
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-tool-opening/, {timeout: 2500});
});

test('all seven tool workrooms are parallax-free and retain native smooth scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1480, height: 850 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const [route, selector] of panelMap) {
    await page.goto('#/' + route);
    const panel = page.locator('.native-tool:not([hidden]) ' + selector).first();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS('scroll-behavior', 'smooth');
    await expect(page.locator('.forge-parallax-art, .forge-parallax-near, .forge-parallax-far')).toHaveCount(0);
    await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('native scrolling responds without moving or overlaying tool content', async ({ page }) => {
  await page.goto('#/logo-resizer');
  const panel = page.locator('.logo-gallery');
  await expect(panel).toHaveCSS('overflow-y', 'auto');
  await panel.evaluate(el => {
    const spacer = document.createElement('div');
    spacer.dataset.testScrollSpacer = 'true';
    spacer.style.height = '1600px';
    spacer.style.pointerEvents = 'none';
    el.appendChild(spacer);
    el.scrollTo({ top: 220, behavior: 'instant' });
  });
  // Chromium may apply a tiny (+/- 2px) scroll anchoring adjustment after
  // injecting the synthetic spacer. Check actual position, not exact rounding.
  await expect.poll(() => panel.evaluate(el => Math.abs(el.scrollTop - 220)))
    .toBeLessThanOrEqual(3);
  await expect(page.locator('.forge-parallax-art')).toHaveCount(0);
});

test('reduced-motion preference disables FLIP and scroll animation without changing navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/home');
  await page.getByRole('button', { name: 'Open PDF to Image' }).click();
  await expect(page).toHaveURL(/#\/pdf-to-image$/);
  await expect(page.locator('[data-motion="tool-card-to-workspace"]')).toHaveCount(0);
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-tool-opening/);
  const panel = page.locator('.pdf-list');
  await expect(panel).toHaveCSS('scroll-behavior', 'auto');
  await expect(page.locator('.forge-parallax-art, .forge-parallax-near, .forge-parallax-far')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add PDF Files' })).toBeVisible();
});
