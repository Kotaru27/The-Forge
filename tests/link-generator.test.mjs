import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLinks, normalizeFolder, encodeFolder } from '../src/tools/link-generator/engine.ts';

test('normalizes and encodes folder paths without traversal', () => {
  assert.equal(encodeFolder(normalizeFolder('  Brand Assets///Set 01  ')), 'Brand/Assets/Set/01/');
  assert.throws(() => encodeFolder('../assets/'), /invalid path segment/);
});
test('image outputs match the original HTML formats', () => {
  const result = generateLinks({ server:'aldi',folder:'Campaign 01',filenames:'hero.png\nBanner.JPG',newMp4Mode:false });
  assert.equal(result.exposure, '<img src="https://aldimediaeu.blob.core.windows.net/aldimediaeu/Campaign/01/hero.png" class="zoomImage" style="max-width:80%">\n<img src="https://aldimediaeu.blob.core.windows.net/aldimediaeu/Campaign/01/Banner.JPG" class="zoomImage" style="max-width:80%">');
  assert.equal(result.storyboard, '<img src="https://aldimediaeu.blob.core.windows.net/aldimediaeu/Campaign/01/hero.png" class="zoomImage" style="max-height:280px">\n<img src="https://aldimediaeu.blob.core.windows.net/aldimediaeu/Campaign/01/Banner.JPG" class="zoomImage" style="max-height:280px">');
});
test('new mode changes exposure mp4 link; storyboard uses jpg poster', () => {
  const result = generateLinks({ server:'s3',folder:'Ads',filenames:'Clip.mp4',newMp4Mode:true });
  assert.equal(result.exposure, '//s3media-ml-eu.surveycenter.com/Ads/Clip');
  assert.equal(result.storyboard, '<img src="https://s3media-ml-eu.surveycenter.com/Ads/Clip.jpg" class="zoomImage" style="max-height:280px">');
});
test('rejects unsupported/unsafe names while keeping valid mp3', () => {
  const result = generateLinks({ server:'s3',folder:'',filenames:'../unsafe.png\ntrack.mp3\nnotes.txt',newMp4Mode:false });
  assert.deepEqual(result.skipped, ['../unsafe.png','notes.txt']);
  assert.equal(result.exposure, 'https://s3media-ml-eu.surveycenter.com/track.mp3');
  assert.equal(result.storyboard, 'track.mp3');
});
