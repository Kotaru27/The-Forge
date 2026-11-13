import test from 'node:test';
import assert from 'node:assert/strict';
import { sortAdNames, importFolderNames } from '../src/tools/link-generator/folder-import.ts';
import { generateLinks } from '../src/tools/link-generator/engine.ts';

test('natural ascending order keeps Ad_2 before Ad_10 without changing input', () => {
  const input = ['Ad_11.mp4', 'Ad_2.JPG', 'Ad_10.jpg', 'Ad_1.png'];
  assert.deepEqual(sortAdNames(input), ['Ad_1.png', 'Ad_2.JPG', 'Ad_10.jpg', 'Ad_11.mp4']);
  assert.equal(input[0], 'Ad_11.mp4');
});

test('folder import reads only supported top-level file names and reports skipped files', () => {
  const result = importFolderNames([
    { name: 'Ad_10.JPG', webkitRelativePath: 'Ads/Ad_10.JPG' },
    { name: 'Ad_2.mp4', webkitRelativePath: 'Ads/Ad_2.mp4' },
    { name: 'notes.txt', webkitRelativePath: 'Ads/notes.txt' },
    { name: 'Nested_1.jpg', webkitRelativePath: 'Ads/Sub/Nested_1.jpg' },
    { name: 'Ad_1.png', webkitRelativePath: 'Ads/Ad_1.png' },
    { name: 'Voice.mp3', webkitRelativePath: 'Ads/Voice.mp3' },
  ]);
  assert.deepEqual(result, { names: ['Ad_1.png', 'Ad_2.mp4', 'Ad_10.JPG', 'Voice.mp3'], folderName: 'Ads', skippedUnsupported: 1, skippedNested: 1 });
});

test('empty and unsupported folders do not invent filenames', () => {
  assert.deepEqual(importFolderNames([]).names, []);
  assert.deepEqual(importFolderNames([{ name:'notes.docx', webkitRelativePath:'Assets/notes.docx' }]).names, []);
});

test('imported sorted filenames work with unchanged Ad Exposure and Storyboard generation', () => {
  const { names } = importFolderNames([
    { name:'Ad_10.mp4', webkitRelativePath:'Ads/Ad_10.mp4' },
    { name:'Ad_2.jpg', webkitRelativePath:'Ads/Ad_2.jpg' },
  ]);
  const output = generateLinks({ server: 's3', folder: 'Remote/Ads', filenames: names.join('\n'), newMp4Mode: true });
  assert.ok(output.exposure.indexOf('Ad_2.jpg') < output.exposure.indexOf('Ad_10'));
  assert.match(output.storyboard, /Ad_10.jpg/);
  assert.match(output.exposure, /Remote\/Ads/);
  assert.deepEqual(output.skipped, []);
});
