import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let projectRoot;

/**
 * 清理 PRD 编排测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(projectRoot, { recursive: true, force: true });
}

afterEach(cleanupProject);

/**
 * 构造通过复检结果。
 *
 * @returns {object} 复检结果
 * @author lvdaxianer@yeah.net
 */
function passReview() {
  return {
    status: 'succeeded',
    verdict: 'pass',
    findings: [],
    reason: '结构和门禁检查通过'
  };
}

test('简单需求会生成带来源标记的完整 PRD 并进入开发就绪', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-prd-coordinator-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { runPrdWorkflow } = await import('../src/prd-coordinator.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-PRD-001', taskTier: 'feature', intake: '用户可以创建订单' });

  const result = await runPrdWorkflow({
    store,
    runId: 'RUN-PRD-001',
    intake: '用户可以创建订单',
    projectFacts: ['项目使用订单状态机'],
    workerAdapters: {
      productReview: async () => passReview(),
      engineeringReview: async () => passReview()
    }
  });

  assert.equal(result.status, 'DEVELOPMENT_READY');
  assert.equal(result.prdStatus, 'PRD_VERIFIED');
  assert.equal(result.prd.version, 'prd-v1');
  assert.ok(result.tasks.length > 0);
  assert.equal(result.handoff.prdVersion, 'prd-v1');
  assert.equal(result.prd.goals[0].source, 'explicit');
  assert.equal(result.prd.roles[0].source, 'inferred');
  assert.equal(result.prd.assumptions[0].source, 'default');
  assert.ok(result.prd.acceptanceCriteria[0].id.startsWith('AC-'));
  const interactionPath = join(projectRoot, '.product', 'runs', 'RUN-PRD-001', 'interaction.jsonl');
  const interactionLines = (await readFile(interactionPath, 'utf8')).trim().split('\n');
  const interaction = interactionLines
    .map((line) => JSON.parse(line))
    .find((message) => message.to === 'product-review');
  assert.equal(interaction.to, 'product-review');
  assert.equal(interaction.action, 'execute');
  assert.match(interaction.correlation_id, /^REVIEW-RUN-PRD-001-prd-v1/);
});

test('两个复检 Worker 只读取独立快照，互不可见', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-prd-coordinator-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { runPrdWorkflow } = await import('../src/prd-coordinator.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-PRD-002', taskTier: 'feature', intake: '增加收藏功能' });
  const seen = [];

  const result = await runPrdWorkflow({
    store,
    runId: 'RUN-PRD-002',
    intake: '增加收藏功能',
    workerAdapters: {
      productReview: async ({ snapshot }) => {
        seen.push(['product', snapshot]);
        assert.equal(snapshot.worker, 'product-review');
        assert.equal('reviewResults' in snapshot, false);
        return passReview();
      },
      engineeringReview: async ({ snapshot }) => {
        seen.push(['engineering', snapshot]);
        assert.equal(snapshot.worker, 'engineering-review');
        assert.equal('reviewResults' in snapshot, false);
        return passReview();
      }
    }
  });

  assert.equal(result.status, 'DEVELOPMENT_READY');
  assert.equal(seen.length, 2);
  assert.notEqual(seen[0][1].snapshotId, seen[1][1].snapshotId);
  const productSnapshot = JSON.parse(await readFile(seen[0][1].snapshotPath, 'utf8'));
  const engineeringSnapshot = JSON.parse(await readFile(seen[1][1].snapshotPath, 'utf8'));
  assert.equal('productReview' in productSnapshot, false);
  assert.equal('engineeringReview' in engineeringSnapshot, false);
});

test('复检要求修订时生成新 PRD 版本并重新启动双复检', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-prd-coordinator-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { runPrdWorkflow } = await import('../src/prd-coordinator.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-PRD-003', taskTier: 'feature', intake: '增加导出功能' });
  let reviewRound = 0;

  const result = await runPrdWorkflow({
    store,
    runId: 'RUN-PRD-003',
    intake: '增加导出功能',
    workerAdapters: {
      productReview: async () => {
        reviewRound += 1;
        return reviewRound === 1 ? { ...passReview(), verdict: 'revise' } : passReview();
      },
      engineeringReview: async () => passReview()
    }
  });

  assert.equal(result.status, 'DEVELOPMENT_READY');
  assert.equal(result.prd.version, 'prd-v2');
  assert.equal(result.rounds, 2);
});

test('任一复检阻塞或存在阻塞假设时不得进入开发就绪', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-prd-coordinator-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { generateDefaultPrd, runPrdWorkflow } = await import('../src/prd-coordinator.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-PRD-004', taskTier: 'feature', intake: '修改权限流程' });

  const blockedReview = await runPrdWorkflow({
    store,
    runId: 'RUN-PRD-004',
    intake: '修改权限流程',
    workerAdapters: {
      productReview: async () => ({ ...passReview(), verdict: 'block', reason: '权限边界不明确' }),
      engineeringReview: async () => passReview()
    }
  });
  assert.equal(blockedReview.status, 'PRD_BLOCKED');
  assert.notEqual(blockedReview.status, 'DEVELOPMENT_READY');

  projectRoot = await mkdtemp(join(tmpdir(), 'product-prd-coordinator-'));
  const blockedStore = new FileFactStore({ projectRoot });
  await blockedStore.createRun({ runId: 'RUN-PRD-005', taskTier: 'feature', intake: '增加审批流程' });
  const blockedAssumption = await runPrdWorkflow({
    store: blockedStore,
    runId: 'RUN-PRD-005',
    intake: '增加审批流程',
    workerAdapters: {
      mainPrd: async ({ round, intake }) => {
        const prd = generateDefaultPrd({ intake, version: `prd-v${round}` });
        prd.assumptions[0].status = 'blocked';
        return prd;
      },
      productReview: async () => passReview(),
      engineeringReview: async () => passReview()
    }
  });
  assert.equal(blockedAssumption.status, 'PRD_BLOCKED');
  assert.equal(blockedAssumption.blockedReason, '存在未处理的 blocked 假设');
});

test('复检持续要求修订或执行失败时不会伪装成 PRD_VERIFIED', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-prd-coordinator-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { runPrdWorkflow } = await import('../src/prd-coordinator.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-PRD-006', taskTier: 'feature', intake: '持续要求修订' });

  const result = await runPrdWorkflow({
    store,
    runId: 'RUN-PRD-006',
    intake: '持续要求修订',
    maxRounds: 1,
    workerAdapters: {
      productReview: async () => ({ ...passReview(), verdict: 'revise' }),
      engineeringReview: async () => {
        throw new Error('模拟复检进程失败');
      }
    }
  });

  assert.equal(result.status, 'PRD_BLOCKED');
  assert.notEqual(result.prdStatus, 'PRD_VERIFIED');
});
