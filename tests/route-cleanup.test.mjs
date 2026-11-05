import test from 'node:test';
import assert from 'node:assert/strict';
import { tools, isToolId, usesLegacyWorkspace } from '../src/tools.ts';

test('every migrated tool uses React, and all remaining tools retain the compatibility workspace', () => {
  const native = ['link-generator', 'logo-resizer', 'image-splitter', 'pdf-to-image', 'video-stills', 'storyboard'];
  const legacy = ['ad-downloader', 'video-compressor'];
  assert.equal(tools.length, 8);
  assert.deepEqual(tools.filter(tool => !usesLegacyWorkspace(tool.id)).map(tool => tool.id).sort(), native.sort());
  assert.deepEqual(tools.filter(tool => usesLegacyWorkspace(tool.id)).map(tool => tool.id).sort(), legacy.sort());
  for (const tool of tools) assert.ok(isToolId(tool.id));
  assert.equal(isToolId('not-a-tool'), false);
});
