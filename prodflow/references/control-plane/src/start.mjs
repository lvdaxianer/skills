import { parseArgs } from 'node:util';
import { createControlPlaneServer } from './server.mjs';
import { normalizeConfig } from './config.mjs';
import { writeRuntimeMetadata, removeOwnedRuntimeMetadata } from './runtime.mjs';

const ARGUMENT_OPTIONS = {
  host: { type: 'string' },
  port: { type: 'string' },
  projectRoot: { type: 'string' },
  sharedKnowledgeRoot: { type: 'string' },
  runtimeRoot: { type: 'string' },
  serviceVersion: { type: 'string' }
};

/**
 * 启动独立的控制平面子进程。
 *
 * @returns {Promise<void>} 服务启动流程
 * @author lvdaxianer@yeah.net
 */
async function main() {
  const options = parseArgs({ options: ARGUMENT_OPTIONS, strict: true }).values;
  const config = normalizeConfig({ ...options, port: Number(options.port) });
  const runtimeRoot = requireRuntimeRoot(options.runtimeRoot);
  const server = createControlPlaneServer(config);
  server.on('error', () => process.exit(1));
  server.listen(config.port, config.host, () => completeStartup(server, config, runtimeRoot));
}

/**
 * 完成监听后的元数据写入和信号处理安装。
 *
 * @param {import('node:http').Server} server HTTP 服务
 * @param {Readonly<object>} config 服务配置
 * @param {string} runtimeRoot 运行目录
 * @returns {Promise<void>} 初始化完成
 * @author lvdaxianer@yeah.net
 */
async function completeStartup(server, config, runtimeRoot) {
  try {
    const address = server.address();
    const metadata = createRuntimeMetadata(config, address);
    await writeRuntimeMetadata(runtimeRoot, metadata);
    installSignalHandlers(server, runtimeRoot);
  } catch {
    server.close(() => process.exit(1));
  }
}

/**
 * 创建可审计的运行元数据。
 *
 * @param {Readonly<object>} config 服务配置
 * @param {object} address 监听地址
 * @returns {object} 运行元数据
 * @author lvdaxianer@yeah.net
 */
function createRuntimeMetadata(config, address) {
  return {
    service: 'product-control-plane',
    serviceVersion: config.serviceVersion,
    projectRoot: config.projectRoot,
    sharedKnowledgeRoot: config.sharedKnowledgeRoot,
    host: address.address,
    port: address.port,
    pid: process.pid,
    managedBy: 'prodflow',
    startedAt: new Date().toISOString()
  };
}

/**
 * 安装只清理当前进程运行元数据的终止处理。
 *
 * @param {import('node:http').Server} server HTTP 服务
 * @param {string} runtimeRoot 运行目录
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function installSignalHandlers(server, runtimeRoot) {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => shutdown(server, runtimeRoot));
  }
}

/**
 * 关闭服务并移除当前进程的运行元数据。
 *
 * @param {import('node:http').Server} server HTTP 服务
 * @param {string} runtimeRoot 运行目录
 * @returns {Promise<void>} 关闭完成
 * @author lvdaxianer@yeah.net
 */
async function shutdown(server, runtimeRoot) {
  await new Promise((resolve) => server.close(resolve));
  await removeOwnedRuntimeMetadata(runtimeRoot, process.pid);
  process.exit(0);
}

/**
 * 验证运行目录参数。
 *
 * @param {string|undefined} runtimeRoot 运行目录
 * @returns {string} 运行目录
 * @throws {TypeError} 参数缺失时抛出
 * @author lvdaxianer@yeah.net
 */
function requireRuntimeRoot(runtimeRoot) {
  if (typeof runtimeRoot !== 'string' || runtimeRoot.length === 0) {
    throw new TypeError('运行目录不能为空');
  }
  return runtimeRoot;
}

main().catch(() => process.exit(1));
