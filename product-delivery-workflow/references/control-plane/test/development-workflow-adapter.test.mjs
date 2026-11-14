import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let projectRoot;

/**
 * 清理开发交接测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(projectRoot, { recursive: true, force: true });
}

afterEach(cleanupProject);

test('完整 DEVELOPMENT_READY 运行会生成交接文档并发送开发请求', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-development-adapter-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { runPrdWorkflow } = await import('../src/prd-coordinator.mjs');
  const { dispatchDevelopmentWorkflow } = await import('../src/development-workflow-adapter.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-DEV-001', taskTier: 'feature', intake: '增加收藏功能' });
  const passReview = async () => ({ status: 'succeeded', verdict: 'pass', findings: [] });

  await runPrdWorkflow({
    store,
    runId: 'RUN-DEV-001',
    intake: '增加收藏功能',
    workerAdapters: { productReview: passReview, engineeringReview: passReview }
  });

  const result = await dispatchDevelopmentWorkflow({ store, runId: 'RUN-DEV-001' });

  assert.equal(result.status, 'DEVELOPMENT_DISPATCHED');
  assert.ok(result.handoffPath.endsWith('/handoff.md'));
  const pending = await store.listPendingMessages('RUN-DEV-001', 'development-workflow');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].action, 'execute');
  assert.equal(pending[0].to, 'development-workflow');
});

test('缺少任务、验收或存在阻塞假设时不会发送开发请求', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-development-adapter-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { writeFile, mkdir } = await import('node:fs/promises');
  const { dispatchDevelopmentWorkflow } = await import('../src/development-workflow-adapter.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-DEV-002', taskTier: 'feature', intake: '修改权限流程' });
  const runRoot = join(projectRoot, '.product', 'runs', 'RUN-DEV-002');
  await mkdir(join(runRoot, 'prd'), { recursive: true });
  await writeFile(join(runRoot, 'handoff.json'), JSON.stringify({
    status: 'DEVELOPMENT_READY',
    prdVersion: 'prd-v1',
    prdRefs: ['prd/prd-v1.json', 'prd-verified.json'],
    taskRefs: [],
    acceptanceRefs: ['AC-001'],
    reviewRefs: ['prd/prd-v1/product-review.json'],
    blockedAssumptions: ['ASM-001']
  }));
  await writeFile(join(runRoot, 'prd', 'prd-verified.json'), JSON.stringify({
    version: 'prd-v1',
    acceptanceCriteria: [{ id: 'AC-001', verification: '命令测试' }],
    assumptions: [{ id: 'ASM-001', status: 'blocked' }]
  }));

  await assert.rejects(
    dispatchDevelopmentWorkflow({ store, runId: 'RUN-DEV-002' }),
    (error) => error.code === 'DEVELOPMENT_HANDOFF_BLOCKED'
  );
  assert.deepEqual(await store.listPendingMessages('RUN-DEV-002', 'development-workflow'), []);
});
