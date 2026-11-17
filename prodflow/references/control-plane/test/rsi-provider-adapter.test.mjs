import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { RsiContextBuilder } from '../src/rsi-context.mjs';
import { RsiProviderAdapterRegistry } from '../src/rsi-provider-adapter.mjs';
import { createRsiMcpServer } from '../src/rsi-mcp-server.mjs';

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'rsi-adapter-'));
  const builder = new RsiContextBuilder({
    projectRoot: join(root, 'project'),
    sharedKnowledgeRoot: join(root, 'shared'),
    globalCatalog: {
      async listProblems() {
        return [{
          eventId: 'COMMON-001',
          scope: 'common',
          lifecycle: 'active',
          title: '公共规则',
          solution: '先读取证据再判断',
          evidenceRefs: ['evidence://common-001']
        }];
      }
    },
    knowledgeStore: {
      async listKnowledge() {
        return [{
          eventId: 'PROJECT-001',
          scope: 'project',
          lifecycle: 'active',
          title: '项目规则',
          solution: '必须保留截图',
          evidenceRefs: ['screenshot://project-001']
        }];
      }
    }
  });
  const snapshot = await builder.build({
    projectId: 'demo-project',
    runId: 'RUN-002',
    task: '验证证据',
    maxItems: 10
  });
  return { root, builder, snapshot };
}

test('文件 Adapter 只写 .product/rsi 并返回不同工具的导入片段', async () => {
  const { root, builder, snapshot } = await createFixture();
  const projectRoot = join(root, 'project');
  const claudePath = join(projectRoot, 'CLAUDE.md');
  const agentsPath = join(projectRoot, 'AGENTS.md');
  const originalClaude = '用户维护的 Claude 规则';
  const originalAgents = '用户维护的 Codex 规则';
  await import('node:fs/promises').then(({ writeFile }) => Promise.all([
    writeFile(claudePath, originalClaude),
    writeFile(agentsPath, originalAgents)
  ]));

  const registry = new RsiProviderAdapterRegistry({ projectRoot, builder });
  const claude = await registry.inject({ provider: 'claude', snapshot, mode: 'file' });
  const codex = await registry.inject({ provider: 'codex', snapshot, mode: 'file' });
  const custom = await registry.inject({ provider: 'my-tool', snapshot, mode: 'file' });

  assert.equal(claude.status, 'injected');
  assert.match(claude.importSnippet, /\.product\/rsi\/providers\/claude\/current\.md/);
  assert.match(codex.importSnippet, /\.product\/rsi\/providers\/codex\/current\.md/);
  assert.match(custom.paths.markdown, /providers\/my-tool\/current\.md/);
  assert.equal(await readFile(claudePath, 'utf8'), originalClaude);
  assert.equal(await readFile(agentsPath, 'utf8'), originalAgents);
  assert.match(await readFile(claude.paths.markdown, 'utf8'), /RSI Context Snapshot/);
  assert.ok((await stat(claude.paths.manifest)).isFile());
});

test('Prompt Adapter 返回带快照身份且有上限的 prelude', async () => {
  const { root, builder, snapshot } = await createFixture();
  const registry = new RsiProviderAdapterRegistry({ projectRoot: join(root, 'project'), builder });
  const result = await registry.inject({
    provider: 'kimi',
    snapshot,
    mode: 'prompt',
    maxPromptBytes: 900
  });

  assert.equal(result.status, 'injected');
  assert.match(result.promptPrelude, new RegExp(snapshot.snapshotId));
  assert.match(result.promptPrelude, new RegExp(snapshot.contentHash));
  assert.ok(result.promptBytes <= 900);
  assert.equal(result.manifest.provider, 'kimi');
});

test('MCP 支持 initialize、tools/list 和只读 RSI 查询', async () => {
  const { builder, snapshot } = await createFixture();
  const server = createRsiMcpServer({ builder });
  const initialize = await server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  const listed = await server.handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const context = await server.handleMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'rsi_get_context', arguments: { snapshotId: snapshot.snapshotId, layer: 'project' } }
  });

  assert.equal(initialize.result.serverInfo.name, 'product-delivery-workflow-rsi');
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), [
    'rsi_get_context',
    'rsi_get_evidence',
    'rsi_get_manifest'
  ]);
  assert.equal(context.result.isError, false);
  const payload = JSON.parse(context.result.content[0].text);
  assert.equal(payload.layers[0].name, 'project');
  assert.equal(payload.layers[0].items[0].itemId, 'PROJECT-001');
  assert.equal(await server.handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), undefined);
});

test('MCP 查询失败返回稳定错误且不伪装成功', async () => {
  const { builder } = await createFixture();
  const server = createRsiMcpServer({ builder });
  const response = await server.handleMessage({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'rsi_get_context', arguments: { snapshotId: 'RSI-SNAPSHOT-missing' } }
  });

  assert.equal(response.result.isError, true);
  assert.equal(JSON.parse(response.result.content[0].text).code, 'RSI_SNAPSHOT_NOT_FOUND');
});
