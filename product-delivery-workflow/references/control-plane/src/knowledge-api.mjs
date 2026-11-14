import { KnowledgeGovernanceError } from './knowledge-governance.mjs';
import { writeJson } from './response.mjs';

const MAX_REQUEST_BYTES = 64 * 1024;
const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;
const PROMOTION_BLOCKED_STATUS = 422;
const SERVER_ERROR_STATUS = 500;
const KNOWLEDGE_PATH_PREFIX = '/api/knowledge';
const DECISION_FIELDS = ['scope', 'severity', 'title', 'rootCause', 'solution', 'lifecycle'];

/**
 * 处理本地知识管理 API。
 *
 * @param {object} input API 依赖
 * @param {import('node:http').IncomingMessage} input.request HTTP 请求
 * @param {import('node:http').ServerResponse} input.response HTTP 响应
 * @param {string} input.pathname 请求路径
 * @param {import('./knowledge-governance.mjs').KnowledgeStore} input.store 知识库
 * @returns {Promise<boolean>} 是否处理了该路由
 * @author lvdaxianer@yeah.net
 */
export async function handleKnowledgeRequest({ request, response, pathname, store }) {
  if (!pathname.startsWith(KNOWLEDGE_PATH_PREFIX)) {
    return false;
  }
  try {
    await routeKnowledgeRequest({ request, response, pathname, store });
  } catch (error) {
    writeKnowledgeError(response, error);
  }
  return true;
}

/**
 * 分发知识列表、编辑、排除和发布操作。
 *
 * @param {object} input API 输入
 * @returns {Promise<void>} 路由处理完成
 * @author lvdaxianer@yeah.net
 */
async function routeKnowledgeRequest({ request, response, pathname, store }) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 2 && request.method === 'GET') {
    const url = new URL(request.url, 'http://127.0.0.1');
    const items = await store.listKnowledge({
      scope: url.searchParams.get('scope') ?? undefined,
      lifecycle: url.searchParams.get('lifecycle') ?? undefined
    });
    writeJson(response, 200, { items });
    return;
  }
  const eventId = decodeEventId(segments[2]);
  if (segments.length === 3 && request.method === 'GET') {
    writeJson(response, 200, await store.resolveEvent(eventId));
    return;
  }
  if (segments.length === 3 && request.method === 'PATCH') {
    await handleDecision(request, response, store, eventId);
    return;
  }
  if (segments.length === 4 && segments[3] === 'exclude' && request.method === 'POST') {
    await handleLifecycle(request, response, store, eventId, 'excluded');
    return;
  }
  if (segments.length === 4 && segments[3] === 'restore' && request.method === 'POST') {
    await handleLifecycle(request, response, store, eventId, 'active');
    return;
  }
  if (segments.length === 4 && segments[3] === 'publish' && request.method === 'POST') {
    await handlePublish(request, response, store, eventId);
    return;
  }
  throw new KnowledgeGovernanceError('CONTROL_PLANE_ROUTE_NOT_FOUND', '知识管理路由不存在');
}

/**
 * 处理人工知识编辑。
 *
 * @param {import('node:http').IncomingMessage} request HTTP 请求
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {object} store 知识库
 * @param {string} eventId 事件 ID
 * @returns {Promise<void>} 响应完成
 * @author lvdaxianer@yeah.net
 */
async function handleDecision(request, response, store, eventId) {
  const body = await readJsonBody(request);
  const patch = pickFields(body, DECISION_FIELDS);
  const audit = readAuditFields(body);
  writeJson(response, 200, await store.applyDecision(eventId, patch, audit));
}

/**
 * 处理排除或恢复动作。
 *
 * @param {import('node:http').IncomingMessage} request HTTP 请求
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {object} store 知识库
 * @param {string} eventId 事件 ID
 * @param {string} lifecycle 目标生命周期
 * @returns {Promise<void>} 响应完成
 * @author lvdaxianer@yeah.net
 */
async function handleLifecycle(request, response, store, eventId, lifecycle) {
  const body = await readJsonBody(request);
  const current = await store.resolveEvent(eventId);
  const audit = readAuditFields(body);
  writeJson(response, 200, await store.applyDecision(eventId, {
    scope: current.scope,
    lifecycle
  }, audit));
}

/**
 * 处理公共 Guardrail 发布。
 *
 * @param {import('node:http').IncomingMessage} request HTTP 请求
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {object} store 知识库
 * @param {string} eventId 事件 ID
 * @returns {Promise<void>} 响应完成
 * @author lvdaxianer@yeah.net
 */
async function handlePublish(request, response, store, eventId) {
  const body = await readJsonBody(request);
  writeJson(response, 200, await store.publishCommon(eventId, body, readAuditFields(body)));
}

/**
 * 读取并限制 JSON 请求体大小。
 *
 * @param {import('node:http').IncomingMessage} request HTTP 请求
 * @returns {Promise<object>} JSON 请求体
 * @throws {KnowledgeGovernanceError} 请求体非法时抛出
 * @author lvdaxianer@yeah.net
 */
async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw new KnowledgeGovernanceError('CONTROL_PLANE_INPUT_INVALID', '请求体过大');
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new KnowledgeGovernanceError('CONTROL_PLANE_INPUT_INVALID', '请求体不是有效 JSON');
  }
}

/**
 * 从请求体中筛选人工可编辑字段。
 *
 * @param {object} body 请求体
 * @param {string[]} fields 允许字段
 * @returns {object} 编辑字段
 * @author lvdaxianer@yeah.net
 */
function pickFields(body, fields) {
  return fields.reduce((patch, field) => {
    if (body[field] !== undefined) {
      patch[field] = body[field];
    }
    return patch;
  }, {});
}

/**
 * 读取人工审计字段。
 *
 * @param {object} body 请求体
 * @returns {{operator: string, reason: string}} 审计字段
 * @author lvdaxianer@yeah.net
 */
function readAuditFields(body) {
  return { operator: body.operator, reason: body.reason };
}

/**
 * 解码并校验事件 ID。
 *
 * @param {string|undefined} value 路径片段
 * @returns {string} 事件 ID
 * @throws {KnowledgeGovernanceError} ID 非法时抛出
 * @author lvdaxianer@yeah.net
 */
function decodeEventId(value) {
  try {
    return decodeURIComponent(value ?? '');
  } catch {
    throw new KnowledgeGovernanceError('CONTROL_PLANE_INPUT_INVALID', '事件 ID 无效');
  }
}

/**
 * 将治理错误转换为稳定 HTTP 响应。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {Error} error 治理错误
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function writeKnowledgeError(response, error) {
  const status = getErrorStatus(error);
  const errorCode = getKnowledgeErrorCode(error);
  writeJson(response, status, { errorCode, message: status === 500 ? '控制平面内部错误' : error.message });
}

/**
 * 将领域输入错误映射为控制平面稳定错误码。
 *
 * @param {Error} error 治理错误
 * @returns {string} 对外错误码
 * @author lvdaxianer@yeah.net
 */
function getKnowledgeErrorCode(error) {
  const inputErrors = new Set([
    'KNOWLEDGE_FIELD_INVALID',
    'KNOWLEDGE_SCOPE_INVALID',
    'KNOWLEDGE_LIFECYCLE_INVALID',
    'KNOWLEDGE_IDENTIFIER_INVALID'
  ]);
  if (inputErrors.has(error.code)) {
    return 'CONTROL_PLANE_INPUT_INVALID';
  }
  return error.code ?? 'CONTROL_PLANE_INTERNAL_ERROR';
}

/**
 * 获取治理错误的 HTTP 状态。
 *
 * @param {Error} error 治理错误
 * @returns {number} HTTP 状态
 * @author lvdaxianer@yeah.net
 */
function getErrorStatus(error) {
  if (error.code === 'KNOWLEDGE_NOT_FOUND') return 404;
  if (error.code === 'KNOWLEDGE_PROMOTION_BLOCKED') return PROMOTION_BLOCKED_STATUS;
  if (error.code === 'CONTROL_PLANE_ROUTE_NOT_FOUND') return NOT_FOUND_STATUS;
  if (error instanceof KnowledgeGovernanceError) return BAD_REQUEST_STATUS;
  return SERVER_ERROR_STATUS;
}
