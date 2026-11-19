import { expect, test, type Page } from '@playwright/test';
import { openForgeRoute } from './helpers/forge-route';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { createPdf } from './helpers/pdf-fixture';

// Real, populated workrooms. Observations are recorded—not hardcoded into a
// fragile FPS pass threshold, since CI and laptops have different schedulers.
test.setTimeout(180_000);

async function png(page: Page, width = 1000, height = 600): Promise<Buffer> {
  const base64 = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#496787'; context.fillRect(0, 0, width, height);
    context.fillStyle = '#efdfbb';
    for (let i = 0; i < 70; i++) context.fillRect((i * 173) % width, (i * 97) % height, 80, 23);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { width, height });
  return Buffer.from(base64, 'base64');
}

async function wheelProfile(page: Page, selector: string) {
  const panel = page.locator(selector).first();
  await expect(panel).toBeVisible();
  // Hover the container edge, not a child textarea that could capture wheel input.
  await panel.hover({ position: { x: 10, y: 18 } });
  const start = await panel.evaluate(el => {
    el.scrollTop = 0;
    const startTop = el.scrollTop;
    const startTime = performance.now();
    const profile = {
      startTop, startTime, frames: [] as number[], tasks: [] as number[],
      stop: false, observer: null as PerformanceObserver | null,
    };
    if (typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      profile.observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) profile.tasks.push(entry.duration);
      });
      profile.observer.observe({ entryTypes: ['longtask'] });
    }
    (window as typeof window & { __forgeWheelProfile?: typeof profile }).__forgeWheelProfile = profile;
    const tick = (time: number) => {
      if (profile.stop) return;
      profile.frames.push(time);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { startTop, maxScroll: el.scrollHeight - el.clientHeight };
  });
  // Query geometry only on an invalid scroll surface; expensive inspection
  // must not contaminate the animation-frame timing of successful samples.
  if (start.maxScroll <= 100) {
    const chain = await panel.evaluate(el => {
      const output = [];
      for (let node: HTMLElement | null = el as HTMLElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        output.push({
          className: node.className,
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
          overflowY: style.overflowY,
          gridColumns: style.gridTemplateColumns.slice(0, 220),
          firstCardHeight: node.querySelector('.split-card')?.getBoundingClientRect().height,
        });
        if (node.classList.contains('native-tool')) break;
      }
      return output;
    });
    console.info('Missing populated scroll surface:', selector, JSON.stringify(chain));
  }
  expect(start.maxScroll, selector + ': populated target must actually scroll')
    .toBeGreaterThan(100);
  // Do not dispatch synthetic DOM wheel events: use real Playwright browser input.
  for (let i = 0; i < 16; i++) {
    await page.mouse.wheel(0, 340);
    await page.waitForTimeout(32);
  }
  const result = await panel.evaluate(el => {
    const profile = (window as typeof window & { __forgeWheelProfile?: {
      startTop: number; startTime: number; frames: number[]; tasks: number[];
      stop: boolean; observer: PerformanceObserver | null;
    } }).__forgeWheelProfile!;
    profile.stop = true;
    profile.observer?.disconnect();
    const endTime = performance.now();
    const frames = profile.frames.filter(t => t >= profile.startTime && t <= endTime);
    const gaps = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b);
    return {
      durationMs: Math.round(endTime - profile.startTime),
      scrollDelta: Math.round(el.scrollTop - profile.startTop),
      frameCount: frames.length,
      medianGapMs: gaps[Math.floor(gaps.length * .5)] ?? null,
      p95GapMs: gaps[Math.floor(gaps.length * .95)] ?? null,
      maxGapMs: gaps.at(-1) ?? null,
      framesOver33ms: gaps.filter(x => x > 33).length,
      longTaskCount: profile.tasks.length,
      longTaskTotalMs: Math.round(profile.tasks.reduce((sum, n) => sum + n, 0)),
    };
  });
  expect(result.frameCount).toBeGreaterThan(8);
  if (start.maxScroll > 10) expect(result.scrollDelta).toBeGreaterThan(0);
  return { ...result, contentScrollable: start.maxScroll > 10, maxScroll: start.maxScroll };
}

test('profile actual wheel scrolling across all seven populated tools', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 860 });
  const report: Record<string, unknown> = {};

  await openForgeRoute(page, 'logo-resizer');
  const image = await png(page);
  await page.locator('.logo-workspace input[type="file"]').setInputFiles(Array.from({ length: 30 }, (_, i) => ({
    name: 'Logo_' + i + '.png', mimeType: 'image/png', buffer: image,
  })));
  await expect(page.locator('.logo-card')).toHaveCount(30);
  report['logo-resizer'] = await wheelProfile(page, '.logo-gallery');

  await openForgeRoute(page, 'storyboard');
  const frame = await png(page, 900, 500);
  await page.getByLabel('Choose storyboard assets').setInputFiles(Array.from({ length: 10 }, (_, i) => ({
    name: 'Frame_' + i + '.png', mimeType: 'image/png', buffer: frame,
  })));
  await expect(page.locator('.sb-frame')).toHaveCount(10);
  report.storyboard = await wheelProfile(page, '.sb-asset-list');

  await openForgeRoute(page, 'image-splitter');
  await page.getByLabel('Upload images').setInputFiles(Array.from({ length: 24 }, (_, i) => ({
    name: 'Split_' + i + '.png', mimeType: 'image/png', buffer: frame,
  })));
  await expect(page.locator('.split-card')).toHaveCount(24);
  const firstSplitCardHeight = await page.locator('.split-card').first()
    .evaluate(el => Math.round(el.getBoundingClientRect().height));
  expect(firstSplitCardHeight, 'Image Splitter previews must not collapse inside the grid')
    .toBeGreaterThan(300);
  report['image-splitter'] = await wheelProfile(page, '.split-card-grid');

  await openForgeRoute(page, 'pdf-to-image');
  await page.getByLabel('Upload PDF files').setInputFiles(Array.from({ length: 18 }, (_, i) => ({
    name: 'Report_' + i + '.pdf', mimeType: 'application/pdf', buffer: createPdf(1, 'blue'),
  })));
  await expect(page.locator('.pdf-doc-card')).toHaveCount(18, { timeout: 60000 });
  report['pdf-to-image'] = await wheelProfile(page, '.pdf-list');

  // Video Stills owns a scrollable collection grid, not the outer workspace.
  // A shorter laptop viewport makes six populated collections scroll naturally.
  await page.setViewportSize({ width: 820, height: 560 });
  await openForgeRoute(page, 'video-stills');
  const video = await readFile(path.resolve('e2e/fixtures/stills.webm'));
  await page.getByLabel('Choose video files').setInputFiles(Array.from({ length: 6 }, (_, i) => ({
    name: 'Clip_' + i + '.webm', mimeType: 'video/webm', buffer: video,
  })));
  await expect(page.locator('.vs-stack')).toHaveCount(6, { timeout: 60000 });
  report['video-stills'] = await wheelProfile(page, '.vs-stacks');
  await page.setViewportSize({ width: 1440, height: 860 });

  await openForgeRoute(page, 'link-generator');
  await page.getByLabel('Filenames').fill(
    Array.from({ length: 100 }, (_, i) => 'Advertisement_' + i + '.jpg').join('\n')
  );
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  // The compact outer panel fits at this viewport. The 100-line filename editor
  // is the naturally scrollable surface; do not inflate the workroom to force overflow.
  report['link-generator'] = await wheelProfile(page, '#link-filenames');

  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: async () => ({
      kind: 'directory', name: 'Downloads', queryPermission: async () => 'granted',
      async *entries() {},
    }) });
  });
  await openForgeRoute(page, 'ad-downloader');
  // Hash-only SPA navigation does not rerun addInitScript. A real reload
  // installs the permitted folder fixture, then normal in-app navigation
  // enters Ad Downloader (refresh now intentionally starts at Home).
  await page.reload();
  await expect(page).toHaveURL(/#\/home$/);
  await page.evaluate(() => { window.location.hash = '#/ad-downloader'; });
  await expect(page.getByRole('heading', { name: 'Ad Downloader', level: 1 })).toBeVisible();
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Ad No', 'URL', 'Type'],
    ...Array.from({ length: 45 }, (_, i) => [i + 1, 'File_' + i + '.jpg', 'Print']),
  ]);
  for (let i = 0; i < 45; i++) sheet['B' + (i + 2)].l = { Target: 'https://example.com/file_' + i + '.jpg' };
  XLSX.utils.book_append_sheet(book, sheet, 'Campaign');
  await page.getByRole('button', { name: 'Choose Auto-name folder' }).click();
  await page.getByLabel('Upload Excel workbook').setInputFiles({
    name: 'ads.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })),
  });
  await expect(page.locator('.adw-table tbody tr[data-stage="ready"]')).toHaveCount(45);
  report['ad-downloader'] = await wheelProfile(page, '.adw-table-wrap');

  console.info('Real populated workroom wheel benchmark (CI hardware, no absolute FPS promises):',
    JSON.stringify(report, null, 2));
  await testInfo.attach('real-populated-wheel-profile.json', {
    body: Buffer.from(JSON.stringify(report, null, 2)), contentType: 'application/json',
  });
});
