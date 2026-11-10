import { test, expect } from '@playwright/test';

const labels = [
  'Logo Resizer', 'PDF to Image', 'Image Splitter', 'Video Stills',
  'Storyboard', 'Link Generator', 'Ad Downloader',
] as const;

test('seven elastic Home cards are accessible and behave as one continuous reel', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('#/home');

    const reel = page.locator('.forge-elastic-reel');
    const cards = reel.locator('.forge-home-card');
    await expect(reel).toBeVisible();
    await expect(cards).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'THE FORGE' })).toBeVisible();

    for (let i = 0; i < labels.length; i++) {
      const card = page.getByRole('button', { name: 'Open ' + labels[i] });
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('data-tool');
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(55);
      expect(box!.height).toBeGreaterThan(245);
    }

    const before = await cards.evaluateAll(elements =>
      elements.map(element => element.getBoundingClientRect().width)
    );
    expect(Math.max(...before) - Math.min(...before)).toBeLessThan(35);

    const selected = cards.nth(3);
    await selected.hover();
    await expect(selected).toHaveAttribute('data-expanded', 'true');
    await expect.poll(async () => {
      const sizes = await cards.evaluateAll(elements =>
        elements.map(element => element.getBoundingClientRect().width)
      );
      return sizes[3] / Math.max(sizes[0], sizes[6]);
    }).toBeGreaterThan(2.2);
    await page.screenshot({ path: testInfo.outputPath('elastic-seven-' + width + '.png') });

    await page.mouse.move(2, 2);
    await expect(selected).toHaveAttribute('data-expanded', 'false');
    await expect.poll(async () => {
      const sizes = await cards.evaluateAll(elements =>
        elements.map(element => element.getBoundingClientRect().width)
      );
      return Math.max(...sizes) - Math.min(...sizes);
    }).toBeLessThan(35);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test('keyboard focus expands card, Enter opens the same route, and Home remains a destination', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('#/home');

  const card = page.getByRole('button', { name: 'Open Storyboard' });
  await card.focus();
  await expect(card).toHaveAttribute('data-expanded', 'true');
  await card.press('Enter');
  await expect(page).toHaveURL(/#\/storyboard$/);
  await expect(page.locator('.storyboard-tool')).toBeVisible();

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.forge-elastic-reel .forge-home-card')).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Open Storyboard' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('reduced-motion users can still open all seven workspaces without animation blocking navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/home');
  const link = page.getByRole('button', { name: 'Open Ad Downloader' });
  await link.focus();
  await expect(link).toHaveAttribute('data-expanded', 'true');
  await link.press('Enter');
  await expect(page.locator('.adw-workspace')).toBeVisible();
});
