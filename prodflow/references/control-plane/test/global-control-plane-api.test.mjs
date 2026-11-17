import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { createControlPlaneServer } from '../src/server.mjs';

let root;
let server;

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

async function startServer() {
  root = await mkdtemp(join(tmpdir(), 'global-control-plane-api-'));
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

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) }
  });
  return { status: response.status, body: await response.json() };
}

test('全局 API 支持项目注册、问题创建和同步状态响应', async () => {
  const baseUrl = await startServer();
  const projectRoot = join(root, 'project-a');
  const project = await request(baseUrl, '/api/global/projects', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'PROJECT-A', projectRoot, name: '项目 A' })
  });
  assert.equal(project.status, 201);
  const created = await request(baseUrl, '/api/global/problems', {
    method: 'POST',
    body: JSON.stringify({
      projectId: 'PROJECT-A',
      problem: { eventId: 'EVENT-HTTP', title: 'HTTP 问题', solution: '解决方案' },
      operator: 'alice',
      reason: '接口录入'
    })
  });
  assert.equal(created.status, 201);
  assert.match(created.body.operationId, /^OP-/);
  assert.equal(created.body.syncStatus.status, 'synced');

  const listed = await request(baseUrl, '/api/global/problems?projectId=PROJECT-A');
  assert.equal(listed.status, 200);
  assert.equal(listed.body.items[0].itemId, 'EVENT-HTTP');
  assert.equal(listed.body.isComplete, true);
});

test('全局问题列表支持 limit offset 分页和 total 统计', async () => {
  const baseUrl = await startServer();
  const project = await request(baseUrl, '/api/global/projects', {
    method: 'POST',
    body: JSON.stringify({ projectId: 'PROJECT-A', projectRoot: join(root, 'project-a'), name: '项目 A' })
  });
  assert.equal(project.status, 201);
  for (let index = 1; index <= 3; index += 1) {
    const created = await request(baseUrl, '/api/global/problems', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'PROJECT-A',
        problem: { eventId: `EVENT-PAGE-${index}`, title: `分页问题 ${index}` },
        operator: 'alice',
        reason: '分页测试'
      })
    });
    assert.equal(created.status, 201);
  }

  const firstPage = await request(baseUrl, '/api/global/problems?limit=2&offset=0');
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body.items.length, 2);
  assert.equal(firstPage.body.total, 3);
  assert.equal(firstPage.body.limit, 2);

  const secondPage = await request(baseUrl, '/api/global/problems?limit=2&offset=2');
  assert.equal(secondPage.body.items.length, 1);
  assert.equal(secondPage.body.items[0].itemId, 'EVENT-PAGE-3');

  const unbounded = await request(baseUrl, '/api/global/problems');
  assert.equal(unbounded.body.items.length, 3);
  assert.equal(unbounded.body.total, 3);
});

test('全局 API 返回项目规则和跨项目差异', async () => {
  const baseUrl = await startServer();
  for (const projectId of ['PROJECT-A', 'PROJECT-B']) {
    const project = await request(baseUrl, '/api/global/projects', {
      method: 'POST',
      body: JSON.stringify({ projectId, projectRoot: join(root, projectId), name: projectId })
    });
    assert.equal(project.status, 201);
  }
  await request(baseUrl, '/api/global/problems', {
    method: 'POST',
    body: JSON.stringify({
      projectId: 'PROJECT-A',
      problem: { eventId: 'RULE-A', title: '规则', solution: 'A', ruleKey: 'same-rule' },
      operator: 'alice',
      reason: '规则录入'
    })
  });
  const rules = await request(baseUrl, '/api/global/projects/PROJECT-A/rules');
  assert.equal(rules.status, 200);
  assert.equal(rules.body.items[0].relation, 'project');
  const diff = await request(baseUrl, '/api/global/rules/diff?projects=PROJECT-A,PROJECT-B');
  assert.equal(diff.status, 200);
  assert.equal(diff.body.differences[0].ruleKey, 'same-rule');
});
