import { test, expect } from '@playwright/test';

test('The Forge browser tab displays its dedicated sketched F/anvil icon on every route', async ({ page }) => {
  for (const route of ['home', 'logo-resizer', 'storyboard']) {
    await page.goto('#/' + route);
    await expect(page).toHaveTitle('The Forge');
    const favicon = page.locator('head link[rel="icon"]');
    await expect(favicon).toHaveAttribute('type', 'image/png');
    await expect(favicon).toHaveAttribute('sizes', '64x64');
    const source = await favicon.getAttribute('href');
    expect(source).toBeTruthy();
    expect(source).toMatch(/forge-favicon\.png$/);
    const loaded = await page.evaluate(async href => {
      const response = await fetch(href!);
      if (!response.ok) return { ok: false, width: 0, height: 0 };
      const bitmap = await createImageBitmap(await response.blob());
      const result = { ok: true, width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return result;
    }, source);
    expect(loaded).toEqual({ ok: true, width: 64, height: 64 });
  }
});
