import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, test } from 'node:test';

let projectRoot;

/**
 * 清理产品交付集成测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(projectRoot, { recursive: true, force: true });
}

afterEach(cleanupProject);

test('feature 从 PRD 门禁贯通开发、验收和未授权部署决策', async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-delivery-integration-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const { runPrdWorkflow } = await import('../src/prd-coordinator.mjs');
  const { dispatchDevelopmentWorkflow } = await import('../src/development-workflow-adapter.mjs');
  const { VerificationStore } = await import('../src/verification-evidence.mjs');
  const { requestDeploymentDecision } = await import('../src/service-deployment-adapter.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId: 'RUN-INTEGRATION-001', taskTier: 'feature', intake: '增加收藏功能' });
  const passReview = async () => ({ status: 'succeeded', verdict: 'pass', findings: [] });

  const prdResult = await runPrdWorkflow({
    store,
    runId: 'RUN-INTEGRATION-001',
    intake: '增加收藏功能',
    workerAdapters: { productReview: passReview, engineeringReview: passReview }
  });
  assert.equal(prdResult.status, 'DEVELOPMENT_READY');

  const developmentResult = await dispatchDevelopmentWorkflow({
    store,
    runId: 'RUN-INTEGRATION-001'
  });
  assert.equal(developmentResult.status, 'DEVELOPMENT_DISPATCHED');

  const verification = new VerificationStore({ projectRoot });
  const criteria = prdResult.prd.acceptanceCriteria.map((criterion) => ({
    ...criterion,
    verificationType: 'command',
    verification: 'npm test'
  }));
  const contracts = await verification.createContracts(
    'RUN-INTEGRATION-001',
    'FEATURE-收藏',
    criteria
  );
  for (const contract of contracts) {
    await verification.recordEvidence('RUN-INTEGRATION-001', {
      acceptanceId: contract.acceptanceId,
      type: 'command',
      command: 'npm test',
      expected: 'exit code 0',
      actual: 'exit code 0',
      status: 'passed',
      exitCode: 0,
      commit: 'abc123'
    });
  }
  const verificationResult = await verification.evaluate('RUN-INTEGRATION-001', {
    currentCommit: 'abc123'
  });
  assert.equal(verificationResult.status, 'VERIFIED');

  await store.updateRun('RUN-INTEGRATION-001', { status: 'FINAL_AUDIT_PASSED' });
  const deploymentResult = await requestDeploymentDecision({
    store,
    runId: 'RUN-INTEGRATION-001'
  });
  assert.equal(deploymentResult.status, 'DEPLOYMENT_DECISION_REQUIRED');
  assert.equal((await store.listPendingMessages('RUN-INTEGRATION-001', 'development-workflow')).length, 1);
  assert.deepEqual(await store.listPendingMessages('RUN-INTEGRATION-001', 'service-deployment'), []);
});

test('控制台入口使用 EJS 模板且不依赖独立 index.html', async () => {
  const uiRoot = new URL('../ui/', import.meta.url);
  const templatePath = new URL('../ui/index.ejs', import.meta.url);
  const legacyPath = new URL('../ui/index.html', import.meta.url);
  await access(templatePath);
  await assert.rejects(access(legacyPath));
  const template = await readFile(templatePath, 'utf8');
  assert.match(template, /<%=\s*pageTitle\s*%>/);
  assert.match(template, /knowledgeCards/);
  assert.equal(uiRoot.protocol, 'file:');
});
