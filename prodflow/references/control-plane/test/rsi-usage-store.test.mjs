import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { RsiUsageStore } from '../src/rsi-usage-store.mjs';

function createSnapshot() {
  return {
    projectId: 'demo-project',
    runId: 'RUN-001',
    snapshotId: 'RSI-SNAPSHOT-001',
    layers: [
      { name: 'global', items: [{ itemId: 'item1' }, { itemId: 'item2' }] },
      { name: 'project', items: [] },
      { name: 'current', items: [] }
    ]
  };
}

test('RSI 使用事实按阶段幂等记录并在结算时生成 unknown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-usage-store-'));
  const store = new RsiUsageStore({ projectRoot: root });
  const snapshot = createSnapshot();

  await store.record({ snapshot, workerId: 'worker-a', itemId: 'item1', stage: 'injected', source: 'provider-adapter' });
  await store.record({ snapshot, workerId: 'worker-a', itemId: 'item2', stage: 'injected', source: 'provider-adapter' });
  const consulted = await store.record({
    snapshot,
    workerId: 'worker-a',
    itemId: 'item1',
    stage: 'consulted',
    source: 'worker-report',
    confidence: 'declared'
  });
  const repeated = await store.record({
    snapshot,
    workerId: 'worker-a',
    itemId: 'item1',
    stage: 'consulted',
    source: 'worker-report',
    confidence: 'declared'
  });
  const finalized = await store.finalize({ snapshot, workerId: 'worker-a' });
  const stats = store.getStats('item1');
  const usageText = await readFile(join(root, '.product', 'runs', 'RUN-001', 'rsi-usage.jsonl'), 'utf8');

  assert.equal(consulted.idempotent, false);
  assert.equal(repeated.idempotent, true);
  assert.equal(finalized.unknownItemIds.includes('item2'), true);
  assert.deepEqual(stats, {
    itemId: 'item1', injectedCount: 1, loadedCount: 0,
    consultedCount: 1, appliedCount: 0, unknownCount: 0
  });
  assert.match(usageText, /"itemId":"item2"/);
  await rm(root, { recursive: true, force: true });
});

test('SQLite 统计删除后可以从 RSI 使用事实重建', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-usage-rebuild-'));
  const store = new RsiUsageStore({ projectRoot: root });
  const snapshot = createSnapshot();

  await store.record({ snapshot, workerId: 'worker-a', itemId: 'item1', stage: 'applied', source: 'worker-report' });
  store.close();
  await rm(join(root, '.product', 'runs', 'rsi-usage.sqlite'), { force: true });

  const rebuilt = new RsiUsageStore({ projectRoot: root });
  const result = await rebuilt.rebuild();

  assert.equal(result.events, 1);
  assert.equal(rebuilt.getStats('item1').appliedCount, 1);
  rebuilt.close();
  await rm(root, { recursive: true, force: true });
});

test('使用回报引用未注入到快照的条目时返回稳定错误', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-usage-invalid-'));
  const store = new RsiUsageStore({ projectRoot: root });

  await assert.rejects(
    store.record({
      snapshot: createSnapshot(),
      workerId: 'worker-a',
      itemId: 'missing-item',
      stage: 'consulted',
      source: 'worker-report'
    }),
    (error) => error.code === 'RSI_ITEM_NOT_FOUND'
  );
  store.close();
  await rm(root, { recursive: true, force: true });
});
