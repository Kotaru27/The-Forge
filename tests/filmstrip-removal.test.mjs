import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Prevent a later migration from accidentally reintroducing the retired tool.
const nativeFiles = [
  'src/App.tsx',
  'src/tools/storyboard/Storyboard.tsx',
  'src/tools/storyboard/engine.ts',
  'src/tools/storyboard/renderer.ts',
  'src/tools/video-stills/VideoStills.tsx',
  'src/tools/video-stills/engine.ts',
];
test('no Filmstrip implementation, import or transfer entry remains in shipped source', () => {
  for (const path of nativeFiles) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /filmstrip/i, 'Retired Filmstrip code in ' + path);
  }
});
test('Storyboard mode and transfer contracts retain Grid Board and Fit only', () => {
  const engine = readFileSync('src/tools/storyboard/engine.ts', 'utf8');
  assert.match(engine, /export type StoryMode = 'story' \| 'fit'/);
  assert.match(engine, /importStills: \(groups: TransferGroup\[\]\)/);
  const video = readFileSync('src/tools/video-stills/engine.ts', 'utf8');
  assert.match(video, /mode: 'story'/);
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /onTransfer=\{handleStillsTransfer\}/);
});
