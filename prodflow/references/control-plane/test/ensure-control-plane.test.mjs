import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

const TEST_HOST = '127.0.0.1';
const SERVICE_VERSION = 'test-version';

let testRoot;
let runningProcesses;
let foreignServer;

/**
 * 创建启动器测试所需的项目目录和运行目录。
 *
 * @returns {Promise<object>} 测试配置
 * @author lvdaxianer@yeah.net
 */
async function createTestConfig() {
  testRoot = await mkdtemp(join(tmpdir(), 'product-control-plane-ensure-'));
  const projectRoot = join(testRoot, 'project');
  const sharedKnowledgeRoot = join(testRoot, 'shared');
  const runtimeRoot = join(testRoot, 'run');
  await mkdir(projectRoot);
  await mkdir(sharedKnowledgeRoot);
  await mkdir(runtimeRoot);
  return {
    host: TEST_HOST,
    port: await getFreePort(),
    projectRoot,
    sharedKnowledgeRoot,
    runtimeRoot,
    serviceVersion: SERVICE_VERSION
  };
}

/**
 * 获取一个可用于测试的本地端口。
 *
 * @returns {Promise<number>} 空闲端口
 * @author lvdaxianer@yeah.net
 */
async function getFreePort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, TEST_HOST, resolve));
  const address = probe.address();
  const port = address.port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

/**
 * 关闭测试启动的子进程和占用端口的外部服务。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupResources() {
  for (const child of runningProcesses) {
    child.kill('SIGTERM');
  }
  await Promise.all(runningProcesses.map((child) => waitForExit(child)));
  runningProcesses = [];
  if (foreignServer) {
    await new Promise((resolve) => foreignServer.close(resolve));
    foreignServer = undefined;
  }
  await rm(testRoot, { recursive: true, force: true });
}

/**
 * 等待子进程退出，避免测试遗留服务。
 *
 * @param {import('node:child_process').ChildProcess} child 子进程
 * @returns {Promise<void>} 进程已退出
 * @author lvdaxianer@yeah.net
 */
function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => child.once('exit', resolve));
}

beforeEach(() => {
  runningProcesses = [];
  foreignServer = undefined;
});

afterEach(cleanupResources);

test('服务未运行时自动启动并写入运行元数据', async () => {
  const { ensureControlPlane } = await import('../src/ensure-control-plane.mjs');
  const config = await createTestConfig();

  const result = await ensureControlPlane(config);
  runningProcesses.push(result.process);

  assert.equal(result.status, 'started');
  assert.equal(result.metadata.projectRoot, config.projectRoot);
  assert.equal(result.metadata.sharedKnowledgeRoot, config.sharedKnowledgeRoot);
  assert.equal(result.metadata.serviceVersion, SERVICE_VERSION);
  assert.equal(typeof result.metadata.pid, 'number');
  assert.equal(result.metadata.port, config.port);
});

test('同项目绑定的服务实例可以复用', async () => {
  const { ensureControlPlane } = await import('../src/ensure-control-plane.mjs');
  const config = await createTestConfig();
  const first = await ensureControlPlane(config);
  runningProcesses.push(first.process);

  const second = await ensureControlPlane(config);

  assert.equal(second.status, 'reused');
  assert.equal(second.metadata.pid, first.metadata.pid);
  assert.equal(second.metadata.port, first.metadata.port);
  assert.equal(second.process, undefined);
});

test('已绑定其他项目的服务不会被复用或终止', async () => {
  const { ensureControlPlane, ControlPlaneBlockedError } = await import('../src/ensure-control-plane.mjs');
  const config = await createTestConfig();
  const first = await ensureControlPlane(config);
  runningProcesses.push(first.process);
  const otherRoot = join(testRoot, 'other-project');
  await mkdir(otherRoot);

  await assert.rejects(
    () => ensureControlPlane({ ...config, projectRoot: otherRoot }),
    (error) => error instanceof ControlPlaneBlockedError && error.code === 'CONTROL_PLANE_PROJECT_MISMATCH'
  );
  assert.equal(first.process.exitCode, null);
});

test('未知服务占用端口时报告冲突且不终止未知服务', async () => {
  const { ensureControlPlane, ControlPlaneBlockedError } = await import('../src/ensure-control-plane.mjs');
  const config = await createTestConfig();
  foreignServer = createServer((request, response) => response.end('foreign'));
  await new Promise((resolve) => foreignServer.listen(config.port, TEST_HOST, resolve));

  await assert.rejects(
    () => ensureControlPlane(config),
    (error) => error instanceof ControlPlaneBlockedError && error.code === 'CONTROL_PLANE_PORT_CONFLICT'
  );
  assert.equal(foreignServer.listening, true);
});
