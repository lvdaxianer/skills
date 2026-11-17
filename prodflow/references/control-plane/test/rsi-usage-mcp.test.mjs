import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { RsiContextBuilder } from '../src/rsi-context.mjs';
import { RsiUsageStore } from '../src/rsi-usage-store.mjs';
import { createRsiMcpServer } from '../src/rsi-mcp-server.mjs';

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'rsi-usage-mcp-'));
  const projectRoot = join(root, 'project');
  const sharedRoot = join(root, 'shared');
  const builder = new RsiContextBuilder({
    projectRoot,
    sharedKnowledgeRoot: sharedRoot,
    globalCatalog: { async listProblems() { return [{
      eventId: 'COMMON-001', scope: 'common', lifecycle: 'active',
      title: '公共规则', solution: '必须保留证据', evidenceRefs: ['evidence://common']
    }]; } },
    knowledgeStore: { async listKnowledge() { return []; } }
  });
  const snapshot = await builder.build({ projectId: 'demo-project', runId: 'RUN-MCP-001', task: '验证 RSI' });
  const usageStore = new RsiUsageStore({ projectRoot });
  await usageStore.record({ snapshot, workerId: 'worker-a', itemId: 'COMMON-001', stage: 'injected', source: 'provider-adapter', confidence: 'observed' });
  return { root, builder, snapshot, usageStore };
}

test('MCP 可以回报 RSI 使用并显式结算未回报条目', async () => {
  const { root, builder, snapshot, usageStore } = await createFixture();
  const server = createRsiMcpServer({ builder, usageStore });
  const listed = await server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  const context = await server.handleMessage({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'rsi_get_context', arguments: { snapshotId: snapshot.snapshotId, workerId: 'worker-a' } }
  });
  const report = await server.handleMessage({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: {
      name: 'rsi_report_usage',
      arguments: {
        runId: snapshot.runId, workerId: 'worker-a', snapshotId: snapshot.snapshotId,
        usages: [{ itemId: 'COMMON-001', stage: 'consulted', evidenceRefs: ['evidence://common'] }]
      }
    }
  });
  const finalized = await server.handleMessage({
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'rsi_finalize_run', arguments: {
      runId: snapshot.runId, workerId: 'worker-a', snapshotId: snapshot.snapshotId
    } }
  });

  assert.deepEqual(listed.result.tools.map((tool) => tool.name), [
    'rsi_get_context', 'rsi_get_evidence', 'rsi_get_manifest',
    'rsi_report_usage', 'rsi_finalize_run'
  ]);
  assert.equal(context.result.isError, false);
  assert.equal(report.result.isError, false);
  assert.equal(JSON.parse(report.result.content[0].text).accepted, 1);
  assert.equal(finalized.result.isError, false);
  assert.equal(usageStore.getStats('COMMON-001').consultedCount, 1);
  assert.match(await readFile(join(root, 'project', '.product', 'runs', snapshot.runId, 'rsi-usage.jsonl'), 'utf8'), /worker-report/);
  usageStore.close();
  await rm(root, { recursive: true, force: true });
});

test('MCP 使用回报拒绝不匹配的运行身份', async () => {
  const { root, builder, snapshot, usageStore } = await createFixture();
  const server = createRsiMcpServer({ builder, usageStore });
  const response = await server.handleMessage({
    jsonrpc: '2.0', id: 5, method: 'tools/call',
    params: { name: 'rsi_report_usage', arguments: {
      runId: 'RUN-WRONG', workerId: 'worker-a', snapshotId: snapshot.snapshotId,
      usages: [{ itemId: 'COMMON-001', stage: 'consulted' }]
    } }
  });

  assert.equal(response.result.isError, true);
  assert.equal(JSON.parse(response.result.content[0].text).code, 'RSI_RUN_MISMATCH');
  usageStore.close();
  await rm(root, { recursive: true, force: true });
});

test('Worker 结果文件与 MCP 使用相同的回传语义', async () => {
  const { root, snapshot, usageStore } = await createFixture();
  const resultPath = join(root, 'project', '.product', 'runs', snapshot.runId, 'worker-result.json');
  await writeFile(resultPath, JSON.stringify({
    complete: true,
    rsiUsage: [{ itemId: 'COMMON-001', stage: 'applied', evidenceRefs: ['test://evidence'] }]
  }));

  const result = await usageStore.importWorkerResult({
    snapshot,
    workerId: 'worker-a',
    resultPath
  });

  assert.equal(result.finalized, true);
  assert.equal(usageStore.getStats('COMMON-001').appliedCount, 1);
  usageStore.close();
  await rm(root, { recursive: true, force: true });
});
