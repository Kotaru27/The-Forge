import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.env.CTK_SOURCE_DIR || 'legacy-source');
if (!existsSync(resolve(root, 'package.json'))) {
  console.error('Legacy source missing: run npm run prepare:legacy first');
  process.exit(1);
}
console.log('Running original CTK test suite');
execFileSync('npm', ['test'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
