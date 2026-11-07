import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadBlob } from '../src/utils/download.ts';

test('shared browser download keeps the file URL alive until delayed cleanup', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const calls = [];
  const scheduled = [];
  const anchor = { style: {}, click() { calls.push('clicked'); }, remove() { calls.push('removed'); } };
  try {
    globalThis.document = { createElement(tag) { assert.equal(tag, 'a'); return anchor; }, body: { append(value) { assert.equal(value, anchor); calls.push('appended'); } } };
    globalThis.window = { setTimeout(callback, time) { assert.equal(time, 60_000); scheduled.push(callback); } };
    URL.createObjectURL = () => 'blob:download-test';
    URL.revokeObjectURL = url => calls.push('revoked:' + url);
    const owned = new Set();
    downloadBlob(new Blob(['file']), 'logo.zip', owned);
    assert.equal(anchor.href, 'blob:download-test');
    assert.equal(anchor.download, 'logo.zip');
    assert.equal(anchor.style.display, 'none');
    assert.deepEqual(calls, ['appended', 'clicked', 'removed']);
    assert.equal(owned.has('blob:download-test'), true);
    assert.equal(scheduled.length, 1);
    scheduled[0]();
    assert.equal(owned.size, 0);
    assert.deepEqual(calls, ['appended', 'clicked', 'removed', 'revoked:blob:download-test']);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
