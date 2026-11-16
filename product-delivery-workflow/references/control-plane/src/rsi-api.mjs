import { KnowledgeGovernanceError } from './knowledge-governance.mjs';
import { RsiContextError } from './rsi-context.mjs';
import { RsiProviderAdapterError } from './rsi-provider-adapter.mjs';
import { writeJson } from './response.mjs';

const RSI_PATH_PREFIX = '/api/rsi';
const SNAPSHOT_PATH = '/api/rsi/snapshots';
const FEEDBACK_PATH = '/api/rsi/feedback';
const INJECT_SEGMENT = 'inject';
const MAX_REQUEST_BYTES = 128 * 1024;
const CREATED_STATUS = 201;
const OK_STATUS = 200;
const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const INPUT_STATUS = 400;
const SERVER_STATUS = 500;
const FEEDBACK_TYPES = new Set(['failure', 'near_miss', 'success_before_fix', 'human_feedback']);

/**
 * 表示 RSI HTTP API 的稳定错误。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiApiError extends Error {
  /**
   * 创建带状态和错误码的 API 错误。
   *
   * @param {number} status HTTP 状态
   * @param {string} code 稳定错误码
   * @param {string} message 中文错误说明
   * @param {object} details 可恢复信息
   * @author lvdaxianer@yeah.net
   */
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'RsiApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * 处理本地 RSI 快照和反馈 API。
 *
 * @param {object} input API 依赖
 * @returns {Promise<boolean>} 是否命中 RSI 路由
 * @author lvdaxianer@yeah.net
 */
export async function handleRsiRequest({ request, response, pathname, builder, adapters, knowledgeStore, projectId }) {
  if (!pathname.startsWith(RSI_PATH_PREFIX)) return false;
  try {
    await routeRsiRequest({ request, response, pathname, builder, adapters, knowledgeStore, projectId });
  } catch (error) {
    writeRsiError(response, error);
  }
  return true;
}

async function routeRsiRequest({ request, response, pathname, builder, adapters, knowledgeStore, projectId }) {
  const segments = pathname.split('/').filter(Boolean);
  if (pathname === SNAPSHOT_PATH && request.method === 'POST') {
    await prepareSnapshot(request, response, builder, projectId);
    return;
  }
  if (segments.length === 4 && segments[1] === 'rsi' && segments[2] === 'snapshots' && request.method === 'GET') {
    await readSnapshot(response, builder, decodeSegment(segments[3], '快照 ID'));
    return;
  }
  if (segments.length === 6 && segments[1] === 'rsi' && segments[2] === 'snapshots'
    && segments[4] === INJECT_SEGMENT && request.method === 'POST') {
    await injectSnapshot(request, response, adapters, decodeSegment(segments[3], '快照 ID'), decodeSegment(segments[5], 'Provider'));
    return;
  }
  if (pathname === FEEDBACK_PATH && request.method === 'POST') {
    await writeFeedback(request, response, builder, knowledgeStore);
    return;
  }
  throw new RsiApiError(NOT_FOUND_STATUS, 'CONTROL_PLANE_ROUTE_NOT_FOUND', 'RSI 路由不存在');
}

async function injectSnapshot(request, response, adapters, snapshotId, provider) {
  if (!adapters || typeof adapters.inject !== 'function') {
    throw new RsiApiError(SERVER_STATUS, 'RSI_ADAPTER_UNAVAILABLE', 'Provider Adapter 不可用');
  }
  const body = await readJsonBody(request);
  const result = await adapters.inject({
    provider,
    snapshotId,
    mode: body.mode ?? 'file',
    maxPromptBytes: body.maxPromptBytes
  });
  writeJson(response, OK_STATUS, result);
}

async function prepareSnapshot(request, response, builder, configuredProjectId) {
  const body = await readJsonBody(request);
  if (body.sourceHash !== undefined) assertText(body.sourceHash, 'sourceHash');
  const snapshot = await builder.build({
    ...body,
    projectId: body.projectId ?? configuredProjectId ?? 'current-project'
  });
  if (body.sourceHash && body.sourceHash !== snapshot.sourceHash) {
    throw new RsiApiError(CONFLICT_STATUS, 'RSI_SOURCE_CONFLICT', 'RSI 来源已变化，请使用新快照重试', {
      snapshotId: snapshot.snapshotId,
      sourceHash: snapshot.sourceHash
    });
  }
  writeJson(response, CREATED_STATUS, snapshot);
}

async function readSnapshot(response, builder, snapshotId) {
  writeJson(response, OK_STATUS, await builder.read(snapshotId));
}

async function writeFeedback(request, response, builder, knowledgeStore) {
  const body = await readJsonBody(request);
  validateFeedback(body);
  await builder.read(body.snapshotId);
  const existing = await readExistingEvent(knowledgeStore, body.eventId);
  if (existing) {
    ensureIdempotentFeedback(existing, body);
    writeJson(response, OK_STATUS, { idempotent: true, event: existing });
    return;
  }
  const event = await recordFeedback(knowledgeStore, body);
  writeJson(response, CREATED_STATUS, { idempotent: false, event });
}

async function recordFeedback(store, body) {
  const input = {
    ...body,
    eventType: body.feedbackType === 'near_miss' ? 'near_miss' : body.feedbackType,
    rsiSnapshotId: body.snapshotId,
    rsiProvider: body.provider
  };
  if (body.feedbackType === 'failure') return store.recordError(input);
  if (body.feedbackType === 'near_miss') return store.recordNearMiss(input);
  return store.recordEvent(input);
}

async function readExistingEvent(store, eventId) {
  try {
    return await store.readEvent(eventId);
  } catch (error) {
    if (error.code === 'KNOWLEDGE_NOT_FOUND') return null;
    throw error;
  }
}

function ensureIdempotentFeedback(existing, body) {
  const matches = existing.rsiSnapshotId === body.snapshotId
    && existing.rsiProvider === body.provider
    && existing.feedbackType === body.feedbackType
    && existing.description === body.description;
  if (!matches) {
    throw new RsiApiError(CONFLICT_STATUS, 'RSI_FEEDBACK_CONFLICT', 'eventId 已绑定其他反馈');
  }
}

function validateFeedback(body) {
  ['eventId', 'snapshotId', 'provider', 'runId', 'featureId', 'title', 'description', 'phase']
    .forEach((field) => assertText(body[field], field));
  if (!FEEDBACK_TYPES.has(body.feedbackType)) {
    throw new RsiApiError(INPUT_STATUS, 'RSI_FEEDBACK_TYPE_INVALID', 'feedbackType 无效');
  }
  if (!Array.isArray(body.evidenceRefs) || body.evidenceRefs.length > 20
    || body.evidenceRefs.some((ref) => typeof ref !== 'string' || ref.length > 512)) {
    throw new RsiApiError(INPUT_STATUS, 'RSI_EVIDENCE_INVALID', 'evidenceRefs 必须是数组');
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw new RsiApiError(INPUT_STATUS, 'RSI_REQUEST_TOO_LARGE', 'RSI 请求体过大');
    }
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('body must be an object');
    }
    return value;
  } catch {
    throw new RsiApiError(INPUT_STATUS, 'RSI_REQUEST_INVALID', 'RSI 请求体不是有效 JSON');
  }
}

function decodeSegment(value, label) {
  try {
    const decoded = decodeURIComponent(value);
    assertText(decoded, label);
    return decoded;
  } catch (error) {
    if (error instanceof RsiApiError) throw error;
    throw new RsiApiError(INPUT_STATUS, 'RSI_INPUT_INVALID', `${label}无效`);
  }
}

function assertText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 256) {
    throw new RsiApiError(INPUT_STATUS, 'RSI_INPUT_INVALID', `${label}必须是 1 到 256 个字符`);
  }
}

function writeRsiError(response, error) {
  const normalized = normalizeRsiError(error);
  writeJson(response, normalized.status, {
    errorCode: normalized.code,
    message: normalized.message,
    ...normalized.details
  });
}

function normalizeRsiError(error) {
  if (error instanceof RsiApiError) return error;
  if (error instanceof RsiContextError) {
    const status = error.code === 'RSI_SNAPSHOT_NOT_FOUND' ? NOT_FOUND_STATUS : INPUT_STATUS;
    return new RsiApiError(status, error.code, error.message);
  }
  if (error instanceof RsiProviderAdapterError) {
    const status = error.code === 'RSI_SNAPSHOT_NOT_FOUND' ? NOT_FOUND_STATUS : INPUT_STATUS;
    return new RsiApiError(status, error.code, error.message);
  }
  if (error instanceof KnowledgeGovernanceError) {
    return new RsiApiError(INPUT_STATUS, error.code, error.message);
  }
  return new RsiApiError(SERVER_STATUS, 'RSI_INTERNAL_ERROR', '控制平面内部错误');
}
