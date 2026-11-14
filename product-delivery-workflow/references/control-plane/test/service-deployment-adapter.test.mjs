import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let projectRoot;

/**
 * 清理部署交接测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(projectRoot, { recursive: true, force: true });
}

afterEach(cleanupProject);

function deploymentInput() {
  return {
    DEPLOY_ROOT: '/opt/example-service',
    service_name: 'example-service',
    artifact: {
      path: '/tmp/example.jar',
      type: 'jar',
      sha256: 'a'.repeat(64),
      version: '1.0.0'
    },
    config_path: '/opt/example-service/conf/application.env',
    runtime_target: 'host-process',
    lifecycle: {
      mode: 'manual-background',
      start: './bin/start.sh',
      stop: './bin/stop.sh',
      status: './bin/status.sh',
      readiness: 'http://127.0.0.1:8080/readyz',
      liveness: 'http://127.0.0.1:8080/healthz',
      smoke: './bin/smoke.sh'
    },
    migration: { exists: false },
    retention: 5
  };
}

async function createFinalAuditRun(runId) {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-deployment-adapter-'));
  const { FileFactStore } = await import('../src/fact-store.mjs');
  const store = new FileFactStore({ projectRoot });
  await store.createRun({ runId, taskTier: 'feature', intake: '增加收藏功能' });
  await store.updateRun(runId, { status: 'FINAL_AUDIT_PASSED' });
  return store;
}

test('最终审计后先生成部署 dry-run 并等待用户决策', async () => {
  const store = await createFinalAuditRun('RUN-DEPLOY-001');
  const { requestDeploymentDecision } = await import('../src/service-deployment-adapter.mjs');

  const result = await requestDeploymentDecision({ store, runId: 'RUN-DEPLOY-001' });
  const report = JSON.parse(await readFile(result.reportPath, 'utf8'));

  assert.equal(result.status, 'DEPLOYMENT_DECISION_REQUIRED');
  assert.equal(report.dry_run, true);
  assert.equal((await store.listPendingMessages('RUN-DEPLOY-001', 'service-deployment')).length, 0);
});

test('没有明确授权时不会发送真实部署请求', async () => {
  const store = await createFinalAuditRun('RUN-DEPLOY-002');
  const { dispatchServiceDeployment } = await import('../src/service-deployment-adapter.mjs');

  const result = await dispatchServiceDeployment({
    store,
    runId: 'RUN-DEPLOY-002',
    authorization: { approved: false },
    deploymentInput: deploymentInput()
  });

  assert.equal(result.status, 'DEPLOYMENT_DECISION_REQUIRED');
  assert.deepEqual(await store.listPendingMessages('RUN-DEPLOY-002', 'service-deployment'), []);
});

test('明确授权且部署参数完整时才发送 service-deployment 执行请求', async () => {
  const store = await createFinalAuditRun('RUN-DEPLOY-003');
  const { dispatchServiceDeployment } = await import('../src/service-deployment-adapter.mjs');

  const result = await dispatchServiceDeployment({
    store,
    runId: 'RUN-DEPLOY-003',
    authorization: { approved: true, operator: 'operator-a', reason: '用户明确要求发布' },
    deploymentInput: deploymentInput()
  });

  assert.equal(result.status, 'DEPLOYMENT_REQUESTED');
  const pending = await store.listPendingMessages('RUN-DEPLOY-003', 'service-deployment');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].action, 'execute');
  assert.equal(pending[0].to, 'service-deployment');
});
