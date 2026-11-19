import { test, expect } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';

test('AMOLED Home retains all seven tools in a denser 4+3 desktop grid', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openForgeRoute(page, 'home');
  const cards = page.locator('.sketch-tool-card');
  await expect(cards).toHaveCount(7);
  const positions = await cards.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const fontSize = Number.parseFloat(getComputedStyle(node.querySelector('.sketch-card-desc')!).fontSize);
    return { x: rect.x, y: rect.y, height: rect.height, fontSize };
  }));
  expect(new Set(positions.slice(0, 4).map(card => Math.round(card.y))).size).toBe(1);
  expect(new Set(positions.slice(4).map(card => Math.round(card.y))).size).toBe(1);
  expect(positions[4].y).toBeGreaterThan(positions[0].y);
  for (const item of positions) {
    expect(item.height).toBeGreaterThanOrEqual(210);
    expect(item.height).toBeLessThanOrEqual(250);
    expect(item.fontSize).toBeGreaterThanOrEqual(13);
  }
  await page.getByRole('button', { name: 'Open Logo Resizer' }).click();
  await expect(page.getByRole('region', { name: 'Logo Resizer' })).toBeVisible();
});

test('Logo Resizer desktop header labels and controls do not clip or overlap', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openForgeRoute(page, 'logo-resizer');
  const head = page.locator('.forge-v5-head');
  const groups = page.locator('.forge-v5-control-grid > .forge-v5-group');
  await expect(groups).toHaveCount(8);
  const positions = await groups.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const label = node.querySelector('.forge-v5-group-title');
    return {
      x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom,
      width: rect.width, titleFont: label ? parseFloat(getComputedStyle(label).fontSize) : 0,
    };
  }));
  expect(positions[5].y).toBeGreaterThan(positions[0].y + 40);
  expect(Math.abs(positions[5].y - positions[7].y)).toBeLessThan(4);
  for (const item of positions) {
    expect(item.width).toBeGreaterThanOrEqual(90);
    expect(item.titleFont).toBeGreaterThanOrEqual(11);
    expect(item.right).toBeLessThanOrEqual(1440);
  }
  const xOverflow = await head.evaluate(node => node.scrollWidth - node.clientWidth);
  expect(xOverflow).toBeLessThanOrEqual(2);
  const optionLabels = page.locator('.forge-v5-checkboxes label');
  await expect(optionLabels).toHaveCount(2);
  const fontSize = await optionLabels.first().evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(12);
  await page.getByRole('button', { name: 'Generate links' }).click();
  await expect(page.getByRole('dialog', { name: 'Generate logo links' })).toBeVisible();
});

test('Logo Resizer adapts without horizontal control clipping on compact desktop', async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 780 });
  await openForgeRoute(page, 'logo-resizer');
  const head = page.locator('.forge-v5-head');
  const overflow = await head.evaluate(node => node.scrollWidth - node.clientWidth);
  expect(overflow).toBeLessThanOrEqual(3);
  await expect(page.locator('.forge-v5-control-grid > .forge-v5-group')).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Add assets' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate links' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export batch ZIP/ })).toBeVisible();
});
