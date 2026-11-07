import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LOGO_SETTINGS, LOGO_PRESETS, uniqueExportNames, outputExtension,
  sanitizeLogoFilename, validateLogoDimensions, effectiveFontSize,
} from '../src/tools/logo-resizer/types.ts';
import { generateLogoLinks, matchLogoNames, normalizeBrand, levenshteinDistance } from '../src/tools/logo-resizer/links.ts';

test('only the approved four sizes are available, default 200x200 and white export background is unchanged', () => {
  assert.deepEqual(LOGO_PRESETS.map(({ width, height }) => `${width}x${height}`), [
    '150x150', '200x200', '200x150', '250x250',
  ]);
  assert.equal(DEFAULT_LOGO_SETTINGS.width, 200);
  assert.equal(DEFAULT_LOGO_SETTINGS.height, 200);
  assert.ok(!Object.hasOwn(DEFAULT_LOGO_SETTINGS, 'background'));
});
test('custom dimensions and exports reject invalid/oversized sizes', () => {
  assert.ok(validateLogoDimensions(150, 200));
  for (const value of [0, -1, 3.5, NaN, Infinity, 16384]) assert.equal(validateLogoDimensions(value, 200), false);
  assert.equal(outputExtension('png'), 'png');
  assert.equal(outputExtension('jpeg'), 'jpg');
});
test('filename rules match CTK and duplicate ZIP entries never overwrite each other', () => {
  assert.equal(sanitizeLogoFilename('Big logo: red.png'), 'Big_logo_red.png');
  assert.deepEqual(uniqueExportNames([{ filename: 'A' }, { filename: 'a' }, { filename: 'A_2' }], 'png'), ['A.png', 'a_2.png', 'A_2_2.png']);
});
test('global and per-logo font size fallback', () => {
  assert.equal(effectiveFontSize(DEFAULT_LOGO_SETTINGS, null), 28);
  assert.equal(effectiveFontSize({ ...DEFAULT_LOGO_SETTINGS, fontSize: '250' }, null), 200);
  assert.equal(effectiveFontSize(DEFAULT_LOGO_SETTINGS, 36), 36);
});
test('brand matching keeps the legacy nearest-filename ordering and one-to-one assignment', () => {
  assert.equal(normalizeBrand('Café-Cola'), 'cafecola');
  assert.equal(levenshteinDistance('pepsi', 'pespi'), 2);
  assert.deepEqual(matchLogoNames(['Coca Cola', 'Pepsi'], ['Pepsi', 'Coca-Cola']), [1, 0]);
  assert.deepEqual(matchLogoNames(['A', 'B', 'C'], ['A', 'B']), [0, 1, null]);
});
test('logo link output retains the existing HTML template and handles unmatched brands', () => {
  const html = generateLogoLinks({
    brands: ['Coca Cola', 'Pepsi', 'Third'],
    filenames: ['Pepsi', 'Coca-Cola'],
    server: 's3', folder: '/logos/fall/', format: 'png',
  });
  assert.equal(html, [
    '<center><img src="https://s3media-ml-eu.surveycenter.com/logos/fall/Coca-Cola.png" style="max-width:100%" align ="center"></center><span style="display:none;">Coca Cola</span>',
    '<center><img src="https://s3media-ml-eu.surveycenter.com/logos/fall/Pepsi.png" style="max-width:100%" align ="center"></center><span style="display:none;">Pepsi</span>',
    '<center><img src="https://s3media-ml-eu.surveycenter.com/logos/fall/Third.png" style="max-width:100%" align ="center"></center><span style="display:none;">Third</span>',
  ].join('\n'));
});
test('logo links are safe against HTML injection, and match names actually used in ZIP', () => {
  const html = generateLogoLinks({
    brands: ['Coca" onload="alert(1)', 'A'],
    filenames: ['a','A'], server:'aldi',folder:'logo',format:'jpeg',
  });
  assert.ok(!html.includes('onload="alert(1)"'));
  assert.ok(html.includes('s3media') === false);
  assert.ok(html.includes('A_2.jpg'));
});
