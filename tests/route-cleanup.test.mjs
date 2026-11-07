import test from 'node:test';
import assert from 'node:assert/strict';
import { tools, isToolId, defaultTool } from '../src/tools.ts';

test('the GitHub Pages release contains exactly the seven native workspaces', () => {
  const native = ['link-generator', 'logo-resizer', 'image-splitter', 'pdf-to-image', 'video-stills', 'storyboard', 'ad-downloader'];
  assert.equal(tools.length, 7);
  assert.deepEqual(tools.map(tool => tool.id).sort(), native.sort());
  assert.equal(defaultTool, 'logo-resizer');
  for (const tool of tools) assert.ok(isToolId(tool.id));
  assert.equal(isToolId('video-compressor'), false);
  assert.equal(isToolId('not-a-tool'), false);
});
