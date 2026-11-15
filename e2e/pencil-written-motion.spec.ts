import { expect, test } from '@playwright/test';

const workrooms = [
  { route: 'logo-resizer', label: 'Logo Resizer', target: 'Add assets', panel: '.forge-v5-head' },
  { route: 'pdf-to-image', label: 'PDF to Image', target: 'Add PDF Files', panel: '.pdf-setup' },
  { route: 'image-splitter', label: 'Image Splitter', target: 'Add Images', panel: '.split-settings' },
  { route: 'video-stills', label: 'Video Stills', target: 'Add Videos', panel: '.vs-workbench-side' },
  { route: 'storyboard', label: 'Storyboard', target: 'Add Assets', panel: '.sb-controls' },
  { route: 'link-generator', label: 'Link Generator', target: 'Generate', panel: '.link-panel' },
  { route: 'ad-downloader', label: 'Ad Downloader', target: 'Copy Names', panel: '.adw-header' },
] as const;

test('all seven tools open with fully visible static pencil typography and native controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 940 });
  for (const { route, label, target, panel } of workrooms) {
    await page.goto('#/' + route);
    const tool = page.locator('.native-tool:not([hidden])');
    await expect(tool).toBeVisible();
    await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: target, exact: route !== 'link-generator' }).first()).toBeVisible();

    // The previous build animated and mounted one SVG for EACH LETTER of EVERY
    // workroom control, restarting on navigation and reducing responsiveness.
    await expect(page.locator('.pencil-written-glyph')).toHaveCount(0);
    await expect(page.locator('.pencil-glyph-vector')).toHaveCount(0);
    await expect(page.locator('.forge-app')).not.toHaveClass(/forge-intro-handoff|forge-home-finishing/);
    await expect(page.locator('.sketch-topbar .sketch-highlight-mark')).toHaveCSS('animation-name', 'none');

    // Static hand-drawn graphite hatching is real CSS on the workroom panel,
    // not an overlay image, so upload/selection interactions are unchanged.
    const surface = tool.locator(panel).first();
    await expect(surface).toBeVisible();
    await expect(surface).toHaveCSS('background-image', /data:image\/svg/);
    await page.screenshot({
      path: testInfo.outputPath('static-pencil-' + route + '.png'),
      animations: 'disabled',
      fullPage: true,
    });
  }
});

test('repeated tool switching, inputs and Storyboard tabs never mount handwriting', async ({ page }) => {
  await page.goto('#/logo-resizer');
  await expect(page.getByRole('button', { name: 'Add assets', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Generate links', exact: true })).toHaveCount(1);
  const width = page.getByRole('spinbutton', { name: 'Width in pixels' });
  await width.fill('250');
  await expect(width).toHaveValue('250');
  await page.getByRole('button', { name: 'Generate links' }).click();

  await page.goto('#/storyboard');
  await expect(page.getByRole('button', { name: 'Add Assets', exact: true })).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Grid Board', exact: true })).toHaveCount(1);
  const boardName = page.getByRole('textbox', { name: 'Board Name' });
  await boardName.fill('Illustrated pitch');
  await expect(boardName).toHaveValue('Illustrated pitch');
  await page.getByRole('tab', { name: 'Fit to Platform' }).click();
  await expect(page.getByRole('button', { name: 'Upload Image' })).toBeVisible();

  await page.goto('#/home');
  await expect(page.locator('.forge-app')).toHaveClass(/forge-home-resting/);
  await expect(page.locator('.pencil-written-glyph')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Ad Downloader' }).click();
  await expect(page.getByRole('heading', { name: 'Ad Downloader', level: 1 })).toBeVisible();
  await expect(page.locator('.pencil-written-glyph')).toHaveCount(0);
  await page.getByRole('button', { name: 'The Forge home' }).click();
  await expect(page.locator('.forge-app')).toHaveClass(/forge-home-resting/);
  await expect(page.locator('.pencil-written-glyph')).toHaveCount(0);
});

test('direct Home and reduced motion are completely drawn and never loop', async ({ page }) => {
  await page.goto('#/home');
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.pencil-written-glyph')).toHaveCount(0);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  const frame = page.locator('.sketch-page-frame-svg path').first();
  const border = page.locator('.sketch-card-border-svg path[stroke]').first();
  const detail = page.locator('.pencil-ongoing-illustration-detail').first();
  await expect(frame).toHaveCSS('animation-name', 'none');
  await expect(border).toHaveCSS('animation-name', 'none');
  await expect(detail).toHaveCSS('animation-name', 'none');
  await expect(detail).toHaveCSS('stroke-dashoffset', /^0(?:px)?$/);

  await page.getByRole('searchbox', { name: 'Find a Forge tool' }).fill('ad downloader');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(1);
  await expect(page.locator('.pencil-written-glyph')).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(detail).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.pencil-written-glyph')).toHaveCount(0);
});
