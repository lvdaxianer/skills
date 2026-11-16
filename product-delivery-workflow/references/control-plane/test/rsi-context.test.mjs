import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { RsiContextBuilder } from '../src/rsi-context.mjs';

async function createBuilder() {
  const root = await mkdtemp(join(tmpdir(), 'rsi-context-'));
  const projectRoot = join(root, 'project');
  const sharedRoot = join(root, 'shared');
  return {
    root,
    builder: new RsiContextBuilder({
      projectRoot,
      sharedKnowledgeRoot: join(sharedRoot, 'knowledge'),
      globalCatalog: {
        async listProblems() {
          return [
            {
              eventId: 'COMMON-001',
              scope: 'common',
              lifecycle: 'active',
              title: '全局验证规则',
              solution: '必须保留可复现证据',
              severity: 'high',
              evidenceRefs: ['evidence://common-001'],
              verifiedAt: '2026-11-10T00:00:00.000Z'
            },
            {
              eventId: 'SHARED-001',
              scope: 'common',
              lifecycle: 'pending',
              title: '待确认规则',
              solution: '不能默认注入'
            },
            {
              eventId: 'PROJECT-001',
              scope: 'project',
              lifecycle: 'active',
              title: '不应泄漏到全局',
              solution: '只在项目层使用'
            }
          ];
        }
      },
      knowledgeStore: {
        async listKnowledge() {
          return [
            {
              eventId: 'COMMON-001',
              scope: 'project',
              lifecycle: 'active',
              title: '项目覆盖验证规则',
              solution: '本项目必须附带浏览器截图',
              severity: 'critical',
              evidenceRefs: ['evidence://project-001'],
              verifiedAt: '2026-11-15T00:00:00.000Z'
            },
            {
              eventId: 'UNKNOWN-001',
              scope: 'unknown',
              classificationStatus: 'pending',
              lifecycle: 'active',
              title: '未知问题',
              solution: '不能进入默认上下文'
            },
            {
              eventId: 'EXCLUDED-001',
              scope: 'project',
              lifecycle: 'excluded',
              title: '已排除问题',
              solution: '不能进入默认上下文'
            }
          ];
        }
      }
    })
  };
}

test('构建三层 RSI 快照并保留项目覆盖的来源', async () => {
  const { builder } = await createBuilder();
  const snapshot = await builder.build({
    projectId: 'demo-project',
    runId: 'RUN-001',
    provider: 'generic',
    task: '验证浏览器截图并保留证据',
    currentFacts: [{
      factId: 'CURRENT-001',
      title: '当前验收要求',
      content: '必须拿到可见浏览器截图',
      evidenceRefs: ['screenshot://acceptance']
    }]
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.projectId, 'demo-project');
  assert.equal(snapshot.runId, 'RUN-001');
  assert.deepEqual(snapshot.layers.map((layer) => layer.name), ['global', 'project', 'current']);
  assert.equal(snapshot.layers[0].items[0].itemId, 'COMMON-001');
  assert.equal(snapshot.layers[1].items[0].itemId, 'COMMON-001');
  assert.deepEqual(snapshot.layers[1].items[0].conflictRefs, ['global:COMMON-001']);
  assert.equal(snapshot.layers[2].items[0].itemId, 'CURRENT-001');
  assert.equal(snapshot.layers.flatMap((layer) => layer.items).some((item) => item.itemId === 'UNKNOWN-001'), false);
  assert.equal(snapshot.layers.flatMap((layer) => layer.items).some((item) => item.itemId === 'EXCLUDED-001'), false);
  assert.ok(snapshot.sourceHash);
  assert.ok(snapshot.contentHash);
  assert.ok(snapshot.manifest.sources.every((source) => source.scope));
});

test('按条目和字节预算截断，并可从 snapshotId 恢复', async () => {
  const { builder } = await createBuilder();
  const first = await builder.build({
    projectId: 'demo-project',
    task: '证据',
    maxItems: 1,
    maxBytes: 1200
  });

  assert.equal(first.budget.maxItems, 1);
  assert.equal(first.budget.selectedItems, 1);
  assert.equal(first.budget.truncated, true);
  assert.ok(first.budget.omittedItems >= 1);
  assert.deepEqual((await builder.read(first.snapshotId)).layers, first.layers);
  const markdown = await readFile(first.paths.markdown, 'utf8');
  assert.ok(Buffer.byteLength(markdown, 'utf8') <= first.budget.maxBytes);
  assert.match(markdown, /RSI Context Snapshot/);
  assert.match(markdown, new RegExp(first.snapshotId));
});

test('同一来源生成稳定 sourceHash，snapshotId 独立于内容哈希', async () => {
  const { builder } = await createBuilder();
  const first = await builder.build({ projectId: 'demo-project', task: '验证' });
  const second = await builder.build({ projectId: 'demo-project', task: '验证' });

  assert.notEqual(first.snapshotId, second.snapshotId);
  assert.equal(first.sourceHash, second.sourceHash);
  assert.equal(first.contentHash, second.contentHash);
});
