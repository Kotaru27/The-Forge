import { test, expect } from '@playwright/test';

const workrooms = [
  { id: 'pdf-to-image', selector: '.pdf-workspace', controls: '.pdf-setup', result: '.pdf-results', action: 'Add PDF Files' },
  { id: 'image-splitter', selector: '.split-workspace', controls: '.split-settings', result: '.split-results', action: 'Add Images' },
  { id: 'video-stills', selector: '.video-stills', controls: '.vs-workbench-side', result: '.vs-content', action: 'Add Videos' },
  { id: 'storyboard', selector: '.storyboard-tool', controls: '.sb-topline', result: '.sb-stage', action: 'Add Assets' },
  { id: 'link-generator', selector: '.link-generator', controls: '.link-panel:first-child', result: '.link-outputs', action: 'Generate' },
  { id: 'ad-downloader', selector: '.adw-workspace', controls: '.adw-header', result: '.adw-status', action: 'Choose Auto-name folder' },
] as const;

test('six redesigned Studio workspaces retain real controls across laptop and desktop sizes', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const layouts = [[1366, 768], [1440, 900], [1920, 1080]] as const;
  for (const [width, height] of layouts) {
    await page.setViewportSize({ width, height });
    for (const tool of workrooms) {
      await page.goto('#/' + tool.id);
      const workroom = page.locator(tool.selector);
      await expect(workroom).toBeVisible();
      await expect(workroom.locator(tool.controls)).toBeVisible();
      await expect(workroom.locator(tool.result)).toBeVisible();
      await expect(workroom.getByRole('button', { name: tool.action, exact: tool.id !== 'ad-downloader' })).toBeVisible();
      await expect(page.locator('.sidebar')).toHaveCount(0);
      const layout = await page.evaluate(() => {
        const active = document.querySelector('.native-tool:not([hidden])');
        const rect = active?.getBoundingClientRect();
        return {
          documentOverflow: document.documentElement.scrollWidth - innerWidth,
          activeWidth: rect?.width ?? 0,
          activeHeight: rect?.height ?? 0,
          activeBottom: rect?.bottom ?? 0,
        };
      });
      expect(layout.documentOverflow).toBeLessThanOrEqual(1);
      expect(layout.activeWidth).toBeGreaterThan(600);
      expect(layout.activeHeight).toBeGreaterThan(330);
      expect(layout.activeBottom).toBeLessThanOrEqual(height + 1);
      await page.screenshot({ path: testInfo.outputPath(tool.id + '-' + width + '.png') });
    }
  }
  expect(errors).toEqual([]);
});

test('studio ribbons preserve PDF and Splitter controls without creating new navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('#/pdf-to-image');
  const pdfDirection = await page.locator('.pdf-workspace').evaluate(el => getComputedStyle(el).flexDirection);
  expect(pdfDirection).toBe('column');
  await expect(page.getByRole('button', { name: 'Add PDF Files' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Download all converted PDF pages as a ZIP archive' })).toBeDisabled();
  await page.goto('#/image-splitter');
  await page.getByLabel('Number of columns').fill('3');
  await expect(page.getByLabel('Number of columns')).toHaveValue('3');
  await expect(page.getByRole('button', { name: 'Split Images' })).toBeDisabled();
  await page.goto('#/video-stills');
  await expect(page.getByRole('button', { name: 'Send to Board' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download All' })).toBeDisabled();
});

test('Storyboard, Link Generator and Ad Downloader keep their original interaction contracts', async ({ page }) => {
  await page.goto('#/storyboard');
  await page.getByRole('tab', { name: 'Fit to Platform' }).click();
  await expect(page.getByRole('tab', { name: 'Fit to Platform' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Grid Board' }).click();
  await expect(page.getByLabel('Board Name')).toBeVisible();
  await page.goto('#/link-generator');
  await page.getByLabel('Folder / Path').fill('Campaign/Launch');
  await page.getByLabel('Filenames').fill('one.jpg\ntwo.png');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#link-exposure')).toHaveValue(/one\.jpg/);
  await page.goto('#/ad-downloader');
  await expect(page.getByLabel('Upload Excel workbook')).toBeDisabled();
  await expect(page.getByRole('group', { name: 'Filter assets' })).toHaveCount(0);
});
