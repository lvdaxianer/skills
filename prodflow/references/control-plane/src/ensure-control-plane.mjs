import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeConfig } from './config.mjs';
import { SERVICE_NAME } from './constants.mjs';
import { readRuntimeMetadata } from './runtime.mjs';

const START_TIMEOUT_MS = 5000;
const PROBE_TIMEOUT_MS = 300;
const PORT_PROBE_TIMEOUT_MS = 300;
const POLL_INTERVAL_MS = 50;
const START_SCRIPT = fileURLToPath(new URL('./start.mjs', import.meta.url));

/**
 * 表示控制平面不能安全复用或启动的阻塞错误。
 *
 * @author lvdaxianer@yeah.net
 */
export class ControlPlaneBlockedError extends Error {
  /**
   * 创建带稳定错误码的阻塞错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'ControlPlaneBlockedError';
    this.code = code;
  }
}

/**
 * 确保当前项目拥有可验证的控制平面实例。
 *
 * @param {object} options 启动与绑定配置
 * @returns {Promise<object>} 启动或复用结果
 * @throws {ControlPlaneBlockedError} 存在不安全冲突时抛出
 * @author lvdaxianer@yeah.net
 */
export async function ensureControlPlane(options) {
  const config = normalizeLauncherConfig(options);
  const existing = await inspectExistingInstance(config);
  if (existing) {
    return existing;
  }
  return startManagedInstance(config);
}

/**
 * 规范化启动器配置并固定绑定路径。
 *
 * @param {object} options 原始配置
 * @returns {Readonly<object>} 启动器配置
 * @author lvdaxianer@yeah.net
 */
function normalizeLauncherConfig(options = {}) {
  const config = normalizeConfig(options);
  if (!Number.isInteger(config.port) || config.port === 0) {
    throw new TypeError('启动器必须使用固定端口');
  }
  if (typeof options.runtimeRoot !== 'string' || options.runtimeRoot.length === 0) {
    throw new TypeError('运行目录不能为空');
  }
  return Object.freeze({
    ...config,
    projectRoot: resolve(config.projectRoot),
    sharedKnowledgeRoot: resolve(config.sharedKnowledgeRoot),
    runtimeRoot: resolve(options.runtimeRoot)
  });
}

/**
 * 检查现有服务是否可安全复用。
 *
 * @param {Readonly<object>} config 启动器配置
 * @returns {Promise<object|undefined>} 复用结果或未发现服务
 * @throws {ControlPlaneBlockedError} 发现不匹配的占用服务
 * @author lvdaxianer@yeah.net
 */
async function inspectExistingInstance(config) {
  const probe = await requestReady(config);
  if (!probe.reachable) {
    return undefined;
  }
  const runtime = await readRuntimeMetadata(config.runtimeRoot);
  if (isMatchingInstance(probe.body, runtime, config)) {
    return { status: 'reused', metadata: runtime };
  }
  throw createConflictError(probe.body, config);
}

/**
 * 启动受控子进程并等待健康与就绪检查完成。
 *
 * @param {Readonly<object>} config 启动器配置
 * @returns {Promise<object>} 启动结果
 * @throws {ControlPlaneBlockedError} 启动失败或端口冲突时抛出
 * @author lvdaxianer@yeah.net
 */
async function startManagedInstance(config) {
  const child = spawn(process.execPath, buildStartArguments(config), {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  return waitForManagedInstance(child, config);
}

/**
 * 等待子进程写入元数据并通过就绪检查。
 *
 * @param {import('node:child_process').ChildProcess} child 控制平面进程
 * @param {Readonly<object>} config 启动器配置
 * @returns {Promise<object>} 启动结果
 * @throws {ControlPlaneBlockedError} 等待超时或端口冲突时抛出
 * @author lvdaxianer@yeah.net
 */
async function waitForManagedInstance(child, config) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const runtime = await readRuntimeMetadata(config.runtimeRoot);
    const probe = await requestReady(config);
    if (runtime && isMatchingInstance(probe.body, runtime, config)) {
      return { status: 'started', metadata: runtime, process: child };
    }
    if (child.exitCode !== null) {
      throw await createStartError(config);
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw await createStartError(config);
}

/**
 * 构建独立服务的命令行参数。
 *
 * @param {Readonly<object>} config 启动器配置
 * @returns {string[]} 命令行参数
 * @author lvdaxianer@yeah.net
 */
function buildStartArguments(config) {
  return [
    START_SCRIPT,
    '--host', config.host,
    '--port', String(config.port),
    '--projectRoot', config.projectRoot,
    '--sharedKnowledgeRoot', config.sharedKnowledgeRoot,
    '--runtimeRoot', config.runtimeRoot,
    '--serviceVersion', config.serviceVersion
  ];
}

/**
 * 判断就绪响应和运行元数据是否绑定到当前项目。
 *
 * @param {object|undefined} body 就绪响应体
 * @param {object|undefined} runtime 运行元数据
 * @param {Readonly<object>} config 当前配置
 * @returns {boolean} 是否匹配
 * @author lvdaxianer@yeah.net
 */
function isMatchingInstance(body, runtime, config) {
  return Boolean(
    body?.status === 'ready'
      && body.service === SERVICE_NAME
      && body.serviceVersion === config.serviceVersion
      && body.projectRoot === config.projectRoot
      && body.sharedKnowledgeRoot === config.sharedKnowledgeRoot
      && runtime?.pid === body.pid
      && runtime.projectRoot === config.projectRoot
      && runtime.port === config.port
  );
}

/**
 * 将现有占用转换为稳定阻塞错误。
 *
 * @param {object|undefined} body 就绪响应体
 * @param {Readonly<object>} config 当前配置
 * @returns {ControlPlaneBlockedError} 阻塞错误
 * @author lvdaxianer@yeah.net
 */
function createConflictError(body, config) {
  if (body?.service === SERVICE_NAME && body.projectRoot !== config.projectRoot) {
    return new ControlPlaneBlockedError('CONTROL_PLANE_PROJECT_MISMATCH', '控制平面已绑定其他项目');
  }
  return new ControlPlaneBlockedError('CONTROL_PLANE_PORT_CONFLICT', '配置端口已被未知服务占用');
}

/**
 * 创建启动失败错误，并区分可检测的端口冲突。
 *
 * @param {Readonly<object>} config 当前配置
 * @returns {Promise<ControlPlaneBlockedError>} 稳定错误
 * @author lvdaxianer@yeah.net
 */
async function createStartError(config) {
  const probe = await requestReady(config);
  if (probe.reachable || await isPortOccupied(config)) {
    return createConflictError(probe.body, config);
  }
  return new ControlPlaneBlockedError('CONTROL_PLANE_START_FAILED', '控制平面未能在限定时间内就绪');
}

/**
 * 通过 TCP 连接判断端口是否被任意进程占用。
 *
 * @param {Readonly<object>} config 当前配置
 * @returns {Promise<boolean>} 端口被占用时返回 true
 * @author lvdaxianer@yeah.net
 */
function isPortOccupied(config) {
  return new Promise((resolveOccupied) => {
    const socket = createConnection({ host: config.host, port: config.port });
    const finish = (occupied) => {
      socket.destroy();
      resolveOccupied(occupied);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(PORT_PROBE_TIMEOUT_MS, () => finish(true));
  });
}

/**
 * 请求服务就绪端点并隐藏网络异常细节。
 *
 * @param {Readonly<object>} config 当前配置
 * @returns {Promise<object>} 可判断的探测结果
 * @author lvdaxianer@yeah.net
 */
async function requestReady(config) {
  try {
    const response = await fetch(`http://${config.host}:${config.port}/readyz`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
    });
    return { reachable: true, body: await response.json() };
  } catch {
    return { reachable: false, body: undefined };
  }
}

/**
 * 延迟下一轮就绪探测。
 *
 * @param {number} milliseconds 延迟毫秒数
 * @returns {Promise<void>} 延迟完成
 * @author lvdaxianer@yeah.net
 */
function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
