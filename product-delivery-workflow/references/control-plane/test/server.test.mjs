import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

const TEST_HOST = '127.0.0.1';
const TEST_PORT = 0;

let testRoot;
let server;

/**
 * 创建控制平面测试目录。
 *
 * @returns {Promise<{projectRoot: string, sharedKnowledgeRoot: string}>} 测试目录
 * @author lvdaxianer@yeah.net
 */
async function createTestDirectories() {
  testRoot = await mkdtemp(join(tmpdir(), 'product-control-plane-'));
  const projectRoot = join(testRoot, 'project');
  const sharedKnowledgeRoot = join(testRoot, 'shared');
  await mkdir(projectRoot);
  await mkdir(sharedKnowledgeRoot);
  return { projectRoot, sharedKnowledgeRoot };
}

/**
 * 关闭测试服务并清理临时目录。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupTestResources() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await rm(testRoot, { recursive: true, force: true });
}

beforeEach(async () => {
  const { createControlPlaneServer } = await import('../src/server.mjs');
  const directories = await createTestDirectories();
  server = createControlPlaneServer({
    host: TEST_HOST,
    port: TEST_PORT,
    ...directories,
    serviceVersion: 'test-version'
  });
  await new Promise((resolve) => server.listen(TEST_PORT, TEST_HOST, resolve));
});

afterEach(cleanupTestResources);

/**
 * 请求测试服务。
 *
 * @param {string} path 请求路径
 * @returns {Promise<Response>} HTTP 响应
 * @author lvdaxianer@yeah.net
 */
function request(path) {
  const address = server.address();
  return fetch(`http://${address.address}:${address.port}${path}`);
}

test('健康检查返回服务存活状态', async () => {
  const response = await request('/healthz');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'product-control-plane'
  });
});

test('就绪检查返回当前项目绑定信息', async () => {
  const response = await request('/readyz');
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ready');
  assert.equal(body.serviceVersion, 'test-version');
  assert.match(body.projectRoot, /product-control-plane-/);
});

test('项目目录失效时就绪检查返回服务不可用', async () => {
  const address = server.address();
  await rm(testRoot, { recursive: true, force: true });
  const response = await fetch(`http://${address.address}:${address.port}/readyz`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, 'not_ready');
  assert.equal(body.errorCode, 'CONTROL_PLANE_NOT_READY');
});

test('未知路径返回稳定的未找到错误', async () => {
  const response = await request('/unknown');
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.errorCode, 'CONTROL_PLANE_ROUTE_NOT_FOUND');
});

test('非本地回环地址或缺少目录时拒绝创建服务', async () => {
  const { createControlPlaneServer } = await import('../src/server.mjs');

  assert.throws(
    () => createControlPlaneServer({
      host: '0.0.0.0',
      port: TEST_PORT,
      projectRoot: '/tmp/project',
      sharedKnowledgeRoot: '/tmp/shared'
    }),
    TypeError
  );
  assert.throws(
    () => createControlPlaneServer({
      host: TEST_HOST,
      port: TEST_PORT,
      projectRoot: '',
      sharedKnowledgeRoot: '/tmp/shared'
    }),
    TypeError
  );
});
