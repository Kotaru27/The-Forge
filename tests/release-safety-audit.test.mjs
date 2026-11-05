import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import JSZip from 'jszip';
import { parseWorkbook, assertWorksheetBounds, copyForstaScript, copyBucketTable } from '../src/tools/ad-downloader/engine.ts';
import { fetchZip } from '../src/tools/ad-downloader/assets.ts';

// Copying generated Forsta scripts should never turn spreadsheet cells into code.
function runForsta(script) {
  const seen = [], scripts = [];
  let attacks = 0;
  const context = {
    hacked: () => { attacks++; },
    f: () => ({ any: value => { seen.push(value); return true; } }),
    set: (...values) => ({ union(other) { scripts.push(values, other); return this; } }),
  };
  vm.runInNewContext(script, context, { timeout: 500 });
  return { attacks, seen };
}
test('Forsta script treats malicious bucket names strictly as data', () => {
  const bucket = "West')) { hacked(); } if (f('cq42000').any('West";
  const result = runForsta(copyForstaScript([{ bucket, ads: ['100'] }]));
  assert.equal(result.attacks, 0, 'Spreadsheet bucket must not execute injected JavaScript');
  assert.deepEqual(result.seen, [bucket], 'Special characters must survive as a literal bucket value');
});
test('Forsta script treats malicious AD numbers strictly as data', () => {
  const number = "42')); hacked(); //";
  const result = runForsta(copyForstaScript([{ bucket: 'Valid', ads: [number] }]));
  assert.equal(result.attacks, 0, 'Spreadsheet ad number must not execute injected JavaScript');
});
test('Forsta script preserves the original output for ordinary workbooks', () => {
  assert.equal(copyForstaScript([{ bucket: 'West', ads: ['101', '102'] }]),
    "var s = set()\n\n// Bucket West\nif (f('cq42000').any('West')) {\n    s = s.union(set('101','102'))\n}\n\n");
});
test('huge Excel input fails early with a clear upload-size error', () => {
  // Do not give a compressed archive parser a 21 MB attacker-controlled input.
  const bytes = new Uint8Array(21 * 1024 * 1024);
  assert.throws(() => parseWorkbook(bytes), /workbook.*20 MB|20 MB.*workbook/i);
});
test('ZIP aggregate budget is enforced across multiple separate downloads', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async url => {
    requested.push(String(url));
    return new Response(new Uint8Array([255, 216, 255, 0]), {
      status: 200, headers: { 'content-type': 'image/jpeg' },
    });
  };
  const make = number => ({
    id: 'ad-' + number, no: String(number), url: 'https://assets.example/' + number + '.jpg',
    type: 'Print', displayName: 'AD' + number + '_Logo', ext: '.jpg',
    confidence: 'high', selected: true, downloaded: false, requested: false,
    downloadVerified: false, inProgress: false,
  });
  try {
    const updates = [];
    const result = await fetchZip([make(1), make(2)], (done, success, failed) => {
      updates.push({ done, success, failed });
    }, 6);
    assert.equal(result.successes.length, 1, 'A 6-byte ZIP budget cannot hold two 4-byte images');
    assert.equal(result.failures.length, 1);
    const files = await JSZip.loadAsync(result.blob);
    assert.deepEqual(Object.keys(files.files).filter(name => !files.files[name].dir), ['AD1_Logo.jpg']);
    assert.equal(updates.at(-1).done, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('spreadsheet bucket copy cannot introduce extra TSV rows or active Excel formulas', () => {
  const text = copyBucketTable([{ bucket: '=HYPERLINK("https://example.com")\n=1+1', ads: ['200\n=2+2'] }]);
  const lines = text.trimEnd().split('\n');
  assert.equal(lines.length, 2, 'One bucket must produce exactly one row');
  assert.match(lines[1], /^'=/, 'Formula-looking buckets must be literal text');
  assert.ok(!lines[1].includes('\n'));
  assert.ok(!lines[1].includes('\t=2+2'));
});
test('untrusted worksheet range metadata is rejected before allocating rows', () => {
  assert.throws(() => assertWorksheetBounds({ s: { r: 0, c: 0 }, e: { r: 1048575, c: 16383 } }), /safety limit/);
  assert.throws(() => assertWorksheetBounds({ s: { r: 0, c: 0 }, e: { r: 20000, c: 1 } }), /safety limit/);
  assert.throws(() => assertWorksheetBounds({ s: { r: 0, c: 0 }, e: { r: 10, c: 128 } }), /safety limit/);
  assert.doesNotThrow(() => assertWorksheetBounds({ s: { r: 0, c: 0 }, e: { r: 500, c: 5 } }));
});
test('bucket output remains unchanged for ordinary workbook text', () => {
  assert.equal(copyBucketTable([{ bucket: 'West', ads: ['101', '102'] }]),
    "Bucket\tAds\nWest\t'101','102'\n");
});
