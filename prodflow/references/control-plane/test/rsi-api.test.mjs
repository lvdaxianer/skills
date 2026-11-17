import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createControlPlaneServer } from '../src/server.mjs';

let server;
let projectRoot;
let baseUrl;

test.beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), 'rsi-api-'));
  projectRoot = join(root, 'project');
  const sharedKnowledgeRoot = join(root, 'shared');
  const { mkdir } = await import('node:fs/promises');
  await Promise.all([mkdir(projectRoot), mkdir(sharedKnowledgeRoot)]);
  server = createControlPlaneServer({
    host: '127.0.0.1',
    port: 0,
    projectRoot,
    sharedKnowledgeRoot,
    serviceVersion: 'test-version'
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://${address.address}:${address.port}`;
});

test.afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    ...options
  });
}

test('准备 RSI 快照并可按 snapshotId 恢复', async () => {
  const prepared = await request('/api/rsi/snapshots', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'demo-project', runId: 'RUN-003', task: '验证截图' })
  });
  const preparedBody = await prepared.json();
  const restored = await request(`/api/rsi/snapshots/${preparedBody.snapshotId}`);
  const restoredBody = await restored.json();

  assert.equal(prepared.status, 201);
  assert.equal(preparedBody.projectId, 'demo-project');
  assert.ok(preparedBody.manifest.contentHash);
  assert.equal(restored.status, 200);
  assert.equal(restoredBody.snapshotId, preparedBody.snapshotId);
  assert.deepEqual(restoredBody.layers, preparedBody.layers);
});

test('反馈写回项目事实源并对相同 eventId 幂等', async () => {
  const prepared = await request('/api/rsi/snapshots', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'demo-project', runId: 'RUN-004', task: '测试失败' })
  });
  const snapshot = await prepared.json();
  const feedback = {
    eventId: 'RSI-FEEDBACK-001',
    snapshotId: snapshot.snapshotId,
    provider: 'claude',
    feedbackType: 'failure',
    runId: 'RUN-004',
    featureId: 'FEATURE-001',
    title: '浏览器截图缺失',
    description: '验收时没有保存截图',
    phase: 'verification',
    evidenceRefs: ['run://RUN-004/verification']
  };
  const first = await request('/api/rsi/feedback', { method: 'POST', body: JSON.stringify(feedback) });
  const second = await request('/api/rsi/feedback', { method: 'POST', body: JSON.stringify(feedback) });
  const firstBody = await first.json();
  const secondBody = await second.json();

  assert.equal(first.status, 201);
  assert.equal(firstBody.event.scope, 'unknown');
  assert.equal(firstBody.event.classificationStatus, 'pending');
  assert.equal(second.status, 200);
  assert.equal(secondBody.idempotent, true);
  assert.equal(secondBody.event.eventId, feedback.eventId);
  assert.match(await readFile(`${projectRoot}/.product/knowledge/events/${feedback.eventId}.json`, 'utf8'), /RSI-FEEDBACK-001/);
});

test('sourceHash 变化返回冲突并携带新快照引用', async () => {
  const response = await request('/api/rsi/snapshots', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'demo-project', sourceHash: 'stale-source-hash', task: '重试' })
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.errorCode, 'RSI_SOURCE_CONFLICT');
  assert.ok(body.snapshotId);
  assert.ok(body.sourceHash);
});

test('反馈引用不存在快照时返回稳定错误', async () => {
  const response = await request('/api/rsi/feedback', {
    method: 'POST',
    body: JSON.stringify({
      eventId: 'RSI-FEEDBACK-404',
      snapshotId: 'RSI-SNAPSHOT-missing',
      provider: 'codex',
      feedbackType: 'near_miss',
      runId: 'RUN-404',
      featureId: 'FEATURE-404',
      title: '不存在快照',
      description: '不能写入',
      phase: 'verification',
      evidenceRefs: []
    })
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.errorCode, 'RSI_SNAPSHOT_NOT_FOUND');
});

test('Worker 结果 API 接收 RSI 使用回报并支持重复提交', async () => {
  const prepared = await request('/api/rsi/snapshots', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'demo-project', runId: 'RUN-RESULT-001', task: '验证回传' })
  });
  const snapshot = await prepared.json();
  const result = {
    workerId: 'worker-a',
    snapshotId: snapshot.snapshotId,
    complete: true,
    rsiUsage: [{ itemId: 'CURRENT-TASK', stage: 'consulted', evidenceRefs: ['run://evidence'] }]
  };
  const first = await request('/api/rsi/runs/RUN-RESULT-001/worker-result', {
    method: 'POST', body: JSON.stringify(result)
  });
  const second = await request('/api/rsi/runs/RUN-RESULT-001/worker-result', {
    method: 'POST', body: JSON.stringify(result)
  });
  const firstBody = await first.json();
  const secondBody = await second.json();

  assert.equal(first.status, 201);
  assert.equal(firstBody.accepted, 1);
  assert.equal(firstBody.finalized, true);
  assert.equal(second.status, 201);
  assert.equal(secondBody.results[0].idempotent, true);
});
