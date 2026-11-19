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
    '<center><img src="https://s3media-ml-eu.surveycenter.com/logos/fall/Coca-Cola.png" class="zoomImage" alt="Coca Cola" style="max-width:100%" align ="center"></center><span style="display:none;">Coca Cola</span>',
    '<center><img src="https://s3media-ml-eu.surveycenter.com/logos/fall/Pepsi.png" class="zoomImage" alt="Pepsi" style="max-width:100%" align ="center"></center><span style="display:none;">Pepsi</span>',
    '<center><img src="https://s3media-ml-eu.surveycenter.com/logos/fall/Third.png" class="zoomImage" alt="Third" style="max-width:100%" align ="center"></center><span style="display:none;">Third</span>',
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


test('optional brand list follows uploaded filename order and sets alt plus hidden text', () => {
  const html = generateLogoLinks({
    brands: [''], filenames: ['Coca_Cola', 'Pepsi'], server: 's3', folder: 'logos', format: 'png',
  });
  assert.equal((html.match(/class="zoomImage"/g) || []).length, 2);
  assert.ok(html.includes('Coca_Cola.png" class="zoomImage" alt="Coca Cola"'));
  assert.ok(html.includes('<span style="display:none;">Pepsi</span>'));
  assert.ok(!html.includes('<script'));
});

test('independent alt rows remain aligned through brand matching and blank metadata', () => {
  const html = generateLogoLinks({
    brands: ['Pepsi', 'Coca Cola', 'Third'], altNames: ['Pepsi MAX', '', 'Third & "Special"'],
    filenames: ['Coca_Cola', 'Pepsi'], folder: 'campaign', server: 'aldi', format: 'jpeg',
  });
  const lines = html.split('\n');
  assert.match(lines[0], /Pepsi\.jpg" class="zoomImage" alt="Pepsi MAX"/);
  assert.match(lines[1], /Coca_Cola\.jpg" class="zoomImage" alt="Coca Cola"/);
  assert.match(lines[2], /Third\.jpg" class="zoomImage" alt="Third &amp; &quot;Special&quot;"/);
  assert.ok(lines[2].includes('<span style="display:none;">Third &amp; &quot;Special&quot;</span>'));
});

test('blank middle brand row does not shift display names to another logo', () => {
  const html = generateLogoLinks({
    brands: ['Pepsi', '', 'Coca Cola'], altNames: ['First', 'Middle', 'Last'],
    filenames: ['Pepsi', 'Sprite', 'Coca_Cola'], folder: '', server: 's3', format: 'png',
  });
  const rows = html.split('\n');
  assert.equal(rows.length, 3);
  assert.match(rows[0], /Pepsi\.png" class="zoomImage" alt="First"/);
  assert.match(rows[1], /Sprite\.png" class="zoomImage" alt="Middle"/);
  assert.match(rows[2], /Coca_Cola\.png" class="zoomImage" alt="Last"/);
});

test('zoom scripts are opt-in after every individual image link', () => {
  const opts = {
    brands: ['A', 'B'], filenames: ['A', 'B'], folder: '', server: 's3', format: 'png',
  };
  const off = generateLogoLinks(opts);
  const on = generateLogoLinks({ ...opts, includeEnlargement: true });
  assert.ok(!off.includes('<script'));
  assert.equal((on.match(/class="zoomImage"/g) || []).length, 2);
  assert.equal((on.match(/<script/g) || []).length, 4);
  const rows = on.split('\n');
  // Each link is immediately followed by its own external + initialization script.
  assert.equal(rows.length, 6);
  for (let offset = 0; offset < rows.length; offset += 3) {
    assert.match(rows[offset], /class="zoomImage"/);
    assert.match(rows[offset + 1], /^<script src="\/\/dcqhpema7gk9a.cloudfront.net\/IND\/HTML5\/ISDDefault.js"><\/script>$/);
    assert.match(rows[offset + 2], /^<script> \$\(document\).on\("ready"/);
  }
  assert.ok(on.includes('//dcqhpema7gk9a.cloudfront.net/IND/HTML5/ISDDefault.js'));
  assert.ok(on.includes('$(this).tolunaZoom({url : $(this).prop("src"), icon: false});'));
});

test('both lists blank with no uploaded logos is rejected', () => {
  assert.throws(() => generateLogoLinks({
    brands: [''], altNames: ['Display Only'], filenames: [], server: 's3', folder: '', format: 'png',
  }), /Upload logos or enter at least one brand name/);
});

test('four logos emit eight script tags, with one full script pair after every link', () => {
  const html = generateLogoLinks({
    brands: ['1', '2', '3', '4'],
    altNames: ['11', '22', '33', '44'],
    filenames: ['1', '2', '3', '4'],
    folder: 'cvbcxvb', server: 's3', format: 'png', includeEnlargement: true,
  });
  const rows = html.split('\n');
  assert.equal(rows.length, 12);
  assert.equal((html.match(/class="zoomImage"/g) || []).length, 4);
  assert.equal((html.match(/<script/g) || []).length, 8);
  for (let i = 0; i < 4; i++) {
    const index = i * 3;
    assert.ok(rows[index].includes('/cvbcxvb/' + (i + 1) + '.png" class="zoomImage" alt="' + ((i + 1) * 11) + '"'));
    assert.ok(rows[index].includes('<span style="display:none;">' + ((i + 1) * 11) + '</span>'));
    assert.equal(rows[index + 1], '<script src="//dcqhpema7gk9a.cloudfront.net/IND/HTML5/ISDDefault.js"></script>');
    assert.ok(rows[index + 2].startsWith('<script> $(document).on("ready"'));
    assert.ok(rows[index + 2].includes('$(this).tolunaZoom({url : $(this).prop("src"), icon: false});'));
  }
});
