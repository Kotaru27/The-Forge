import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = '.agents/skills/';
const skills = {
  'impeccable': 'impeccable',
  'ui-ux-pro-max': 'ui-ux-pro-max',
  'frontend-design': 'frontend-design',
  'design-taste-frontend': 'design-taste-frontend',
  'gpt-taste': 'gpt-taste',
  'redesign-existing-projects': 'redesign-existing-projects',
  'web-design-guidelines': 'web-design-guidelines',
};
test('all seven reviewed visual-design skill entries have valid name and description', () => {
  for (const [folder, name] of Object.entries(skills)) {
    const path = root + folder + '/SKILL.md';
    assert.ok(existsSync(path), path);
    const source = readFileSync(path, 'utf8');
    assert.match(source, /^---\s*\n/);
    assert.ok(source.includes('name: ' + name), 'Skill identity: ' + name);
    assert.match(source, /\ndescription:/);
  }
});
test('Impeccable provides design references but does not bundle a downloaded executable', () => {
  for (const path of ['new-work.md', 'craft-floor.md', 'critique.md', 'layout.md', 'typeset.md']) {
    assert.ok(existsSync(root + 'impeccable/reference/' + path));
  }
  assert.equal(existsSync(root + 'impeccable/scripts/impeccable'), false);
});
test('UI Pro Max local search has its scripts, key data, and all 22 stack catalogs', () => {
  for (const name of ['search.py','core.py','design_system.py','reasoning_contract.py']) {
    assert.ok(existsSync(root + 'ui-ux-pro-max/scripts/' + name));
  }
  for (const name of ['styles.csv','products.csv','colors.csv','typography.csv','ux-guidelines.csv','ui-reasoning.csv','google-fonts.csv','google-font-licenses.json']) {
    assert.ok(existsSync(root + 'ui-ux-pro-max/data/' + name));
  }
  assert.equal(readdirSync(root + 'ui-ux-pro-max/data/stacks').filter(name => name.endsWith('.csv')).length, 22);
});
test('Vercel interface rules are pinned and vendored, not loaded as live instructions', () => {
  const skill = readFileSync(root + 'web-design-guidelines/SKILL.md', 'utf8');
  assert.match(skill, /reference\/web-interface-guidelines\.md/);
  assert.ok(existsSync(root + 'web-design-guidelines/reference/web-interface-guidelines.md'));
});

test('UI Pro Max Python search returns React-specific matches and design systems', (t) => {
  const executable = process.platform === 'win32' ? 'py' : 'python3';
  const prefix = process.platform === 'win32' ? ['-3'] : [];
  const probe = spawnSync(executable, [...prefix, '--version'], { encoding: 'utf8', timeout: 5000 });
  if (probe.error || probe.status !== 0) {
    t.skip('Python 3 not available; verify local design guidance statically');
    return;
  }
  const script = root + 'ui-ux-pro-max/scripts/search.py';
  const react = spawnSync(executable, [...prefix, script, 'desktop app accessibility', '--stack', 'react', '--max-results', '2'], { encoding: 'utf8', timeout: 20000 });
  assert.equal(react.status, 0, react.stderr || react.error?.message);
  assert.ok(react.stdout.trim().length > 30, 'Empty React search response');
  const design = spawnSync(executable, [...prefix, script, 'desktop creative productivity toolkit', '--design-system', '-p', 'The Forge'], { encoding: 'utf8', timeout: 20000 });
  assert.equal(design.status, 0, design.stderr || design.error?.message);
  assert.ok(design.stdout.trim().length > 60, 'Empty design-system recommendation');
});
