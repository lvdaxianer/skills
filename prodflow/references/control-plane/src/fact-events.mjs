import { createHash, randomUUID } from 'node:crypto';

/**
 * 创建可投影的事实事件信封。
 *
 * @param {object} input 事件输入
 * @returns {object} 带内容哈希的事件信封
 * @author lvdaxianer@yeah.net
 */
export function createFactEnvelope({
  eventId = `EVENT-${randomUUID()}`,
  operationId = `OP-${randomUUID()}`,
  sourceProjectId,
  eventType,
  payload,
  version = 1
}) {
  assertText(eventId, '事件 ID');
  assertText(operationId, '操作 ID');
  assertText(sourceProjectId, '来源项目 ID');
  assertText(eventType, '事件类型');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('事实事件 payload 必须是对象');
  }
  const base = {
    schemaVersion: 1,
    eventId,
    operationId,
    sourceProjectId,
    eventType,
    version,
    payload,
    recordedAt: new Date().toISOString()
  };
  return { ...base, contentHash: hashObject(base) };
}

/**
 * 创建归属变化事实事件。
 *
 * @param {object} input 归属变化输入
 * @returns {object} 归属事件
 * @author lvdaxianer@yeah.net
 */
export function createOwnershipChangeEvent(input) {
  return createFactEnvelope({
    ...input,
    eventType: 'ownership_changed'
  });
}

/**
 * 计算对象内容哈希。
 *
 * @param {object} value 待计算对象
 * @returns {string} SHA-256 哈希
 * @author lvdaxianer@yeah.net
 */
function hashObject(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

/**
 * 校验文本字段。
 *
 * @param {unknown} value 字段值
 * @param {string} label 字段名称
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function assertText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label}不能为空`);
  }
}
