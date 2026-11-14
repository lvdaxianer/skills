import { readFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const RUNTIME_FILE_NAME = 'runtime.json';

/**
 * 返回控制平面运行元数据文件路径。
 *
 * @param {string} runtimeRoot 运行目录
 * @returns {string} 运行元数据路径
 * @author lvdaxianer@yeah.net
 */
export function getRuntimePath(runtimeRoot) {
  return join(runtimeRoot, RUNTIME_FILE_NAME);
}

/**
 * 读取运行元数据；缺失或损坏的文件视为不可复用。
 *
 * @param {string} runtimeRoot 运行目录
 * @returns {Promise<object|undefined>} 运行元数据
 * @author lvdaxianer@yeah.net
 */
export async function readRuntimeMetadata(runtimeRoot) {
  try {
    const content = await readFile(getRuntimePath(runtimeRoot), 'utf8');
    return parseRuntimeMetadata(content);
  } catch {
    return undefined;
  }
}

/**
 * 原子写入运行元数据，避免读到半个 JSON 文件。
 *
 * @param {string} runtimeRoot 运行目录
 * @param {object} metadata 运行元数据
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
export async function writeRuntimeMetadata(runtimeRoot, metadata) {
  await mkdir(runtimeRoot, { recursive: true });
  const runtimePath = getRuntimePath(runtimeRoot);
  const temporaryPath = `${runtimePath}.${metadata.pid}.tmp`;
  const content = `${JSON.stringify(metadata, null, 2)}\n`;
  await writeFile(temporaryPath, content, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, runtimePath);
}

/**
 * 只删除当前进程拥有的运行元数据。
 *
 * @param {string} runtimeRoot 运行目录
 * @param {number} pid 进程号
 * @returns {Promise<boolean>} 是否删除了当前进程的文件
 * @author lvdaxianer@yeah.net
 */
export async function removeOwnedRuntimeMetadata(runtimeRoot, pid) {
  const metadata = await readRuntimeMetadata(runtimeRoot);
  if (!metadata || metadata.pid !== pid) {
    return false;
  }
  await rm(getRuntimePath(runtimeRoot), { force: true });
  return true;
}

/**
 * 解析并验证运行元数据的基本结构。
 *
 * @param {string} content JSON 文本
 * @returns {object|undefined} 有效元数据
 * @author lvdaxianer@yeah.net
 */
function parseRuntimeMetadata(content) {
  const metadata = JSON.parse(content);
  const hasPid = Number.isInteger(metadata.pid) && metadata.pid > 0;
  const hasPort = Number.isInteger(metadata.port) && metadata.port > 0;
  const hasProject = typeof metadata.projectRoot === 'string' && metadata.projectRoot.length > 0;
  if (!hasPid || !hasPort || !hasProject) {
    return undefined;
  }
  return metadata;
}
