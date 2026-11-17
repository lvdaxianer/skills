import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { RsiContextBuilder } from '../src/rsi-context.mjs';
import { RsiProviderAdapterRegistry } from '../src/rsi-provider-adapter.mjs';
import { RsiUsageStore } from '../src/rsi-usage-store.mjs';
import { createRsiMcpServer } from '../src/rsi-mcp-server.mjs';

test('Provider 注入和 MCP 读取会记录相同 Worker 的阶段事件', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-usage-injection-'));
  const projectRoot = join(root, 'project');
  const builder = new RsiContextBuilder({
    projectRoot,
    sharedKnowledgeRoot: join(root, 'shared'),
    globalCatalog: { async listProblems() { return [{
      eventId: 'COMMON-001', scope: 'common', lifecycle: 'active',
      title: '公共规则', solution: '保留证据', evidenceRefs: ['evidence://common']
    }]; } },
    knowledgeStore: { async listKnowledge() { return []; } }
  });
  const snapshot = await builder.build({ projectId: 'demo-project', runId: 'RUN-INJECT-001', task: '闭环验证' });
  const usageStore = new RsiUsageStore({ projectRoot });
  const adapters = new RsiProviderAdapterRegistry({ projectRoot, builder, usageStore });
  const injected = await adapters.inject({
    provider: 'codex', workerId: 'worker-a', snapshot, mode: 'file'
  });
  const server = createRsiMcpServer({ builder, usageStore, defaultWorkerId: 'worker-a' });
  const context = await server.handleMessage({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'rsi_get_context', arguments: { snapshotId: snapshot.snapshotId } }
  });

  assert.equal(injected.manifest.workerId, 'worker-a');
  assert.equal(context.result.isError, false);
  assert.equal(JSON.parse(context.result.content[0].text).usageProtocol.workerId, 'worker-a');
  assert.equal(usageStore.getStats('COMMON-001').injectedCount, 1);
  assert.equal(usageStore.getStats('COMMON-001').loadedCount, 1);
  usageStore.close();
  await rm(root, { recursive: true, force: true });
});
