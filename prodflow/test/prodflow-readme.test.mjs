import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const skillRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('prodflow README 覆盖完整流程、环境职责和 RSI 实现', () => {
  const readme = readFileSync(join(skillRoot, 'prodflow', 'README.md'), 'utf8');
  const requiredTexts = [
    '需求分流',
    'PRD',
    '主 Worker',
    '产品复检 Worker',
    '研发复检 Worker',
    '开发环境',
    '测试与验收环境',
    '部署环境',
    'DEVELOPMENT_READY',
    'FINAL_AUDIT_PASSED',
    'service-deployment',
    'global/project/current',
    '文件注入',
    'Prompt 注入',
    'MCP 注入',
    '.product/rsi/audit.jsonl',
    'CLAUDE.md',
    'AGENTS.md',
    'SQLite',
    '证据'
  ];
  for (const requiredText of requiredTexts) {
    assert.equal(readme.includes(requiredText), true, `README 缺少：${requiredText}`);
  }
});

test('prodflow README 的链接和关键命令指向当前目录', () => {
  const readme = readFileSync(join(skillRoot, 'prodflow', 'README.md'), 'utf8');
  assert.equal(readme.includes('product-delivery-workflow/'), false);
  assert.equal(readme.includes('prodflow/references/control-plane'), true);
  assert.equal(readme.includes('npm test --prefix prodflow/references/control-plane'), true);
  assert.equal(readme.includes('npm run mcp --prefix prodflow/references/control-plane'), true);
});
