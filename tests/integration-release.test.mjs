import test from 'node:test';
import assert from 'node:assert/strict';
import { tools, releaseTools, isToolId, isReleaseTool, usesLegacyWorkspace, defaultTool } from '../src/tools.ts';

test('all seven GitHub Pages workspaces are native React; compressor is deferred', () => {
  const expected = ['logo-resizer', 'pdf-to-image', 'image-splitter', 'video-stills', 'storyboard', 'link-generator', 'ad-downloader'];
  assert.deepEqual(releaseTools.map(tool => tool.id), expected);
  assert.equal(tools.length, 8, 'keep the pinned CTK bridge definition until retirement');
  assert.equal(releaseTools.length, 7);
  assert.equal(defaultTool, 'logo-resizer');
  for (const id of expected) {
    assert.equal(isToolId(id), true);
    assert.equal(isReleaseTool(id), true);
    assert.equal(usesLegacyWorkspace(id), false);
  }
  assert.equal(isToolId('video-compressor'), true, 'compatibility adapter stays intact');
  assert.equal(isReleaseTool('video-compressor'), false);
  assert.equal(usesLegacyWorkspace('video-compressor'), true);
  assert.equal(isReleaseTool('unknown-tool'), false);
  assert.equal(isReleaseTool(''), false);
});
