import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('local ad folder imports in ascending order and feeds unchanged link outputs', async ({ page }) => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-ad-import-'));
  try {
    mkdirSync(join(directory, 'Sub'));
    for (const filename of ['Ad_10.mp4', 'Ad_2.jpg', 'Ad_1.png', 'notes.txt']) {
      writeFileSync(join(directory, filename), 'test fixture');
    }
    writeFileSync(join(directory, 'Sub', 'nested.jpg'), 'test fixture');

    await page.goto('#/link-generator');
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /Browse folder/ }).click(),
    ]);
    await chooser.setFiles(directory);

    const names = page.getByLabel('Filenames');
    await expect(names).toHaveValue('Ad_1.png\nAd_2.jpg\nAd_10.mp4');
    await expect(page.getByText('3 supported filenames imported', { exact: false })).toBeVisible();
    await expect(page.getByText('1 nested excluded', { exact: false })).toBeVisible();

    await page.getByLabel('Folder / Path').fill('Remote/Ads');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    const exposure = await page.locator('#link-exposure').inputValue();
    expect(exposure).toContain('Remote/Ads/Ad_1.png');
    expect(exposure.indexOf('Ad_2.jpg')).toBeLessThan(exposure.indexOf('Ad_10.mp4'));
    await expect(page.locator('#link-storyboard')).toContainText('Ad_10.jpg');

    await names.fill('Manual_9.mp3\nManual_1.jpg');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.locator('#link-exposure')).toContainText('Manual_9.mp3');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(names).toHaveValue('');
    await expect(page.locator('#link-exposure')).toHaveValue('');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
