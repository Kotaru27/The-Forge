import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// Earlier migration builds left ignored CTK output under public/legacy.
// Vite otherwise copies it into dist even when the native app never loads it.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generated = resolve(root, 'public', 'legacy');
if (existsSync(generated)) {
  rmSync(generated, { recursive: true, force: true });
  console.log('Removed stale generated CTK web assets from public/legacy');
}
