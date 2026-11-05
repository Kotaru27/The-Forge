import test from 'node:test';
import assert from 'node:assert/strict';
import { tools, isToolId, defaultTool } from '../src/tools.ts';

test('the web release has seven React routes and no legacy compressor route', () => {
  const ids = ['logo-resizer', 'pdf-to-image', 'image-splitter', 'video-stills', 'storyboard', 'link-generator', 'ad-downloader'];
  assert.deepEqual(tools.map(item => item.id), ids);
  assert.equal(defaultTool, 'logo-resizer');
  assert.ok(ids.every(id => isToolId(id)));
  assert.equal(isToolId('video-compressor'), false);
  assert.equal(isToolId('unknown-tool'), false);
  assert.equal(isToolId(''), false);
});
