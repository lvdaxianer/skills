import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { RsiUsageCatalog } from './rsi-usage-catalog.mjs';

const VALID_STAGES = new Set(['injected', 'loaded', 'consulted', 'applied', 'unknown']);
const VALID_SOURCES = new Set(['provider-adapter', 'mcp-context', 'worker-report', 'run-finalize', 'file-import']);
const VALID_CONFIDENCE = new Set(['observed', 'declared', 'inferred']);
const MAX_EVIDENCE_REFS = 20;
const MAX_TEXT_LENGTH = 256;
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

/**
 * 表示 RSI 使用回传协议错误。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiUsageError extends Error {
  /**
   * 创建带稳定错误码的 RSI 使用错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'RsiUsageError';
    this.code = code;
  }
}

/**
 * 管理 RSI 使用事实、运行结算和统计投影。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiUsageStore {
  /**
   * 创建绑定项目的 RSI 使用存储。
   *
   * @param {object} options 初始化配置
   * @param {string} options.projectRoot 项目根目录
   * @author lvdaxianer@yeah.net
   */
  constructor({ projectRoot }) {
    this.projectRoot = resolveRequiredPath(projectRoot);
    this.runsRoot = join(this.projectRoot, '.product', 'runs');
    this.catalog = new RsiUsageCatalog({ dbPath: join(this.runsRoot, 'rsi-usage.sqlite') });
    this.runQueues = new Map();
  }

  /**
   * 追加一条或多条使用事实。
   *
   * @param {object} input 回报参数
   * @returns {Promise<object>} 写入结果
   * @author lvdaxianer@yeah.net
   */
  async record(input) {
    const result = await this.recordBatch({ ...input, usages: [input] });
    return result.results[0];
  }

  /**
   * 批量追加使用事实并保证同一运行串行写入。
   *
   * @param {object} input 回报参数
   * @returns {Promise<object>} 批量结果
   * @author lvdaxianer@yeah.net
   */
  async recordBatch(input) {
    const snapshot = validateWorkerIdentity(input.snapshot, input.workerId);
    return this.enqueue(snapshot.runId, () => this.writeBatch(input, snapshot));
  }

  /**
   * 结算运行中仍未被回报的已注入条目。
   *
   * @param {object} input 结算参数
   * @returns {Promise<object>} 结算结果
   * @author lvdaxianer@yeah.net
   */
  async finalize({ snapshot, workerId }) {
    const normalized = validateWorkerIdentity(snapshot, workerId);
    return this.enqueue(normalized.runId, async () => {
      const events = await this.readRunEvents(normalized.runId);
      const pending = findUnknownItems(normalized, events, workerId);
      const usages = pending.map((itemId) => ({ itemId, stage: 'unknown' }));
      const result = await this.writeEvents(normalized, workerId, usages, 'run-finalize', 'observed');
      return { ...result, finalized: true, unknownItemIds: pending };
    });
  }

  /**
   * 导入运行目录中的 Worker 结果文件。
   *
   * @param {object} input 导入参数
   * @returns {Promise<object>} 导入结果
   * @author lvdaxianer@yeah.net
   */
  async importWorkerResult({ snapshot, workerId, resultPath }) {
    const normalized = validateWorkerIdentity(snapshot, workerId);
    const path = resultPath ?? join(this.runRoot(normalized.runId), 'worker-result.json');
    const result = await readWorkerResult(path);
    return this.recordWorkerResult({ snapshot: normalized, workerId: normalized.workerId, result });
  }

  /**
   * 接收已经解析的 Worker 结果。
   *
   * @param {object} input Worker 结果参数
   * @returns {Promise<object>} 导入结果
   * @author lvdaxianer@yeah.net
   */
  async recordWorkerResult({ snapshot, workerId, result }) {
    const normalized = validateWorkerIdentity(snapshot, workerId);
    const payload = validateWorkerResult(result);
    const batch = await this.recordBatch({
      snapshot: normalized,
      workerId: normalized.workerId,
      usages: payload.rsiUsage,
      source: 'file-import'
    });
    if (payload.complete !== true) return batch;
    const finalization = await this.finalize({ snapshot: normalized, workerId: normalized.workerId });
    return { ...batch, finalized: true, finalization };
  }

  /**
   * 返回一个条目的阶段统计。
   *
   * @param {string} itemId RSI 条目 ID
   * @returns {object} 统计结果
   * @author lvdaxianer@yeah.net
   */
  getStats(itemId) {
    return this.catalog.getStats(itemId);
  }

  /**
   * 从全部运行事实重建 SQLite 投影。
   *
   * @returns {Promise<object>} 重建结果
   * @author lvdaxianer@yeah.net
   */
  async rebuild() {
    const events = await this.readAllEvents();
    return { events: this.catalog.rebuild(events) };
  }

  /**
   * 关闭使用统计连接。
   *
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  close() {
    this.catalog.close();
  }

  /**
   * 实际写入一批已绑定快照的事件。
   *
   * @param {object} input 回报参数
   * @param {object} snapshot 已验证快照
   * @returns {Promise<object>} 写入结果
   * @author lvdaxianer@yeah.net
   */
  async writeBatch(input, snapshot) {
    const existing = await this.readRunEvents(snapshot.runId);
    const results = await this.writeEvents(snapshot, input.workerId, input.usages, input.source, input.confidence, existing);
    return { results: results.results, accepted: results.accepted };
  }

  /**
   * 规范化、去重并追加使用事件。
   *
   * @param {object} snapshot 已验证快照
   * @param {string} workerId Worker ID
   * @param {object[]} usages 使用条目
   * @param {string} defaultSource 默认来源
   * @param {string} defaultConfidence 默认置信度
   * @param {object[]} existing 已有事件
   * @returns {Promise<object>} 写入结果
   * @author lvdaxianer@yeah.net
   */
  async writeEvents(snapshot, workerId, usages, defaultSource, defaultConfidence, existing = []) {
    const prepared = prepareEvents({ snapshot, workerId, usages, defaultSource, defaultConfidence, existing });
    await this.appendEvents(snapshot.runId, prepared.events);
    this.catalog.recordEvents([...existing, ...prepared.events]);
    return { results: prepared.results, accepted: prepared.events.length };
  }

  /**
   * 追加运行事实文件。
   *
   * @param {string} runId 运行 ID
   * @param {object[]} events 使用事件
   * @returns {Promise<void>}
   * @author lvdaxianer@yeah.net
   */
  async appendEvents(runId, events) {
    if (!events.length) return;
    await mkdir(this.runRoot(runId), { recursive: true });
    const lines = events.map((event) => `${JSON.stringify(event)}\n`).join('');
    await appendFile(this.usagePath(runId), lines, { encoding: 'utf8', mode: 0o600 });
  }

  /**
   * 读取一个运行的使用事实。
   *
   * @param {string} runId 运行 ID
   * @returns {Promise<object[]>} 使用事件
   * @author lvdaxianer@yeah.net
   */
  async readRunEvents(runId) {
    try {
      return parseEvents(await readFile(this.usagePath(runId), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * 读取所有运行事实文件。
   *
   * @returns {Promise<object[]>} 使用事件
   * @author lvdaxianer@yeah.net
   */
  async readAllEvents() {
    let entries;
    try {
      entries = await readdir(this.runsRoot, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    const files = entries.filter((entry) => entry.isDirectory())
      .map((entry) => this.usagePath(entry.name));
    const contents = await Promise.all(files.map((path) => readOptionalUsageFile(path)));
    return contents.flatMap(parseEvents);
  }

  /**
   * 返回指定运行的事实目录。
   *
   * @param {string} runId 运行 ID
   * @returns {string} 运行目录
   * @author lvdaxianer@yeah.net
   */
  runRoot(runId) {
    return join(this.runsRoot, runId);
  }

  /**
   * 返回指定运行的事实文件。
   *
   * @param {string} runId 运行 ID
   * @returns {string} JSONL 路径
   * @author lvdaxianer@yeah.net
   */
  usagePath(runId) {
    return join(this.runRoot(runId), 'rsi-usage.jsonl');
  }

  /**
   * 让同一运行的写入操作串行执行。
   *
   * @param {string} runId 运行 ID
   * @param {Function} operation 写入操作
   * @returns {Promise<object>} 操作结果
   * @author lvdaxianer@yeah.net
   */
  enqueue(runId, operation) {
    const previous = this.runQueues.get(runId) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    this.runQueues.set(runId, current.catch(() => {}));
    return current;
  }
}

function prepareEvents({ snapshot, workerId, usages, defaultSource, defaultConfidence, existing }) {
  if (!Array.isArray(usages)) throw new RsiUsageError('RSI_USAGE_INPUT_INVALID', 'usages 必须是数组');
  const known = new Set(existing.map((event) => event.eventKey));
  const events = [];
  const results = [];
  for (const usage of usages) {
    const event = normalizeUsage({ snapshot, workerId, usage, defaultSource, defaultConfidence });
    if (known.has(event.eventKey)) {
      results.push({ eventKey: event.eventKey, idempotent: true, event });
      continue;
    }
    known.add(event.eventKey);
    events.push(event);
    results.push({ eventKey: event.eventKey, idempotent: false, event });
  }
  return { events, results };
}

function normalizeUsage({ snapshot, workerId, usage, defaultSource, defaultConfidence }) {
  const itemId = assertText(usage.itemId, 'itemId');
  assertSnapshotItem(snapshot, itemId);
  const stage = assertEnum(usage.stage, VALID_STAGES, 'stage');
  const source = assertEnum(usage.source ?? defaultSource ?? 'worker-report', VALID_SOURCES, 'source');
  const confidence = assertEnum(usage.confidence ?? defaultConfidence ?? 'declared', VALID_CONFIDENCE, 'confidence');
  const evidenceRefs = normalizeEvidenceRefs(usage.evidenceRefs);
  const eventKey = [snapshot.runId, workerId, snapshot.snapshotId, itemId, stage].join(':');
  return {
    eventId: randomUUID(), eventKey, eventType: 'rsi_usage', projectId: snapshot.projectId,
    runId: snapshot.runId, workerId, snapshotId: snapshot.snapshotId, itemId, stage,
    source, confidence, evidenceRefs, recordedAt: new Date().toISOString()
  };
}

function assertSnapshotItem(snapshot, itemId) {
  const itemIds = snapshot.layers?.flatMap((layer) => layer.items ?? [])
    .map((item) => item.itemId) ?? [];
  if (!itemIds.includes(itemId)) throw new RsiUsageError('RSI_ITEM_NOT_FOUND', 'RSI 条目不属于当前快照');
}

function findUnknownItems(snapshot, events, workerId) {
  const injected = new Set(events.filter((event) => event.workerId === workerId && event.stage === 'injected')
    .map((event) => event.itemId));
  const resolved = new Set(events.filter((event) => event.workerId === workerId && ['consulted', 'applied', 'unknown'].includes(event.stage))
    .map((event) => event.itemId));
  return [...injected].filter((itemId) => !resolved.has(itemId));
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new RsiUsageError('RSI_SNAPSHOT_INVALID', 'RSI 快照无效');
  assertText(snapshot.projectId, 'projectId');
  assertSafeId(snapshot.runId, 'runId');
  assertSafeId(snapshot.snapshotId, 'snapshotId');
  return snapshot;
}

function validateWorkerIdentity(snapshot, workerId) {
  const normalized = validateSnapshot(snapshot);
  return { ...normalized, workerId: assertText(workerId, 'workerId') };
}

function normalizeEvidenceRefs(refs = []) {
  if (!Array.isArray(refs) || refs.length > MAX_EVIDENCE_REFS) {
    throw new RsiUsageError('RSI_EVIDENCE_INVALID', 'evidenceRefs 数量无效');
  }
  return refs.map((ref) => assertText(ref, 'evidenceRef'));
}

function validateWorkerResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new RsiUsageError('RSI_WORKER_RESULT_INVALID', 'Worker 结果必须是对象');
  }
  if (result.rsiUsage !== undefined && !Array.isArray(result.rsiUsage)) {
    throw new RsiUsageError('RSI_USAGE_INPUT_INVALID', 'rsiUsage 必须是数组');
  }
  if (result.complete !== undefined && typeof result.complete !== 'boolean') {
    throw new RsiUsageError('RSI_USAGE_INPUT_INVALID', 'complete 必须是布尔值');
  }
  return { ...result, rsiUsage: result.rsiUsage ?? [] };
}

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) throw new RsiUsageError('RSI_USAGE_VALUE_INVALID', `${label} 无效`);
  return value;
}

function assertText(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TEXT_LENGTH) {
    throw new RsiUsageError('RSI_USAGE_INPUT_INVALID', `${label} 无效`);
  }
  return value;
}

function assertSafeId(value, label) {
  const text = assertText(value, label);
  if (!SAFE_ID_PATTERN.test(text)) throw new RsiUsageError('RSI_USAGE_INPUT_INVALID', `${label} 格式无效`);
  return text;
}

async function readWorkerResult(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new RsiUsageError('RSI_WORKER_RESULT_INVALID', 'Worker 结果文件无效或无法读取');
  }
}

async function readOptionalUsageFile(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function parseEvents(content) {
  return content.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function resolveRequiredPath(path) {
  if (typeof path !== 'string' || path.length === 0) throw new TypeError('项目根目录不能为空');
  return resolve(path);
}
