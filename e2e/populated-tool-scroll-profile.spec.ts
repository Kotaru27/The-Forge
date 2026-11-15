import { expect, test, type Page } from '@playwright/test';
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
  await panel.hover();
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

  await page.goto('#/logo-resizer');
  const image = await png(page);
  await page.locator('.logo-workspace input[type="file"]').setInputFiles(Array.from({ length: 30 }, (_, i) => ({
    name: 'Logo_' + i + '.png', mimeType: 'image/png', buffer: image,
  })));
  await expect(page.locator('.logo-card')).toHaveCount(30);
  report['logo-resizer'] = await wheelProfile(page, '.logo-gallery');

  await page.goto('#/storyboard');
  const frame = await png(page, 900, 500);
  await page.getByLabel('Choose storyboard assets').setInputFiles(Array.from({ length: 10 }, (_, i) => ({
    name: 'Frame_' + i + '.png', mimeType: 'image/png', buffer: frame,
  })));
  await expect(page.locator('.sb-frame')).toHaveCount(10);
  report.storyboard = await wheelProfile(page, '.sb-controls');

  await page.goto('#/image-splitter');
  await page.getByLabel('Upload images').setInputFiles(Array.from({ length: 14 }, (_, i) => ({
    name: 'Split_' + i + '.png', mimeType: 'image/png', buffer: frame,
  })));
  await expect(page.locator('.split-card')).toHaveCount(14);
  report['image-splitter'] = await wheelProfile(page, '.split-card-grid');

  await page.goto('#/pdf-to-image');
  await page.getByLabel('Upload PDF files').setInputFiles(Array.from({ length: 5 }, (_, i) => ({
    name: 'Report_' + i + '.pdf', mimeType: 'application/pdf', buffer: createPdf(2, 'blue'),
  })));
  await expect(page.locator('.pdf-doc-card')).toHaveCount(5, { timeout: 30000 });
  report['pdf-to-image'] = await wheelProfile(page, '.pdf-list');

  await page.goto('#/video-stills');
  const video = await readFile(path.resolve('e2e/fixtures/stills.webm'));
  await page.getByLabel('Choose video files').setInputFiles(Array.from({ length: 3 }, (_, i) => ({
    name: 'Clip_' + i + '.webm', mimeType: 'video/webm', buffer: video,
  })));
  await expect(page.getByRole('button', { name: /Inspect stills from/ })).toHaveCount(3, { timeout: 60000 });
  report['video-stills'] = await wheelProfile(page, '.vs-stacks');

  await page.goto('#/link-generator');
  await page.getByLabel('Filenames').fill(
    Array.from({ length: 100 }, (_, i) => 'Advertisement_' + i + '.jpg').join('\n')
  );
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  report['link-generator'] = await wheelProfile(page, '.link-generator');

  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: async () => ({
      kind: 'directory', name: 'Downloads', queryPermission: async () => 'granted',
      async *entries() {},
    }) });
  });
  await page.goto('#/ad-downloader');
  // Hash-only SPA navigation does not rerun addInitScript. A real reload
  // ensures the permitted folder fixture is installed before the tool mounts.
  await page.reload();
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
  report['ad-downloader'] = await wheelProfile(page, '.adw-workspace');

  console.info('Real populated workroom wheel benchmark (CI hardware, no absolute FPS promises):',
    JSON.stringify(report, null, 2));
  await testInfo.attach('real-populated-wheel-profile.json', {
    body: Buffer.from(JSON.stringify(report, null, 2)), contentType: 'application/json',
  });
});
