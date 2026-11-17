import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createControlPlaneServer } from '../src/server.mjs';

let server;
let projectRoot;
let baseUrl;

test.beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-runtime-'));
  projectRoot = join(root, 'project');
  const sharedKnowledgeRoot = join(root, 'shared');
  const { mkdir } = await import('node:fs/promises');
  await Promise.all([mkdir(projectRoot), mkdir(sharedKnowledgeRoot)]);
  server = createControlPlaneServer({
    host: '127.0.0.1',
    port: 0,
    projectRoot,
    sharedKnowledgeRoot,
    serviceVersion: 'test-version'
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://${address.address}:${address.port}`;
});

test.afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    ...options
  });
}

async function prepareSnapshot() {
  const response = await request('/api/rsi/snapshots', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'demo-project', runId: 'RUN-RUNTIME-001', task: '验证真实注入链路' })
  });
  assert.equal(response.status, 201);
  return response.json();
}

test('控制平面通过 Provider Adapter 执行文件注入并留下审计证据', async () => {
  const claudePath = join(projectRoot, 'CLAUDE.md');
  const agentsPath = join(projectRoot, 'AGENTS.md');
  await Promise.all([
    writeFile(claudePath, '用户维护的 Claude 规则'),
    writeFile(agentsPath, '用户维护的 Codex 规则')
  ]);
  const snapshot = await prepareSnapshot();

  const response = await request(`/api/rsi/snapshots/${snapshot.snapshotId}/inject/claude`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'file' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'injected');
  assert.equal(body.injectionMethod, 'file');
  assert.equal(body.snapshotId, snapshot.snapshotId);
  assert.equal(await readFile(claudePath, 'utf8'), '用户维护的 Claude 规则');
  assert.equal(await readFile(agentsPath, 'utf8'), '用户维护的 Codex 规则');
  const auditLines = (await readFile(join(projectRoot, '.product', 'rsi', 'audit.jsonl'), 'utf8'))
    .trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(auditLines.length, 1);
  assert.equal(auditLines[0].projectId, 'demo-project');
  assert.equal(auditLines[0].runId, 'RUN-RUNTIME-001');
  assert.equal(auditLines[0].provider, 'claude');
  assert.equal(auditLines[0].snapshotId, snapshot.snapshotId);
  assert.equal(auditLines[0].status, 'injected');
});

test('控制平面返回 Prompt 与 MCP 注入结果，并区分 fallback', async () => {
  const snapshot = await prepareSnapshot();
  const promptResponse = await request(`/api/rsi/snapshots/${snapshot.snapshotId}/inject/codex`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'prompt', maxPromptBytes: 900 })
  });
  const prompt = await promptResponse.json();
  assert.equal(promptResponse.status, 200);
  assert.equal(prompt.status, 'injected');
  assert.equal(prompt.injectionMethod, 'prompt');
  assert.ok(prompt.promptBytes <= 900);

  const mcpResponse = await request(`/api/rsi/snapshots/${snapshot.snapshotId}/inject/kimi`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'mcp' })
  });
  const mcp = await mcpResponse.json();
  assert.equal(mcpResponse.status, 200);
  assert.equal(mcp.status, 'available');
  assert.equal(mcp.injectionMethod, 'mcp');
  assert.ok(Array.isArray(mcp.mcp.args));

  const fallbackResponse = await request(`/api/rsi/snapshots/${snapshot.snapshotId}/inject/codex`, {
    method: 'POST',
    body: JSON.stringify({ mode: 'unsupported-mode' })
  });
  const fallback = await fallbackResponse.json();
  assert.equal(fallbackResponse.status, 200);
  assert.equal(fallback.status, 'fallback');
  assert.equal(fallback.fallback.selectedMode, 'prompt');
  const auditLines = (await readFile(join(projectRoot, '.product', 'rsi', 'audit.jsonl'), 'utf8'))
    .trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(auditLines.map((entry) => entry.status), ['injected', 'available', 'fallback']);
});

test('注入快照不存在时返回稳定错误', async () => {
  const response = await request('/api/rsi/snapshots/RSI-SNAPSHOT-missing/inject/claude', {
    method: 'POST',
    body: JSON.stringify({ mode: 'file' })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.errorCode, 'RSI_SNAPSHOT_NOT_FOUND');
  const audit = JSON.parse((await readFile(join(projectRoot, '.product', 'rsi', 'audit.jsonl'), 'utf8')).trim());
  assert.equal(audit.status, 'failed');
  assert.equal(audit.snapshotId, 'RSI-SNAPSHOT-missing');
  assert.equal(audit.errorCode, 'RSI_SNAPSHOT_NOT_FOUND');
});
