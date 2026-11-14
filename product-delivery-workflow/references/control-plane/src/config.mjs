import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  LOOPBACK_HOSTS,
  SERVICE_NAME
} from './constants.mjs';

/**
 * 校验并标准化控制平面配置。
 *
 * @param {object} options 控制平面配置
 * @returns {Readonly<object>} 标准化配置
 * @throws {TypeError} 配置不满足服务契约时抛出
 * @author lvdaxianer@yeah.net
 */
export function normalizeConfig(options = {}) {
  const config = {
    host: options.host ?? DEFAULT_HOST,
    port: options.port ?? DEFAULT_PORT,
    projectRoot: options.projectRoot,
    sharedKnowledgeRoot: options.sharedKnowledgeRoot,
    serviceVersion: options.serviceVersion ?? '0.1.0'
  };
  validateConfig(config);
  return Object.freeze(config);
}

/**
 * 校验控制平面配置的类型和值域。
 *
 * @param {object} config 待校验配置
 * @returns {void}
 * @throws {TypeError} 配置非法时抛出
 * @author lvdaxianer@yeah.net
 */
function validateConfig(config) {
  const hasValidHost = LOOPBACK_HOSTS.has(config.host);
  const hasValidPort = Number.isInteger(config.port) && config.port >= 0 && config.port <= 65535;
  const hasValidProjectRoot = typeof config.projectRoot === 'string' && config.projectRoot.length > 0;
  const hasValidSharedRoot = typeof config.sharedKnowledgeRoot === 'string' && config.sharedKnowledgeRoot.length > 0;
  const hasValidVersion = typeof config.serviceVersion === 'string' && config.serviceVersion.length > 0;
  if (!hasValidHost || !hasValidPort || !hasValidProjectRoot || !hasValidSharedRoot || !hasValidVersion) {
    throw new TypeError('控制平面配置无效');
  }
}

/**
 * 生成服务信息响应中的稳定元数据。
 *
 * @param {Readonly<object>} config 控制平面配置
 * @returns {object} 服务元数据
 * @author lvdaxianer@yeah.net
 */
export function getServiceMetadata(config) {
  return {
    service: SERVICE_NAME,
    serviceVersion: config.serviceVersion,
    projectRoot: config.projectRoot,
    sharedKnowledgeRoot: config.sharedKnowledgeRoot
  };
}
