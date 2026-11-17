import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let projectRoot;

/**
 * 清理证据测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(projectRoot, { recursive: true, force: true });
}

afterEach(cleanupProject);

/**
 * 创建验收契约测试输入。
 *
 * @returns {Promise<object>} 证据存储和契约
 * @author lvdaxianer@yeah.net
 */
async function createVerification() {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-verification-'));
  const { VerificationStore } = await import('../src/verification-evidence.mjs');
  const store = new VerificationStore({ projectRoot });
  const contracts = await store.createContracts('RUN-VERIFY-001', 'FEATURE-001', [
    { id: 'AC-001', content: '命令测试通过', verificationType: 'command', verification: 'npm test' },
    { id: 'AC-002', content: 'API 返回成功', verificationType: 'api', verification: 'GET /healthz' },
    {
      id: 'AC-003',
      content: '浏览器流程完成',
      verificationType: 'browser',
      verification: '浏览器操作和断言'
    }
  ]);
  return { store, contracts };
}

test('每个验收标准独立生成验证契约和证据记录', async () => {
  const { store, contracts } = await createVerification();
  assert.equal(contracts.length, 3);
  assert.deepEqual(contracts.map((item) => item.acceptanceId), ['AC-001', 'AC-002', 'AC-003']);
  const evidence = await store.recordEvidence('RUN-VERIFY-001', {
    acceptanceId: 'AC-001',
    type: 'command',
    command: 'npm test',
    expected: 'exit code 0',
    actual: 'exit code 0',
    status: 'passed',
    exitCode: 0,
    commit: 'abc123'
  });
  assert.equal(evidence.acceptanceId, 'AC-001');
});

test('缺少浏览器截图或 URL 时只能得到 INCONCLUSIVE', async () => {
  const { store } = await createVerification();
  await store.recordEvidence('RUN-VERIFY-001', {
    acceptanceId: 'AC-001', type: 'command', command: 'npm test', expected: '通过', actual: '通过',
    status: 'passed', exitCode: 0, commit: 'abc123'
  });
  await store.recordEvidence('RUN-VERIFY-001', {
    acceptanceId: 'AC-002', type: 'api', command: 'GET /healthz', expected: '200', actual: '200',
    status: 'passed', apiSummary: { status: 200 }, commit: 'abc123'
  });
  await store.recordEvidence('RUN-VERIFY-001', {
    acceptanceId: 'AC-003', type: 'browser', command: '打开页面并提交表单', expected: '页面显示成功',
    actual: '页面显示成功', status: 'passed', pageUrl: 'http://127.0.0.1:43200/', actions: ['点击提交'],
    assertions: ['显示成功'], commit: 'abc123'
  });

  const result = await store.evaluate('RUN-VERIFY-001', { currentCommit: 'abc123' });

  assert.equal(result.status, 'INCONCLUSIVE');
  assert.match(result.reasons.join('；'), /截图/);
});

test('所有验收证据完整且绑定当前 commit 才能 VERIFIED', async () => {
  const { store } = await createVerification();
  await store.recordEvidence('RUN-VERIFY-001', {
    acceptanceId: 'AC-001', type: 'command', command: 'npm test', expected: '通过', actual: '通过',
    status: 'passed', exitCode: 0, commit: 'abc123'
  });
  await store.recordEvidence('RUN-VERIFY-001', {
    acceptanceId: 'AC-002', type: 'api', command: 'GET /healthz', expected: '200', actual: '200',
    status: 'passed', apiSummary: { status: 200 }, commit: 'abc123'
  });
  await store.recordEvidence('RUN-VERIFY-001', {
    acceptanceId: 'AC-003', type: 'browser', command: '打开页面并提交表单', expected: '页面显示成功',
    actual: '页面显示成功', status: 'passed', pageUrl: 'http://127.0.0.1:43200/', actions: ['点击提交'],
    assertions: ['显示成功'], screenshotRefs: ['/tmp/screenshot.png'], traceRef: 'trace://001',
    consoleSummary: { errors: 0 }, networkSummary: { failed: 0 }, commit: 'abc123'
  });

  const result = await store.evaluate('RUN-VERIFY-001', { currentCommit: 'abc123' });
  const bundlePath = join(
    projectRoot,
    '.product',
    'runs',
    'RUN-VERIFY-001',
    'verification',
    'verification-bundle.json'
  );
  const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));

  assert.equal(result.status, 'VERIFIED');
  assert.equal(bundle.status, 'VERIFIED');
  assert.equal(bundle.evidenceRefs.length, 3);
});

test('证据绑定其他 commit 时不得标记成功', async () => {
  const { store } = await createVerification();
  for (const acceptanceId of ['AC-001', 'AC-002', 'AC-003']) {
    await store.recordEvidence('RUN-VERIFY-001', {
      acceptanceId,
      type: acceptanceId === 'AC-003' ? 'browser' : acceptanceId === 'AC-002' ? 'api' : 'command',
      command: '验证命令',
      expected: '通过',
      actual: '通过',
      status: 'passed',
      exitCode: 0,
      apiSummary: acceptanceId === 'AC-002' ? { status: 200 } : undefined,
      pageUrl: 'http://127.0.0.1:43200/',
      actions: ['操作'],
      assertions: ['断言'],
      screenshotRefs: ['/tmp/screenshot.png'],
      commit: 'old-commit'
    });
  }

  const result = await store.evaluate('RUN-VERIFY-001', { currentCommit: 'new-commit' });

  assert.equal(result.status, 'INCONCLUSIVE');
  assert.match(result.reasons.join('；'), /commit/);
});

