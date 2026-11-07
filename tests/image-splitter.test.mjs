import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import {
  DEFAULT_COLUMNS, getCuts, getExportFiles, isImageFile, originalExtension,
  outputMime, pieceExtension, safeColumns,
} from '../src/tools/image-splitter/engine.ts';

test('default is 2, supported range is 1 through 50', () => {
  assert.equal(DEFAULT_COLUMNS, 2);
  assert.equal(safeColumns('20'), 20);
  assert.equal(safeColumns(100), 50);
  assert.equal(safeColumns(-5), 1);
  assert.equal(safeColumns(''), 1);
  assert.equal(safeColumns(NaN), 2);
  assert.equal(safeColumns(2.8), 2);
});

test('every pixel is preserved for unequal split widths', () => {
  assert.deepEqual(getCuts(7, 3), [
    { index: 0, startX: 0, width: 2 },
    { index: 1, startX: 2, width: 2 },
    { index: 2, startX: 4, width: 3 },
  ]);
  for (let width = 1; width < 100; width++) {
    for (let n = 1; n <= Math.min(width, 50); n++) {
      const cuts = getCuts(width, n);
      assert.equal(cuts[0].startX, 0);
      assert.equal(cuts.reduce((total, cut) => total + cut.width, 0), width);
      assert.equal(cuts.at(-1).startX + cuts.at(-1).width, width);
      assert.ok(cuts.every((cut, i) => cut.width > 0 && (i === 0 || cut.startX === cuts[i-1].startX + cuts[i-1].width)));
    }
  }
});

test('invalid column counts and image widths are rejected', () => {
  for (const n of [0, 51, 2.5, -1]) assert.throws(() => getCuts(9, n));
  assert.throws(() => getCuts(4, 5), /only 4px wide/);
  assert.throws(() => getCuts(0, 1));
  assert.throws(() => getCuts(4.5, 2));
});

test('raster formats remain raster; formats Canvas cannot encode use PNG', () => {
  const file = (name, type) => new File(['sample'], name, { type });
  assert.equal(outputMime(file('x.jpg','image/jpeg')), 'image/jpeg');
  assert.equal(outputMime(file('x.webp','image/webp')), 'image/webp');
  assert.equal(outputMime(file('x.png','image/png')), 'image/png');
  assert.equal(outputMime(file('x.svg','image/svg+xml')), 'image/png');
  assert.equal(pieceExtension(new Blob([], {type:'image/jpeg'}),file('x.jpeg','image/jpeg')),'jpeg');
  assert.equal(pieceExtension(new Blob([], {type:'image/png'}),file('x.svg','image/svg+xml')),'png');
  assert.equal(originalExtension(file('a.GIF','image/gif')),'gif');
  assert.equal(originalExtension(file('noext','image/png')),'png');
  assert.equal(isImageFile(file('image.svg','')) ,true);
  assert.equal(isImageFile(file('bad.txt','text/plain')),false);
});

test('ZIP planning preserves upload order and includes original unchecked files', () => {
  const a=new File(['one'],'first.png',{type:'image/png'});
  const b=new File(['two'],'second.jpg',{type:'image/jpeg'});
  const pieces=[{blob:new Blob(['slice1'],{type:'image/png'}),extension:'png'},{blob:new Blob(['slice2'],{type:'image/png'}),extension:'png'}];
  const outputs=getExportFiles([{file:a,checked:true,pieces},{file:b,checked:false,pieces}]);
  assert.deepEqual(outputs.map(f=>f.name),['1.png','2.png','3.jpg']);
  assert.strictEqual(outputs[2].blob,b);
  assert.equal(getExportFiles([{file:a,checked:true,pieces:[]}])[0].blob,a);
});
