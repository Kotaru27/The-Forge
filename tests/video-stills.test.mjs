import test from 'node:test';
import assert from 'node:assert/strict';
import { frameTimes, collectionName, isVideoFile, selectedCount,
  exportSelected, exportAll, selectedZipName, getSelectedGroups } from '../src/tools/video-stills/engine.ts';

const still = (num, checked = true) => ({ num, type: 'still', blob: new Blob(['jpeg'], { type: 'image/jpeg' }), url: 'blob:fake', checked });
const sheet = (checked = true) => ({ num: 'storyboard', type: 'storyboard', blob: new Blob(['jpeg'], { type: 'image/jpeg' }), url: 'blob:fake', checked });
const collection = (name, id, frames) => ({ name, id, sourceName: name + '.webm', status: 'ready', completed: frames.length, total: frames.length, frames });

test('matches CTK one-still-per-completed-second sampling schedule', () => {
  assert.deepEqual(frameTimes(3.5), [0.875, 1.75, 2.625]);
  assert.deepEqual(frameTimes(1), [0.5]);
  assert.equal(frameTimes(4).length, 4);
  assert.throws(() => frameTimes(0.6), /too short/);
  assert.throws(() => frameTimes(Number.NaN), /duration/);
});
test('recognizes videos including common filenames when the browser omits MIME', () => {
  assert.equal(isVideoFile(new File(['x'], 'clip.webm', { type: '' })), true);
  assert.equal(isVideoFile(new File(['x'], 'clip.mp4', { type: 'video/mp4' })), true);
  assert.equal(isVideoFile(new File(['x'], 'notes.txt', { type: 'text/plain' })), false);
});
test('keeps original collection and selected ZIP naming', () => {
  assert.equal(collectionName('An Ad 01.webm'), 'An_Ad_01');
  assert.equal(selectedZipName(collection('An_Ad_01', 'a', [])), 'An_Ad_01_stills.zip');
  assert.equal(collectionName('../bad name.mp4').includes('/'), false);
});
test('selected ZIP keeps ordinal JPEG names, with optional storyboard.jpg', () => {
  const files = exportSelected(collection('A', 'a', [still(1), still(2, false), still(3), sheet()]));
  assert.deepEqual(files.map(item => item.path), ['1.jpg', '2.jpg', 'storyboard.jpg']);
});
test('all ZIP separates video names into folders and protects duplicate folder names', () => {
  const first = collection('Same_Name', 'a', [still(1)]);
  const second = collection('Same_Name', 'b', [still(1), sheet(false)]);
  assert.deepEqual(exportAll([first, second]).map(file => file.path), ['Same_Name/1.jpg', 'Same_Name_2/1.jpg']);
});
test('board hand-off keeps only checked stills and never contact sheets', () => {
  const a = collection('A', 'a', [still(1), still(2, false), sheet()]);
  const b = collection('B', 'b', [still(1)]);
  assert.equal(selectedCount([a,b]), 2);
  assert.deepEqual(getSelectedGroups([a,b]).map(x => [x.id, x.frames.length, x.frames[0].num]), [['a',1,1],['b',1,1]]);
  assert.deepEqual(getSelectedGroups([a,b], 'a').map(x => x.id), ['a']);
});
