import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const skillRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('prodflow 是当前唯一的总控 Skill 入口', () => {
  const newRoot = join(skillRoot, 'prodflow');
  assert.equal(existsSync(newRoot), true);
  assert.equal(existsSync(join(newRoot, 'SKILL.md')), true);
  assert.equal(existsSync(join(newRoot, 'README.md')), true);
  assert.equal(existsSync(join(newRoot, 'references', 'control-plane', 'package.json')), true);
  assert.equal(existsSync(join(skillRoot, 'product-delivery-workflow')), false);
  const skill = readFileSync(join(newRoot, 'SKILL.md'), 'utf8');
  assert.match(skill, /^name: prodflow$/m);
});

