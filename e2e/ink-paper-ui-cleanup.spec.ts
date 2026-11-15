import { test, expect } from '@playwright/test';

test('Link Generator hides the redundant review title without losing outputs', async ({ page }) => {
  await page.goto('#/link-generator');
  await expect(page.getByText('Review & generate', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Filename order' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Generated outputs' })).toBeVisible();

  await page.getByLabel('Folder / Path').fill('Campaign');
  await page.getByLabel('Filenames').fill('first.jpg\nsecond.mp4');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#link-exposure')).toHaveValue(/first\.jpg/);
  await expect(page.locator('#link-exposure')).toHaveValue(/second\.mp4/);
});

test('Storyboard places Board Name next to Add Assets and hides advanced UI only', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('#/storyboard');

  const toolbar = page.locator('.sb-toolbar');
  const addAssets = toolbar.getByRole('button', { name: 'Add Assets' });
  const boardName = toolbar.getByRole('textbox', { name: 'Board Name' });
  await expect(addAssets).toBeVisible();
  await expect(boardName).toBeVisible();
  const addBox = await addAssets.boundingBox();
  const nameBox = await boardName.boundingBox();
  expect(addBox && nameBox).toBeTruthy();
  if (addBox && nameBox) {
    expect(nameBox.x).toBeGreaterThanOrEqual(addBox.x + addBox.width);
    expect(Math.abs(nameBox.y - addBox.y)).toBeLessThan(22);
  }

  await expect(page.getByRole('button', { name: 'Add Folder' })).toHaveCount(0);
  await expect(page.locator('input[aria-label="Choose storyboard folder"]')).toHaveCount(1);
  await expect(page.getByText('More layout settings', { exact: true })).toBeHidden();
  await expect(page.locator('input[aria-label="Board gap"]')).toBeHidden();

  await boardName.fill('Campaign Board');
  await expect(boardName).toHaveValue('Campaign Board');
  await page.getByRole('button', { name: '+ New Board' }).click();
  await expect(boardName).toHaveValue('Board_2');
  await page.getByLabel('Choose a storyboard').selectOption({ label: 'Campaign Board' });
  await expect(boardName).toHaveValue('Campaign Board');
});

test('Fit to Platform hides typography controls while retaining upload and statement', async ({ page }) => {
  await page.goto('#/storyboard');
  await page.getByRole('tab', { name: 'Fit to Platform' }).click();
  await expect(page.getByText('Image and typography', { exact: true })).toBeHidden();
  await expect(page.locator('select[aria-label="Fit image mode"]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Upload Image' })).toBeVisible();
  await expect(page.getByLabel('Fit statement')).toBeVisible();
  await expect(page.locator('.sb-fit-stage canvas')).toBeVisible();
});

test('Ink & Paper secondary text is dark and legible in all seven workspaces', async ({ page }) => {
  const samples = [
    ['logo-resizer', '.forge-v5-group-title'],
    ['pdf-to-image', '.pdf-setup h2'],
    ['image-splitter', '.split-settings h2'],
    ['video-stills', '.vs-options'],
    ['storyboard', '.sb-section-head strong'],
    ['link-generator', '.link-panel .link-subheading h3'],
    ['ad-downloader', '.adw-header p'],
  ] as const;

  for (const [route, selector] of samples) {
    await page.goto('#/' + route);
    const target = page.locator(selector).first();
    await expect(target, route).toBeVisible();
    const actual = await target.evaluate(el => {
      const computed = getComputedStyle(el);
      const channels = computed.color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      const luminance = channels.length === 3
        ? channels.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
        : 1;
      return { color: computed.color, luminance, fontFamily: computed.fontFamily };
    });
    expect(actual.luminance, route + ': text is too light for paper surface (' + actual.color + ')').toBeLessThan(0.25);
    expect(actual.fontFamily, route).toContain('Kalam');
  }

  await page.goto('#/ad-downloader');
  await expect(page.locator('.adw-empty span').first()).toHaveCSS('color', 'rgb(47, 69, 98)');
});

test('graphite lines and lettering draw in place, with reduced-motion fallback', async ({page}) => {
  await page.goto('#/home');
  const pencilPath = page.locator('.sketch-card-border-svg [data-pencil-trace]').first();
  const title = page.locator('.sketch-hero-center h1');
  await expect(pencilPath).toHaveAttribute('pathLength','100');
  await expect(pencilPath).toHaveCSS('animation-name','sketch-pencil-trace');
  await expect(title).toHaveCSS('animation-name','sketch-pencil-lettering');
  await expect(page.locator('.sketch-tool-card').first()).toHaveCSS('transform','none');

  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(pencilPath).toHaveCSS('animation-name','none');
  await expect(title).toHaveCSS('animation-name','none');

  await page.goto('#/storyboard');
  await expect(page.getByRole('button', {name:'Add Assets'})).toBeVisible();
});
