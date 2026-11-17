import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { RsiContextBuilder } from '../src/rsi-context.mjs';
import { RsiProviderAdapterRegistry } from '../src/rsi-provider-adapter.mjs';
import { createRsiMcpServer } from '../src/rsi-mcp-server.mjs';

async function createProjectFixture(projectId, projectFacts, sharedRoot) {
  const projectRoot = await mkdtemp(join(tmpdir(), `rsi-${projectId}-`));
  const builder = new RsiContextBuilder({
    projectRoot,
    sharedKnowledgeRoot: sharedRoot,
    globalCatalog: {
      async listProblems() {
        return [{
          eventId: 'COMMON-001',
          scope: 'common',
          lifecycle: 'active',
          title: '公共规则',
          solution: '所有工具都必须保留证据',
          evidenceRefs: ['common://evidence']
        }];
      }
    },
    knowledgeStore: { async listKnowledge() { return projectFacts; } }
  });
  return { projectId, projectRoot, builder };
}

test('多项目共享全局层、项目层覆盖并保持三种 Provider 一致', async () => {
  const sharedRoot = await mkdtemp(join(tmpdir(), 'rsi-shared-'));
  const projectAFacts = [{
    eventId: 'COMMON-001',
    scope: 'project',
    lifecycle: 'active',
    title: '项目 A 覆盖规则',
    solution: '项目 A 必须保存浏览器截图',
    evidenceRefs: ['project-a://screenshot']
  }];
  const projectB = await createProjectFixture('project-b', [{
    eventId: 'PROJECT-B-001',
    scope: 'project',
    lifecycle: 'active',
    title: '项目 B 规则',
    solution: '项目 B 必须保存 API 摘要',
    evidenceRefs: ['project-b://api']
  }], sharedRoot);
  const projectA = await createProjectFixture('project-a', projectAFacts, sharedRoot);

  const snapshotA = await projectA.builder.build({ projectId: 'project-a', task: '截图' });
  const snapshotB = await projectB.builder.build({ projectId: 'project-b', task: 'API' });
  const projectAItems = snapshotA.layers[1].items;
  const projectBItems = snapshotB.layers[1].items;

  assert.equal(snapshotA.layers[0].items[0].itemId, 'COMMON-001');
  assert.equal(snapshotB.layers[0].items[0].itemId, 'COMMON-001');
  assert.deepEqual(projectAItems[0].conflictRefs, ['global:COMMON-001']);
  assert.equal(projectBItems[0].itemId, 'PROJECT-B-001');

  const adapters = new RsiProviderAdapterRegistry({ projectRoot: projectA.projectRoot, builder: projectA.builder });
  const fileResult = await adapters.inject({ provider: 'claude', snapshot: snapshotA, mode: 'file' });
  const promptResult = await adapters.inject({ provider: 'codex', snapshot: snapshotA, mode: 'prompt' });
  const mcp = createRsiMcpServer({ builder: projectA.builder });
  const mcpResult = await mcp.handleMessage({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'rsi_get_context', arguments: { snapshotId: snapshotA.snapshotId } }
  });

  assert.equal(fileResult.snapshotId, snapshotA.snapshotId);
  assert.equal(promptResult.snapshotId, snapshotA.snapshotId);
  assert.equal(JSON.parse(mcpResult.result.content[0].text).contentHash, snapshotA.contentHash);

  projectAFacts.push({
    eventId: 'PROJECT-A-002',
    scope: 'project',
    lifecycle: 'active',
    title: '重试后新增规则',
    solution: '重试必须携带新证据',
    evidenceRefs: ['project-a://retry']
  });
  const retrySnapshot = await projectA.builder.build({ projectId: 'project-a', task: '重试' });

  assert.notEqual(retrySnapshot.sourceHash, snapshotA.sourceHash);
  assert.notEqual(retrySnapshot.contentHash, snapshotA.contentHash);
  assert.equal((await projectA.builder.read(snapshotA.snapshotId)).sourceHash, snapshotA.sourceHash);
});
