import { createServer } from 'node:http';
import { URL } from 'node:url';
import { normalizeConfig, getServiceMetadata } from './config.mjs';
import {
  DEFAULT_HOST,
  SERVICE_NAME
} from './constants.mjs';
import {
  writeHealthResponse,
  writeNotFoundResponse,
  writeNotReadyResponse,
  writeReadyResponse
} from './response.mjs';
import { isReady } from './readiness.mjs';
import { KnowledgeStore } from './knowledge-governance.mjs';
import { handleKnowledgeRequest } from './knowledge-api.mjs';
import { serveControlPlaneUi } from './ui-handler.mjs';

/**
 * 创建本地产品交付控制平面 HTTP 服务。
 *
 * @param {object} options 控制平面配置
 * @returns {import('node:http').Server} 尚未监听的 HTTP 服务
 * @author lvdaxianer@yeah.net
 */
export function createControlPlaneServer(options) {
  const config = normalizeConfig(options);
  const knowledgeStore = new KnowledgeStore(config);
  return createServer((request, response) => {
    handleRequest(request, response, config, knowledgeStore).catch(() => writeNotReadyResponse(response));
  });
}

/**
 * 处理控制平面请求并隔离路由异常。
 *
 * @param {import('node:http').IncomingMessage} request HTTP 请求
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {Readonly<object>} config 控制平面配置
 * @param {KnowledgeStore} knowledgeStore 知识库
 * @returns {Promise<void>} 请求处理完成
 * @author lvdaxianer@yeah.net
 */
async function handleRequest(request, response, config, knowledgeStore) {
  const pathname = getPathname(request.url);
  if (pathname.startsWith('/api/knowledge')) {
    await handleKnowledgeRequest({ request, response, pathname, store: knowledgeStore });
    return;
  }
  if (request.method !== 'GET') {
    writeNotFoundResponse(response);
    return;
  }
  if (pathname === '/healthz') {
    writeHealthResponse(response, SERVICE_NAME);
    return;
  }
  if (pathname === '/readyz') {
    await writeReadinessResponse(response, config);
    return;
  }
  if (pathname === '/' || pathname.startsWith('/assets/')) {
    if (await serveControlPlaneUi({ pathname, response, store: knowledgeStore })) {
      return;
    }
  }
  writeNotFoundResponse(response);
}

/**
 * 返回就绪检查结果。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {Readonly<object>} config 控制平面配置
 * @returns {Promise<void>} 响应写入完成
 * @author lvdaxianer@yeah.net
 */
async function writeReadinessResponse(response, config) {
  if (await isReady(config)) {
    writeReadyResponse(response, getServiceMetadata(config));
    return;
  }
  writeNotReadyResponse(response);
}

/**
 * 从请求 URL 中提取路径并提供默认值。
 *
 * @param {string|undefined} requestUrl 原始请求 URL
 * @returns {string} 请求路径
 * @author lvdaxianer@yeah.net
 */
function getPathname(requestUrl) {
  const safeUrl = typeof requestUrl === 'string' ? requestUrl : '/';
  return new URL(safeUrl, `http://${DEFAULT_HOST}`).pathname;
}
