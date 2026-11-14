import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let projectRoot;

/**
 * 清理事实源测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(projectRoot, { recursive: true, force: true });
}

afterEach(cleanupProject);

/**
 * 创建一个待执行的 Worker 消息。
 *
 * @param {string} status 消息状态
 * @returns {object} 标准消息
 * @author lvdaxianer@yeah.net
 */
function createMessage(status = 'pending') {
  return {
    message_id: 'MSG-001',
    run_id: 'RUN-001',
    round: 1,
    from: 'main-worker',
    to: 'product-review-worker',
    kind: 'request',
    action: 'execute',
    status,
    verdict: null,
    correlation_id: 'CORR-001',
    input_refs: ['prd://RUN-001/v1'],
    output_refs: []
  };
}

test('事实源追加交互消息并在新实例中恢复未消费消息与审计记录', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-fact-store-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const firstStore = new FileFactStore({ projectRoot });
  await firstStore.createRun({
    runId: 'RUN-001',
    taskTier: 'feature',
    intake: '新增需求'
  });
  await firstStore.appendInteraction('RUN-001', createMessage());
  await firstStore.appendAudit('RUN-001', {
    event_id: 'AUDIT-001',
    action: 'run_created',
    actor: 'main-worker',
    reason: '创建功能需求运行'
  });

  const restartedStore = new FileFactStore({ projectRoot });
  const recovered = await restartedStore.recoverRun('RUN-001', 'product-review-worker');

  assert.equal(recovered.run.runId, 'RUN-001');
  assert.equal(recovered.pendingMessages.length, 1);
  assert.equal(recovered.pendingMessages[0].message_id, 'MSG-001');
  assert.equal(recovered.auditEvents.length, 1);
  assert.equal(recovered.auditEvents[0].event_id, 'AUDIT-001');
});

test('消息状态通过追加新事件更新，不覆盖 interaction.jsonl 历史', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-fact-store-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-001', taskTier: 'feature', intake: '需求' });
  await store.appendInteraction('RUN-001', createMessage());
  await store.appendInteraction('RUN-001', createMessage('succeeded'));

  const interactionPath = join(projectRoot, '.product', 'runs', 'RUN-001', 'interaction.jsonl');
  const lines = (await readFile(interactionPath, 'utf8')).trim().split('\n');
  assert.equal(lines.length, 2);
  assert.deepEqual(await store.listPendingMessages('RUN-001', 'product-review-worker'), []);
});

test('只消费 action=execute 且目标匹配的消息', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-fact-store-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-001', taskTier: 'feature', intake: '需求' });
  await store.appendInteraction('RUN-001', createMessage());
  await store.appendInteraction('RUN-001', {
    ...createMessage(),
    message_id: 'MSG-INFORM',
    kind: 'inform',
    action: 'none'
  });
  await store.appendInteraction('RUN-001', {
    ...createMessage(),
    message_id: 'MSG-OTHER',
    to: 'engineering-review-worker'
  });

  const messages = await store.listPendingMessages('RUN-001', 'product-review-worker');
  assert.deepEqual(messages.map((message) => message.message_id), ['MSG-001']);
});

test('删除索引缓存后可以从事实文件重建索引', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-fact-store-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-001', taskTier: 'bugfix', intake: '修复问题' });
  const index = await store.rebuildIndex();
  const indexPath = join(projectRoot, '.product', 'control-plane', 'cache', 'index.json');
  await unlink(indexPath);

  const restartedStore = new FileFactStore({ projectRoot });
  const rebuilt = await restartedStore.rebuildIndex();

  assert.deepEqual(rebuilt, index);
  assert.equal(rebuilt.runs[0].runId, 'RUN-001');
});
