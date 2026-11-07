import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateLinks } from '../src/tools/link-generator/engine.ts';

// Import the ACTUAL pinned CTK implementation, not an independently rewritten oracle.
// GitHub CI checks out this exact source before running the test suite.
const legacyPath = resolve(process.env.CTK_SOURCE_DIR || 'legacy-source', 'src/js/tools/link-gen.js');
const haveLegacy = existsSync(legacyPath);

test('the pinned CTK reference is available to CI parity tests', () => {
  if (process.env.CI) assert.equal(haveLegacy, true, 'The pinned CTK source must be checked out before parity tests');
});

function runLegacy(legacy, input) {
  const elements = new Map(Object.entries({
    'alg-server': { value: input.server },
    'alg-folder': { value: input.folder },
    'alg-input': { value: input.filenames },
    'alg-mode-toggle': { checked: input.newMp4Mode },
    'alg-out-ads': { value: 'previous value' },
    'alg-out-story': { value: 'previous value' },
  }));
  const errors = [];
  const oldDocument = globalThis.document;
  const oldUI = globalThis.UI;
  globalThis.document = { getElementById: key => elements.get(key) ?? null };
  globalThis.UI = { showError(message) { errors.push(message); } };
  try {
    legacy.generate();
    return {
      exposure: elements.get('alg-out-ads').value,
      storyboard: elements.get('alg-out-story').value,
      errors,
    };
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
    if (oldUI === undefined) delete globalThis.UI;
    else globalThis.UI = oldUI;
  }
}

const cases = [
  ['default ALDI, mixed JPG/PNG case', { server:'aldi', folder:'Campaign 01', filenames:'hero.jpg\nBanner.PNG\nthumbnail.jpeg', newMp4Mode:false }],
  ['S3 nested folders and encoded characters', { server:'s3', folder:'  Winter 2026 / North Zone  ', filenames:'Sale & Save.jpg\nA "quote".png', newMp4Mode:false }],
  ['empty folder, MP3, existing MP4 mode', { server:'s3', folder:'', filenames:'voice.mp3\nintro.MP4', newMp4Mode:false }],
  ['new MP4 format and poster URL', { server:'aldi', folder:'Ads/Europe', filenames:'Summer launch.mp4\nsecond.MP4', newMp4Mode:true }],
  ['mixed real extensions and unsupported names', { server:'aldi', folder:'Assets', filenames:'main.webp\nart.jpg\nreport.pdf\nmusic.mp3\nclip.mp4', newMp4Mode:true }],
  ['skip traversal, control characters and slashes', { server:'s3', folder:'Team', filenames:'../escape.png\nokay.jpg\nsubfolder/inner.jpg\nbad\\name.png\nline\tbreak.png', newMp4Mode:false }],
  ['UTF-8 names and spaces', { server:'aldi', folder:'München/Été', filenames:'Café été.jpg\n東京.png\nnormal.jpeg', newMp4Mode:false }],
  ['duplicate names preserve order and duplicates', { server:'s3', folder:'dup', filenames:'same.jpg\nsame.jpg\nother.png\nsame.jpg', newMp4Mode:false }],
  ['no filenames yields empty output', { server:'aldi', folder:'', filenames:'   \n\n', newMp4Mode:false }],
  ['folder normalization collapses repeated separators', { server:'s3', folder:'  A   B////C  ', filenames:'first.png', newMp4Mode:false }],
  ['invalid folder traversal', { server:'aldi', folder:'../private', filenames:'name.jpg', newMp4Mode:false }],
  ['invalid server does not produce links', { server:'unknown', folder:'Assets', filenames:'name.jpg', newMp4Mode:false }],
];

test('React Link Generator outputs exactly match original CTK for 12 representative cases', { skip: !haveLegacy && 'pinned CTK source is not locally available' }, async () => {
  const { default: module } = await import(pathToFileURL(legacyPath).href);
  const legacy = module.AdLinkGen;
  assert.equal(typeof legacy.generate, 'function');
  for (const [label, input] of cases) {
    const old = runLegacy(legacy, input);
    let newer;
    let failure;
    try { newer = generateLinks(input); }
    catch (error) { failure = error instanceof Error ? error.message : String(error); }
    if (failure) {
      assert.equal(old.exposure, '', label + ': CTK must clear the exposure output on error');
      assert.equal(old.storyboard, '', label + ': CTK must clear the Storyboard output on error');
      assert.equal(old.errors.length, 1, label + ': original error count');
      assert.equal(failure, old.errors[0], label + ': error message should remain compatible');
    } else {
      assert.equal(newer.exposure, old.exposure, label + ': exposure HTML or URL mismatch');
      assert.equal(newer.storyboard, old.storyboard, label + ': storyboard HTML or URL mismatch');
      const expectedErrors = newer.skipped.length ? [newer.skipped.length + ' invalid or unsupported filename(s) were skipped.'] : [];
      assert.deepEqual(old.errors, expectedErrors, label + ': invalid filename notice mismatch');
    }
  }
});
