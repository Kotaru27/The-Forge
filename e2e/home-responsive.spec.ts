import { test, expect } from '@playwright/test';

/** Screenshot regression: Home cards and their descriptions must stay in their own rows. */
test('Ink & Paper Home has no overlapping or clipped cards on narrow and short screens', async ({ page }, testInfo) => {
  await page.goto('#/home');
  await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(7);

  const sizes = [
    [1600, 900], [1536, 768], [1440, 700], [1366, 768],
    [1280, 720], [1024, 768], [820, 720], [768, 680],
    [740, 700], [600, 750], [390, 780],
  ] as const;

  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.locator('.sketch-home').evaluate(el => { el.scrollTop = 0; });

    const measured = await page.evaluate(() => {
      const parent = document.querySelector<HTMLElement>('.sketch-home');
      const buttons = [...document.querySelectorAll<HTMLElement>('.sketch-home-grid .sketch-tool-card')];
      const bounds = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      return {
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
        scrollWidth: parent?.scrollWidth ?? 0,
        clientWidth: parent?.clientWidth ?? 0,
        scrollHeight: parent?.scrollHeight ?? 0,
        clientHeight: parent?.clientHeight ?? 0,
        cards: buttons.map(button => ({
          card: bounds(button),
          art: bounds(button.querySelector('.sketch-card-art')!),
          title: bounds(button.querySelector('.sketch-card-title')!),
          desc: bounds(button.querySelector('.sketch-card-desc')!),
        })),
      };
    });

    expect(measured.cards, width + ': all cards present').toHaveLength(7);
    expect(measured.pageWidth, width + ': no document horizontal overflow').toBeLessThanOrEqual(measured.viewportWidth + 1);
    expect(measured.scrollWidth, width + ': no Home horizontal overflow').toBeLessThanOrEqual(measured.clientWidth + 1);

    for (const [index, { card, art, title, desc }] of measured.cards.entries()) {
      expect(card.width, width + ': card ' + index + ' usable width').toBeGreaterThan(205);
      expect(card.height, width + ': card ' + index + ' usable height').toBeGreaterThanOrEqual(275);
      for (const [name, child] of [['art', art], ['title', title], ['description', desc]] as const) {
        expect(child.y, width + ': ' + name + ' top').toBeGreaterThanOrEqual(card.y - 1);
        expect(child.bottom, width + ': ' + name + ' bottom stays inside card').toBeLessThanOrEqual(card.bottom - 3);
        expect(child.x, width + ': ' + name + ' left').toBeGreaterThanOrEqual(card.x - 1);
        expect(child.right, width + ': ' + name + ' right').toBeLessThanOrEqual(card.right + 1);
      }
    }

    for (let i = 0; i < measured.cards.length; i++) {
      const a = measured.cards[i].card;
      for (let j = i + 1; j < measured.cards.length; j++) {
        const b = measured.cards[j].card;
        const xOverlap = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        expect(xOverlap <= 1 || yOverlap <= 1, width + ': card overlap between ' + i + ' and ' + j).toBe(true);
      }
    }

    const firstRow = measured.cards.filter(({card}) => Math.abs(card.y - measured.cards[0].card.y) < 2).length;
    expect(firstRow, width + ': responsive column count').toBe(width > 1380 ? 4 : width > 740 ? 2 : 1);

    const lastCard = page.getByRole('button', {name: 'Open Ad Downloader'});
    await lastCard.scrollIntoViewIfNeeded();
    await expect(lastCard).toBeVisible();
    if (measured.scrollHeight > measured.clientHeight + 8) {
      expect(await page.locator('.sketch-home').evaluate(el => el.scrollTop), width + ': vertical scrolling works').toBeGreaterThan(0);
    }

    if ([1536, 1366, 768, 390].includes(width)) {
      await page.screenshot({ animations: 'disabled',path: testInfo.outputPath('ink-home-responsive-' + width + '.png')});
    }
  }
});

test('filtered Home cards remain usable in narrow viewports', async ({page}) => {
  await page.goto('#/home');
  for (const width of [1024, 640, 390]) {
    await page.setViewportSize({width, height: 700});
    const input = page.getByRole('searchbox', {name: 'Find a Forge tool'});
    await input.fill('PDF');
    const card = page.getByRole('button', {name: 'Open PDF to Image'});
    await expect(page.locator('.sketch-home-grid .sketch-tool-card')).toHaveCount(1);
    await expect(card).toBeVisible();
    const data = await card.evaluate(el => ({
      cardWidth: el.getBoundingClientRect().width,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(data.cardWidth, width + ': filtered card width').toBeGreaterThan(240);
    expect(data.documentWidth, width + ': filtered page no horizontal overflow').toBeLessThanOrEqual(data.viewportWidth + 1);
    await input.fill('');
  }
  await page.getByRole('button', {name: 'Open PDF to Image'}).click();
  await expect(page).toHaveURL(/#\/pdf-to-image$/);
});
