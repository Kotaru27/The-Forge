import { test, expect } from '@playwright/test';

test('Domino lettering preserves readable THE FORGE heading while animating and rebuilding', async ({ page }, testInfo) => {
  const exceptions: string[] = [];
  page.on('pageerror', error => exceptions.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('#/home');
  const title = page.getByRole('heading', { name: 'THE FORGE', level: 1 });
  await expect(title).toBeVisible();
  const letters = title.locator('.forge-domino-letter');
  await expect(letters).toHaveCount(8);
  expect(await letters.evaluateAll(nodes => nodes.map(node => node.textContent).join(''))).toBe('THEFORGE');
  const animation = await letters.first().evaluate(el => getComputedStyle(el).animationName);
  expect(animation).toContain('forge-domino-fall');
  expect(animation).toContain('forge-domino-rise');
  const before = await title.boundingBox();
  await page.screenshot({ path: testInfo.outputPath('domino-before.png') });
  const tagline = page.getByText('Seven dedicated tools. One continuous creative workspace.');
  for (const delay of [620, 540, 480]) {
    await page.waitForTimeout(delay);
    const letteringBottom = await letters.evaluateAll(nodes =>
      Math.max(...nodes.map(node => node.getBoundingClientRect().bottom))
    );
    const subtitleTop = (await tagline.boundingBox())?.y ?? 0;
    expect(letteringBottom).toBeLessThan(subtitleTop + 2);
  }
  await page.screenshot({ path: testInfo.outputPath('domino-mid-animation.png') });
  await page.waitForTimeout(1350);
  const after = await title.boundingBox();
  expect(after).not.toBeNull();
  expect(before).not.toBeNull();
  expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
  await expect.poll(async () => letters.first().evaluate(el => {
    const transform = getComputedStyle(el).transform;
    return transform === 'none' || new DOMMatrixReadOnly(transform).isIdentity;
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('domino-settled.png') });
  expect(exceptions).toEqual([]);
});

test('all seven cards have readable permanent titles on the resting reel at desktop sizes', async ({ page }, testInfo) => {
  for (const [width,height] of [[1366,768],[1440,900],[1920,1080]] as const) {
    await page.setViewportSize({width,height});
    await page.goto('#/home');
    const cards = page.locator('.forge-elastic-card');
    await expect(cards).toHaveCount(7);
    for (const card of await cards.all()) {
      const label = card.locator('.forge-elastic-slice-title');
      const visible = await label.evaluate(el => {
        const cardEl = el.closest('.forge-elastic-card');
        const rect = el.getBoundingClientRect();
        const parent = cardEl?.getBoundingClientRect();
        const css = getComputedStyle(el);
        return {
          text: el.textContent?.trim(),
          fontSize: parseFloat(css.fontSize),
          rectWidth: rect.width,
          rectRight: rect.right,
          parentRight: parent?.right ?? 0,
          height: rect.height
        };
      });
      expect(visible.text?.length).toBeGreaterThan(3);
      expect(visible.fontSize).toBeGreaterThanOrEqual(15);
      expect(visible.rectRight).toBeLessThanOrEqual(visible.parentRight + 1);
      expect(visible.height).toBeGreaterThanOrEqual(16);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect.poll(async () => Number(await cards.last().evaluate(el => getComputedStyle(el).opacity))).toBe(1);
    await page.screenshot({ path: testInfo.outputPath('refined-reel-' + width + '.png') });
  }
});

test('reduced motion disables domino animation without affecting the workspace launch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('#/home');
  const letters = page.locator('.forge-domino-letter');
  await expect(letters).toHaveCount(8);
  await expect(letters.first()).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('heading', { name: 'THE FORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Link Generator' }).click();
  await expect(page.locator('.link-generator')).toBeVisible();
});
