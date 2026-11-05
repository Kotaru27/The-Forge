import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPdfFile, extensionFor, safePdfBaseName, selectedEntries,
  singlePageFilename, allEntries, PAGE_SCALE, JPEG_QUALITY, DEFAULT_FORMAT, assertPdfRasterSize,
} from '../src/tools/pdf-to-image/engine.ts';

const smallPage = (num, checked = true) => ({ num, checked, blob: new Blob([`page-${num}`]) });

test('original conversion settings are preserved', () => {
  assert.equal(PAGE_SCALE, 2);
  assert.equal(JPEG_QUALITY, 0.9);
  assert.equal(DEFAULT_FORMAT, 'image/png');
  assert.equal(extensionFor('image/jpeg'), 'jpg');
  assert.equal(extensionFor('image/png'), 'png');
});
test('valid PDFs are accepted without trusting missing MIME metadata', () => {
  assert.equal(isPdfFile({name:'report.pdf',type:''}), true);
  assert.equal(isPdfFile({name:'REPORT.PDF',type:'application/octet-stream'}), true);
  assert.equal(isPdfFile({name:'report',type:'application/pdf'}), true);
  assert.equal(isPdfFile({name:'report.png',type:'image/png'}), false);
});
test('safe output names strip traversal and keep original page naming', () => {
  assert.equal(safePdfBaseName('../a\\b.pdf'), '.._a_b');
  assert.equal(safePdfBaseName('invoice.pdf'), 'invoice');
  assert.equal(safePdfBaseName('...'), 'document');
  assert.equal(singlePageFilename({name:'invoice.pdf',format:'image/png'},2),'invoice_002.png');
  assert.equal(singlePageFilename({name:'scan.pdf',format:'image/jpeg'},10),'scan_010.jpg');
});
test('selected ZIP keeps original simple 1.png names and selected flags', () => {
  const doc = { name:'report.pdf',format:'image/png',pages:[smallPage(1), smallPage(2,false), smallPage(3)] };
  const entries=selectedEntries(doc);
  assert.deepEqual(entries.map(entry=>entry.path),['1.png','3.png']);
  assert.equal(entries[0].blob,doc.pages[0].blob);
});
test('Download All includes unchecked pages and uses unique numbered folders', () => {
  const one = { name:'same.pdf',format:'image/png',pages:[smallPage(1,false), smallPage(3)] };
  const two = { name:'same.pdf',format:'image/jpeg',pages:[smallPage(1)] };
  assert.deepEqual(allEntries([one,two]).map(entry=>entry.path),[
    '01_same/001.png','01_same/003.png','02_same/001.jpg',
  ]);
  assert.deepEqual(allEntries([one]).map(entry=>entry.path),['001.png','003.png']);
});
test('Documents with zero converted pages are skipped in Download All', () => {
  const pending = {name:'pending.pdf',format:'image/png',pages:[]};
  const ready = {name:'ready.pdf',format:'image/png',pages:[smallPage(1)]};
  assert.deepEqual(allEntries([pending, ready]).map(entry=>entry.path),['001.png']);
  assert.deepEqual(allEntries([pending]),[]);
});

test('PDF raster dimensions are checked before allocating a canvas', () => {
  assert.doesNotThrow(() => assertPdfRasterSize(240, 160));
  assert.doesNotThrow(() => assertPdfRasterSize(6400, 4096));
  assert.throws(() => assertPdfRasterSize(100000, 100000), /safe browser canvas/);
  assert.throws(() => assertPdfRasterSize(8000, 8000), /safe browser canvas/);
  for (const dimension of [0, -10, Infinity, NaN, 1.5]) {
    assert.throws(() => assertPdfRasterSize(dimension, 100), /safe browser canvas/);
  }
});
