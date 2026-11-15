import { test, expect } from '@playwright/test';

test('uploaded pencil drawing completes and continues into the actual seven-card Forge Home', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1586, height: 992 });
  await page.goto('./');
  const intro = page.getByRole('dialog', { name: 'The Forge opening pencil sketch' });
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute('data-intro-stage', 'drawing');
  await expect(intro.locator('#forge-intro-layer-drafting-guides')).toHaveCount(1);
  await expect(intro.locator('#forge-intro-layer-frame-and-emblem')).toHaveCount(1);
  await expect(intro.locator('#forge-intro-layer-title')).toHaveCount(1);
  await expect(intro.locator('#forge-intro-layer-caption')).toHaveCount(1);
  // Exactly the SAME authored rough-pencil font/drawing in intro and Home.
  // The old serif title + partial stroke paths produced the broken letters
  // visible in the user screenshot; neither may render now.
  const introTitle = intro.locator('.forge-intro-title-bridge .pencil-wordmark-art');
  const homeTitle = page.locator('.sketch-hero-center .pencil-wordmark-art');
  await expect(introTitle).toHaveCount(1);
  await expect(introTitle.locator('text').last()).toHaveText('THE FORGE');
  await expect(introTitle.locator('tspan.pencil-writing-glyph')).toHaveCount(8);
  await expect(introTitle.locator('tspan.pencil-writing-glyph').last()).toHaveAttribute('style', /--glyph-index:\s*7/);
  // The word space has no empty pencil-writing beat.
  await expect(introTitle.locator('text').last().locator('tspan:not(.pencil-writing-glyph)')).toHaveCount(1);
  await expect(introTitle).toHaveCSS('clip-path','none');
  await expect(introTitle.locator('tspan.pencil-writing-glyph').first()).toHaveCSS('animation-name', /forgePencilGlyphTrace/);
  await expect(introTitle.locator('pattern')).toHaveAttribute('id', 'forge-intro-graphite-grain');
  await expect(homeTitle.locator('pattern')).toHaveAttribute('id', 'forge-graphite-grain');
  expect(await introTitle.locator('text').last().getAttribute('font-family'))
    .toEqual(await homeTitle.locator('text').last().getAttribute('font-family'));
  await expect(intro.locator('.title-charcoal-ghost, .title-charcoal-fill, .title-stroke-6b')).toHaveCount(0);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  const subtitleHighlight = page.locator('.sketch-subtitle .sketch-highlight-sweep');
  const cardHighlight = page.locator('.sketch-home-grid .sketch-card-title .sketch-highlight-mark').first();
  const highlightState = async (locator: typeof subtitleHighlight) => locator.evaluate(element => {
    const css = getComputedStyle(element, '::before');
    return { name: css.animationName, iterations: css.animationIterationCount };
  });
  // The intro is drawing on a separate sheet. Hidden Home highlights must
  // not play the old theme animation underneath, then replay after the handoff.
  expect((await highlightState(subtitleHighlight)).name).toBe('none');
  expect((await highlightState(cardHighlight)).name).toBe('none');

  await page.waitForTimeout(2150);
  await page.screenshot({ path: testInfo.outputPath('intro-pencil-drawing.png') });
  await expect(intro).toHaveAttribute('data-intro-stage', 'handoff', { timeout: 5500 });
  // No ghosted intro anvil/guide drawing may overlay cards during the
  // continuing graphite Home sketch; ONLY the shared wordmark flies.
  await expect(intro.locator('.forge-intro-artwork')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.forge-app')).toHaveClass(/forge-intro-handoff/);
  expect(await highlightState(subtitleHighlight)).toEqual({ name: 'forgePencilShadeSweep', iterations: '1' });
  expect(await highlightState(cardHighlight)).toEqual({ name: 'forgePencilShadeSweep', iterations: '1' });
  await expect(introTitle.locator('g[filter]').first()).toHaveCSS('filter', 'none');
  const border = page.locator('.sketch-home-grid .sketch-card-border-svg path[stroke]').first();
  await expect(border).toHaveAttribute('pathLength', '1');
  await expect(border).toHaveCSS('animation-name', 'forgeIntroActualCardStroke');
  const pencilGeometry = page.locator('.sketch-home-grid .sketch-card-art > svg path').first();
  await expect(pencilGeometry).toHaveAttribute('pathLength','1');
  await expect(pencilGeometry).toHaveCSS('animation-name', /forgePencilTraceRealPath/);
  await expect(page.locator('.sketch-home-grid .sketch-card-art > svg').first()).toHaveCSS('clip-path','none');
  await expect(page.locator('.sketch-home-grid .pencil-written-glyph').first()).toHaveCSS('animation-name','forgePencilHandwriteLetter');

  await page.waitForTimeout(570);
  await page.screenshot({ path: testInfo.outputPath('intro-home-handoff.png') });
  await expect(intro).toHaveCount(0, { timeout: 3500 });
  await expect(page.locator('.forge-app')).not.toHaveClass(/forge-intro-handoff/);
  await expect(page.getByRole('heading', { name: 'THE FORGE', level: 1 })).toBeVisible();
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
  // The opening ends, but the Home drawing does NOT stop: non-destructive
  // pencil over-strokes continue looping without concealing title/buttons.
  await expect(page.locator('.forge-app')).toHaveClass(/forge-home-continuous-draw/);
  expect((await highlightState(subtitleHighlight)).name).toBe('none');
  expect((await highlightState(cardHighlight)).name).toBe('none');
  await page.waitForTimeout(300);
  expect((await highlightState(subtitleHighlight)).name).toBe('none');
  expect((await highlightState(cardHighlight)).name).toBe('none');
  const ongoing = page.locator('.sketch-card-border-svg .sketch-ongoing-card-border').first();
  await expect(ongoing).toHaveCSS('animation-name','forge-home-ongoing-graphite');
  await expect(ongoing).toHaveCSS('animation-iteration-count','infinite');
  await expect(page.getByRole('button', {name:'Open Storyboard'})).toBeVisible();
  // The intro-to-settled handoff must not restart the old full-line wipe:
  // it used to blank all seven card descriptions for another frame.
  const description = page.locator('.sketch-home-grid .sketch-card-desc').first();
  await expect(description).toContainText(/.+/);
  await expect(description).toHaveCSS('animation-name','none');
  await expect(description).toHaveCSS('clip-path','none');
  await expect(page.locator('.sketch-card-border-svg [data-pencil-trace]').first()).toHaveCSS('animation-name','none');

  await page.screenshot({ path: testInfo.outputPath('intro-home-finished.png') });

  // A direct second visit to root in this tab does not replay the animation.
  await page.goto('./');
  await expect(intro).toHaveCount(0);
});

test('intro skip and user-triggered replay never change tool routing', async ({ page }) => {
  await page.goto('./');
  const intro = page.getByRole('dialog', { name: 'The Forge opening pencil sketch' });
  await expect(intro).toBeVisible();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(intro).toHaveCount(0);
  await page.getByRole('button', { name: /Replay pencil sketch intro/ }).click();
  await expect(intro).toBeVisible();

  // Hash navigation remains available throughout; direct route bypasses intro.
  await page.evaluate(() => { window.location.hash = '#/logo-resizer'; });
  await expect(intro).toHaveCount(0);
  await expect(page.locator('.logo-workspace')).toBeVisible();
  await page.goto('#/home');
  await expect(intro).toHaveCount(0);
  // Existing search matches card description text as well as tool names.
  // Use a uniquely matching query; do not change the application's search.
  await page.getByRole('searchbox', { name: 'Find a Forge tool' }).fill('ad downloader');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open Ad Downloader' }).click();
  await expect(page).toHaveURL(/#\/ad-downloader$/);
});

test('deep links and reduced-motion preferences show settled Home without animation', async ({ page }) => {
  await page.goto('#/home');
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);
});
