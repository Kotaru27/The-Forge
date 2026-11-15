import { expect, test } from '@playwright/test';

const workrooms = [
  { route: 'logo-resizer', heading: 'Logo resizer', target: 'Add assets' },
  { route: 'pdf-to-image', heading: 'PDF to Image', target: 'Add PDF Files' },
  { route: 'image-splitter', heading: 'Image Splitter', target: 'Add Images' },
  { route: 'video-stills', heading: 'Video collections', target: 'Add Videos' },
  { route: 'storyboard', heading: 'Board settings', target: 'Add Assets' },
  { route: 'link-generator', heading: 'Source & filenames', target: 'Generate' },
  { route: 'ad-downloader', heading: 'Ad Downloader', target: 'Copy Names' },
] as const;

test('all seven workrooms handwrite static headings, instructions and control names using actual SVG contours', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 940 });
  for (const {route, heading, target} of workrooms) {
    await page.goto('#/' + route);
    const tool = page.locator('.native-tool:not([hidden])');
    await expect(tool).toBeVisible();
    const letter = tool.locator('.pencil-written-glyph').first();
    const svg = letter.locator('.pencil-glyph-vector');
    const ink = letter.locator('.pencil-glyph-face');
    const strokes = letter.locator('.pencil-glyph-stroke');
    await expect(letter).toHaveCSS('clip-path','none');
    await expect(svg).toHaveCount(1);
    await expect(strokes).toHaveCSS('animation-name', /forgePencilContour/);
    await expect(strokes).toHaveCSS('stroke-dasharray', /[0-9]/);
    await expect(ink).toHaveCSS('animation-name','forgePencilOriginalLetter');
    await expect(page.getByText(heading, {exact: true}).first()).toBeVisible();
    await expect(page.getByRole('button', {name: target, exact: route !== 'link-generator'}).first()).toBeVisible();
    // Text is never line-clipped or missing after the finite writing pass.
    await page.waitForTimeout(1000);
    await expect(ink).toHaveCSS('opacity','1');
  }
});

test('existing interactive controls keep their values and semantics without re-handwriting on change', async ({page}) => {
  await page.goto('#/logo-resizer');
  const label = page.locator('.forge-v5-group-title .pencil-glyph-stroke').first();
  await expect(label).toHaveCSS('animation-name', /forgePencilContour/);
  const size = page.getByRole('spinbutton', {name:'Width in pixels'});
  await size.fill('250');
  await expect(size).toHaveValue('250');
  await expect(label).toHaveCSS('animation-iteration-count', /1/);
  await page.getByRole('button', {name:'Generate links'}).click();
  await expect(page.locator('.logo-workspace')).toBeVisible();

  await page.goto('#/storyboard');
  const boardName = page.getByRole('textbox', {name:'Board Name'});
  await boardName.fill('Illustrated pitch');
  await expect(boardName).toHaveValue('Illustrated pitch');
  await page.getByRole('tab', {name:'Fit to Platform'}).click();
  await expect(page.getByRole('button', {name:'Upload Image'})).toBeVisible();
});

test('illustrations animate while all visible paper and card borders remain stationary', async ({page}) => {
  await page.goto('#/home');
  const pageFrame = page.locator('.sketch-page-frame-svg path').first();
  const border = page.locator('.sketch-card-border-svg [data-pencil-trace]').first();
  await expect(pageFrame).toHaveCSS('animation-name', 'none');
  await expect(border).toHaveCSS('animation-name', 'none');
  const illustration = page.locator('.sketch-card-art .pencil-ongoing-illustration-detail').first();
  await expect(illustration).toHaveCSS('animation-name','forge-home-ongoing-graphite');
  await expect(page.locator('.sketch-card-art .pencil-ongoing-illustration-detail')).toHaveCount(7);
  await page.getByRole('searchbox', {name:'Find a Forge tool'}).fill('ad downloader');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(1);
  await expect(page.locator('.sketch-card-border-svg path').first()).toHaveCSS('animation-name','none');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.sketch-home-grid .pencil-glyph-vector').first()).toBeHidden();
  await expect(page.locator('.sketch-home-grid .pencil-glyph-face').first()).toHaveCSS('opacity','1');
});
