import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

/**
 * 检查控制平面依赖的目录是否可访问。
 *
 * @param {Readonly<object>} config 控制平面配置
 * @returns {Promise<boolean>} 两个目录均可访问时返回 true
 * @author lvdaxianer@yeah.net
 */
export async function isReady(config) {
  const paths = [config.projectRoot, config.sharedKnowledgeRoot];
  const checks = await Promise.all(paths.map((path) => canAccessDirectory(path)));
  return checks.every(Boolean);
}

/**
 * 检查单个路径是否可读且可执行。
 *
 * @param {string} path 待检查路径
 * @returns {Promise<boolean>} 可访问目录返回 true
 * @author lvdaxianer@yeah.net
 */
async function canAccessDirectory(path) {
  try {
    await access(path, fsConstants.R_OK | fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}
