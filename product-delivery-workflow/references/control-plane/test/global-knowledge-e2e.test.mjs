import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { createControlPlaneServer } from '../src/server.mjs';

let root;
let server;

/**
 * 关闭端到端测试服务并清理临时事实源。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
  server = undefined;
  root = undefined;
});

/**
 * 启动临时控制平面服务。
 *
 * @returns {Promise<string>} 服务地址
 * @author lvdaxianer@yeah.net
 */
async function startServer() {
  root = await mkdtemp(join(tmpdir(), 'global-knowledge-e2e-'));
  server = createControlPlaneServer({
    host: '127.0.0.1',
    port: 0,
    projectRoot: join(root, 'current-project'),
    sharedKnowledgeRoot: join(root, 'shared')
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

/**
 * 请求 JSON 控制平面接口。
 *
 * @param {string} baseUrl 服务地址
 * @param {string} path 请求路径
 * @param {RequestInit} options 请求配置
 * @returns {Promise<{status: number, body: object}>} 响应
 * @author lvdaxianer@yeah.net
 */
async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) }
  });
  return { status: response.status, body: await response.json() };
}

/**
 * 请求 HTML 控制台页面。
 *
 * @param {string} baseUrl 服务地址
 * @returns {Promise<{status: number, body: string}>} 页面响应
 * @author lvdaxianer@yeah.net
 */
async function requestPage(baseUrl) {
  const response = await fetch(`${baseUrl}/`);
  return { status: response.status, body: await response.text() };
}

/**
 * 注册一个测试项目并验证注册结果。
 *
 * @param {string} baseUrl 服务地址
 * @param {string} projectId 项目 ID
 * @returns {Promise<void>} 注册完成
 * @author lvdaxianer@yeah.net
 */
async function registerProject(baseUrl, projectId) {
  const result = await requestJson(baseUrl, '/api/global/projects', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      projectRoot: join(root, projectId),
      name: projectId
    })
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.syncStatus.status, 'synced');
}

/**
 * 写入一条项目规则并验证文件事实已投影。
 *
 * @param {string} baseUrl 服务地址
 * @param {string} projectId 项目 ID
 * @param {string} eventId 事件 ID
 * @param {string} solution 规则方案
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function createRule(baseUrl, projectId, eventId, solution) {
  const result = await requestJson(baseUrl, '/api/global/problems', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      problem: { eventId, title: '跨项目规则', solution, ruleKey: 'shared-rule' },
      operator: 'e2e-reviewer',
      reason: '端到端一致性验证'
    })
  });
  assert.equal(result.status, 201);
  assert.match(result.body.operationId, /^OP-/);
  assert.equal(result.body.syncStatus.status, 'synced');
}

test('多项目治理、迁移、重建和控制台页面保持最终一致', async () => {
  const baseUrl = await startServer();
  await registerProject(baseUrl, 'PROJECT-A');
  await registerProject(baseUrl, 'PROJECT-B');
  await createRule(baseUrl, 'PROJECT-A', 'RULE-A', '方案 A');
  await createRule(baseUrl, 'PROJECT-B', 'RULE-B', '方案 B');

  const listed = await requestJson(baseUrl, '/api/global/problems');
  assert.equal(listed.status, 200);
  assert.equal(listed.body.items.length, 2);
  assert.equal(listed.body.isComplete, true);

  const diff = await requestJson(baseUrl, '/api/global/rules/diff?projects=PROJECT-A,PROJECT-B');
  assert.equal(diff.status, 200);
  assert.equal(diff.body.differences[0].ruleKey, 'shared-rule');
  assert.equal(diff.body.differences[0].projects.length, 2);

  const moved = await requestJson(baseUrl, '/api/global/problems/RULE-A/move', {
    method: 'POST',
    body: JSON.stringify({
      scope: 'common',
      operator: 'e2e-reviewer',
      reason: '验证公共归属迁移'
    })
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.body.item.scope, 'common');

  const projectRules = await requestJson(baseUrl, '/api/global/projects/PROJECT-A/rules');
  assert.equal(projectRules.status, 200);
  assert.equal(projectRules.body.items[0].relation, 'inherited');

  await rm(join(root, 'shared', 'control-plane', 'catalog.sqlite'));
  const rebuilt = await requestJson(baseUrl, '/api/global/sync/rebuild', { method: 'POST' });
  assert.equal(rebuilt.status, 200);
  assert.equal(rebuilt.body.replaced, true);
  assert.equal(rebuilt.body.status, 'synced');

  const afterRebuild = await requestJson(baseUrl, '/api/global/problems');
  assert.equal(afterRebuild.body.items.length, 2);
  assert.equal(afterRebuild.body.isComplete, true);
  const page = await requestPage(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.body, /全局知识治理控制台/);
  assert.match(page.body, /项目有效规则/);
  assert.match(page.body, /跨项目差异/);
});
