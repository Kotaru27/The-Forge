import { expect, type Page } from '@playwright/test';

/**
 * Feature tests must enter workrooms through same-document navigation.
 * Fresh document loads intentionally launch Home and its pencil intro,
 * even when the incoming URL was a tool bookmark.
 *
 * This helper uses the real hashchange route listener, not a test-only
 * application bypass. Intro/reload behavior is tested separately.
 */
export async function openForgeRoute(page: Page, route: string): Promise<void> {
  if (!(await page.locator('.forge-app').count())) {
    await page.goto('./');
    await expect(page.locator('.forge-app')).toBeVisible();
    await expect(page).toHaveURL(/#\/home$/);
  }
  if (new URL(page.url()).hash !== '#/' + route) {
    await page.evaluate(next => { window.location.hash = '#/' + next; }, route);
  }
  await expect(page).toHaveURL(new RegExp('#/' + route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  if (route === 'home') {
    const skip = page.getByRole('button', { name: /Skip intro/ });
    if (await skip.count()) await skip.click();
    await expect(page.locator('.forge-intro-portal')).toHaveCount(0);
  }
}
