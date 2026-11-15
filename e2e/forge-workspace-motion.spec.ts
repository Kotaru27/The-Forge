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
  const flight = page.locator('[data-motion="tool-card-to-workspace"]');
  await expect(flight).toBeAttached();
  await expect(flight).toHaveCSS('pointer-events', 'none');
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

test('Osmo-inspired two-depth graphite artwork attaches to every active workspace and cleans up on switch', async ({ page }) => {
  await page.setViewportSize({ width: 1480, height: 850 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const [route, selector] of panelMap) {
    await page.goto('#/' + route);
    const panel = page.locator('.native-tool:not([hidden]) ' + selector).first();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/forge-parallax-scroll/);
    // The Link Generator has a nested scrollable preview: it legitimately
    // contains a second portal. Inspect only THIS panel's direct overlay.
    const near = panel.locator(':scope > .forge-parallax-art > .forge-parallax-near');
    const far = panel.locator(':scope > .forge-parallax-art > .forge-parallax-far');
    await expect(near).toHaveCount(1);
    await expect(far).toHaveCount(1);
    await expect(near).toHaveCSS('background-image', /data:image\/svg/);
    await expect(far).toHaveCSS('background-image', /data:image\/svg/);
    await expect(panel.locator('.forge-parallax-art')).toHaveCSS('pointer-events', 'none');
    await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);
  }
  // Inactive, still-mounted workrooms must not keep a scroll listener/animation.
  await expect(page.locator('.native-tool[hidden] .forge-parallax-scroll')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('parallax uses native panel scrollTop and only moves decorative layers', async ({ page }) => {
  await page.goto('#/logo-resizer');
  const panel = page.locator('.logo-gallery');
  await expect(panel).toHaveClass(/forge-parallax-scroll/);

  // Test-only content supplies scrollable height in the empty image gallery.
  await panel.evaluate(el => {
    const filler = document.createElement('div');
    filler.dataset.testScrollSpacer = 'true';
    filler.style.height = '1600px';
    filler.style.pointerEvents = 'none';
    el.appendChild(filler);
    el.scrollTop = 220;
  });
  await expect.poll(() => panel.locator('.forge-parallax-near').evaluate(
    el => (el as HTMLElement).style.transform
  )).toContain('123px');
  await expect.poll(() => panel.locator('.forge-parallax-far').evaluate(
    el => (el as HTMLElement).style.transform
  )).toContain('59px');
  expect(await panel.evaluate(el => Math.round(el.scrollTop))).toBe(220);
  await expect(panel).toHaveCSS('overflow-y', 'auto');

  await page.goto('#/storyboard');
  await expect(page.locator('.logo-gallery')).not.toHaveClass(/forge-parallax-scroll/);
  await expect(page.locator('.logo-gallery .forge-parallax-art')).toHaveCount(0);
  await expect(page.locator('.logo-gallery')).not.toHaveAttribute('style', /--forge-parallax/);
  await expect(page.locator('.sb-controls')).toHaveClass(/forge-parallax-scroll/);
});

test('reduced-motion preference disables FLIP and scroll parallax without changing navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/home');
  await page.getByRole('button', { name: 'Open PDF to Image' }).click();
  await expect(page).toHaveURL(/#\/pdf-to-image$/);
  await expect(page.locator('[data-motion="tool-card-to-workspace"]')).toHaveCount(0);
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-tool-opening/);
  const panel = page.locator('.pdf-list');
  await expect(panel).toHaveClass(/forge-parallax-disabled/);
  await expect(panel.locator('.forge-parallax-near')).toHaveCSS('opacity', '0');
  await expect(panel.locator('.forge-parallax-far')).toHaveCSS('opacity', '0');
  await expect(page.getByRole('button', { name: 'Add PDF Files' })).toBeVisible();
});
