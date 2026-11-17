import {
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_SERVICE_UNAVAILABLE,
  ERROR_NOT_READY,
  ERROR_ROUTE_NOT_FOUND
} from './constants.mjs';

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

/**
 * 向客户端写入稳定的 JSON 响应。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {number} statusCode HTTP 状态码
 * @param {object} body 响应体
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
export function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': JSON_CONTENT_TYPE });
  response.end(JSON.stringify(body));
}

/**
 * 写入健康检查成功响应。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {string} serviceName 服务名
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
export function writeHealthResponse(response, serviceName) {
  writeJson(response, HTTP_OK, { status: 'ok', service: serviceName });
}

/**
 * 写入就绪检查成功响应。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {object} metadata 服务元数据
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
export function writeReadyResponse(response, metadata) {
  writeJson(response, HTTP_OK, { status: 'ready', ...metadata });
}

/**
 * 写入就绪检查失败响应。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
export function writeNotReadyResponse(response) {
  writeJson(response, HTTP_SERVICE_UNAVAILABLE, {
    status: 'not_ready',
    errorCode: ERROR_NOT_READY
  });
}

/**
 * 写入未知路径响应。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
export function writeNotFoundResponse(response) {
  writeJson(response, HTTP_NOT_FOUND, {
    status: 'not_found',
    errorCode: ERROR_ROUTE_NOT_FOUND
  });
}
