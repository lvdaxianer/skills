import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

const TEST_HOST = '127.0.0.1';
let testRoot;
let server;
let store;

/**
 * 创建知识 API 测试资源。
 *
 * @returns {Promise<void>} 初始化完成
 * @author lvdaxianer@yeah.net
 */
async function createResources() {
  testRoot = await mkdtemp(join(tmpdir(), 'product-knowledge-api-'));
  const projectRoot = join(testRoot, 'project');
  const sharedKnowledgeRoot = join(testRoot, 'shared');
  await mkdir(projectRoot);
  await mkdir(sharedKnowledgeRoot);
  const { createControlPlaneServer } = await import('../src/server.mjs');
  const { KnowledgeStore } = await import('../src/knowledge-governance.mjs');
  store = new KnowledgeStore({ projectRoot, sharedKnowledgeRoot });
  server = createControlPlaneServer({
    host: TEST_HOST,
    port: 0,
    projectRoot,
    sharedKnowledgeRoot,
    serviceVersion: 'test-version'
  });
  await new Promise((resolve) => server.listen(0, TEST_HOST, resolve));
}

/**
 * 关闭 API 测试服务。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupResources() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await rm(testRoot, { recursive: true, force: true });
}

/**
 * 请求控制平面 API。
 *
 * @param {string} path 请求路径
 * @param {object} options fetch 配置
 * @returns {Promise<{response: Response, body: object|string}>} 响应
 * @author lvdaxianer@yeah.net
 */
async function request(path, options = {}) {
  const address = server.address();
  const response = await fetch(`http://${address.address}:${address.port}${path}`, options);
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

/**
 * 返回测试错误事件。
 *
 * @param {string} eventId 事件 ID
 * @returns {object} 错误事件
 * @author lvdaxianer@yeah.net
 */
function errorEvent(eventId) {
  return {
    eventId,
    runId: 'RUN-UI-001',
    featureId: 'FEATURE-UI-001',
    acceptanceId: 'AC-UI-001',
    title: '控制台问题',
    description: '需要人工归属',
    phase: 'verification',
    severity: 'high',
    evidenceRefs: ['evidence://ui/001']
  };
}

beforeEach(createResources);
afterEach(cleanupResources);

test('控制台首页和知识列表 API 可访问', async () => {
  await store.recordError(errorEvent('ERR-UI-001'));
  const page = await request('/');
  const list = await request('/api/knowledge');

  assert.equal(page.response.status, 200);
  assert.match(page.body, /知识归属管理/);
  assert.match(page.body, /已加载 1 条记录/);
  assert.doesNotMatch(page.body, /<%= pageTitle %>/);
  assert.equal(list.response.status, 200);
  assert.equal(list.body.items[0].scope, 'unknown');
});

test('人工编辑归属并排除时要求操作者和原因', async () => {
  await store.recordError(errorEvent('ERR-UI-002'));
  const edited = await request('/api/knowledge/ERR-UI-002', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scope: 'project',
      severity: 'medium',
      solution: '写入项目适配层',
      operator: 'human-reviewer',
      reason: '依赖当前项目 API'
    })
  });
  const excluded = await request('/api/knowledge/ERR-UI-002/exclude', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operator: 'human-reviewer', reason: '确认是重复噪音' })
  });
  const invalid = await request('/api/knowledge/ERR-UI-002', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scope: 'common' })
  });

  assert.equal(edited.response.status, 200);
  assert.equal(edited.body.scope, 'project');
  assert.equal(edited.body.decisionSource, 'human');
  assert.equal(excluded.response.status, 200);
  assert.equal(excluded.body.lifecycle, 'excluded');
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.errorCode, 'CONTROL_PLANE_INPUT_INVALID');
});

test('公共发布 API 继续执行晋升门禁', async () => {
  await store.recordError(errorEvent('ERR-UI-003'));
  await request('/api/knowledge/ERR-UI-003', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scope: 'common',
      rootCause: '通用输入校验缺失',
      solution: '增加入口边界校验',
      operator: 'human-reviewer',
      reason: '候选可脱离项目复用'
    })
  });
  const blocked = await request('/api/knowledge/ERR-UI-003/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operator: 'human-reviewer', reason: '证据不足' })
  });
  const published = await request('/api/knowledge/ERR-UI-003/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      operator: 'human-reviewer',
      reason: '已通过公共复检',
      sanitized: true,
      portable: true,
      independentReproductions: 2,
      reviewedBy: ['product-reviewer', 'engineering-reviewer']
    })
  });

  assert.equal(blocked.response.status, 422);
  assert.equal(blocked.body.errorCode, 'KNOWLEDGE_PROMOTION_BLOCKED');
  assert.equal(published.response.status, 200);
  assert.equal(published.body.scope, 'common');
});
