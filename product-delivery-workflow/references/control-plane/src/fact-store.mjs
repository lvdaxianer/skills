import { randomUUID } from 'node:crypto';
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile
} from 'node:fs/promises';
import { join, resolve } from 'node:path';

const PRODUCT_DIRECTORY = '.product';
const RUNS_DIRECTORY = 'runs';
const CACHE_DIRECTORY = 'control-plane/cache';
const INDEX_FILE = 'index.json';
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MESSAGE_ACTIONS = new Set(['none', 'execute']);
const MESSAGE_STATUSES = new Set(['pending', 'processing', 'succeeded', 'failed', 'blocked']);
const MESSAGE_KINDS = new Set(['inform', 'request', 'response', 'ack', 'block']);

/**
 * 表示项目事实源读写失败。
 *
 * @author lvdaxianer@yeah.net
 */
export class FactStoreError extends Error {
  /**
   * 创建带稳定错误码的事实源错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'FactStoreError';
    this.code = code;
  }
}

/**
 * 管理项目级文件事实源、交互账本和可重建索引。
 *
 * @author lvdaxianer@yeah.net
 */
export class FileFactStore {
  /**
   * 创建绑定到项目根目录的事实源。
   *
   * @param {object} options 初始化配置
   * @param {string} options.projectRoot 项目根目录
   * @author lvdaxianer@yeah.net
   */
  constructor({ projectRoot }) {
    if (typeof projectRoot !== 'string' || projectRoot.length === 0) {
      throw new TypeError('项目根目录不能为空');
    }
    this.projectRoot = resolve(projectRoot);
    this.productRoot = join(this.projectRoot, PRODUCT_DIRECTORY);
    this.runsRoot = join(this.productRoot, RUNS_DIRECTORY);
    this.cacheRoot = join(this.productRoot, CACHE_DIRECTORY);
  }

  /**
   * 创建新的需求运行事实。
   *
   * @param {object} input 运行信息
   * @param {string} input.runId 运行 ID
   * @param {string} input.taskTier 入口档位
   * @param {string} input.intake 原始需求
   * @returns {Promise<object>} 创建的运行记录
   * @throws {FactStoreError} 运行已存在或参数非法时抛出
   * @author lvdaxianer@yeah.net
   */
  async createRun({ runId, taskTier, intake }) {
    assertIdentifier(runId, '运行 ID');
    assertText(taskTier, '任务档位');
    assertText(intake, '原始需求');
    const runDirectory = this.getRunDirectory(runId);
    await this.createRunDirectory(runDirectory);
    const run = {
      runId,
      taskTier,
      intake,
      status: 'INTAKE',
      createdAt: new Date().toISOString()
    };
    await writeJsonAtomically(join(runDirectory, 'run.json'), run);
    return run;
  }

  /**
   * 读取运行事实。
   *
   * @param {string} runId 运行 ID
   * @returns {Promise<object>} 运行记录
   * @author lvdaxianer@yeah.net
   */
  async readRun(runId) {
    const path = join(this.getRunDirectory(runId), 'run.json');
    return readJson(path);
  }

  /**
   * 追加一条 Worker 交互消息。
   *
   * @param {string} runId 运行 ID
   * @param {object} message 交互消息
   * @returns {Promise<object>} 实际写入的消息
   * @author lvdaxianer@yeah.net
   */
  async appendInteraction(runId, message) {
    await this.readRun(runId);
    const record = validateMessage(runId, message);
    await appendJsonLine(join(this.getRunDirectory(runId), 'interaction.jsonl'), record);
    return record;
  }

  /**
   * 追加一条人工或系统审计事件。
   *
   * @param {string} runId 运行 ID
   * @param {object} event 审计事件
   * @returns {Promise<object>} 实际写入的审计事件
   * @author lvdaxianer@yeah.net
   */
  async appendAudit(runId, event) {
    await this.readRun(runId);
    const record = validateAudit(event);
    await appendJsonLine(join(this.getRunDirectory(runId), 'audit.jsonl'), {
      ...record,
      recorded_at: new Date().toISOString()
    });
    return record;
  }

  /**
   * 返回指定 Worker 的未消费执行消息。
   *
   * @param {string} runId 运行 ID
   * @param {string} workerId Worker ID
   * @returns {Promise<object[]>} 最新状态仍待消费的消息
   * @author lvdaxianer@yeah.net
   */
  async listPendingMessages(runId, workerId) {
    await this.readRun(runId);
    assertText(workerId, 'Worker ID');
    const messages = await this.readInteraction(runId);
    const latest = new Map(messages.map((message) => [message.message_id, message]));
    return [...latest.values()].filter((message) => isPendingForWorker(message, workerId));
  }

  /**
   * 读取某次运行的全部审计事件。
   *
   * @param {string} runId 运行 ID
   * @returns {Promise<object[]>} 审计事件
   * @author lvdaxianer@yeah.net
   */
  async readAudit(runId) {
    await this.readRun(runId);
    return readJsonLines(join(this.getRunDirectory(runId), 'audit.jsonl'));
  }

  /**
   * 从事实文件恢复运行、未消费消息和审计链。
   *
   * @param {string} runId 运行 ID
   * @param {string} workerId Worker ID
   * @returns {Promise<object>} 可恢复运行快照
   * @author lvdaxianer@yeah.net
   */
  async recoverRun(runId, workerId) {
    const [run, pendingMessages, auditEvents] = await Promise.all([
      this.readRun(runId),
      this.listPendingMessages(runId, workerId),
      this.readAudit(runId)
    ]);
    return { run, pendingMessages, auditEvents };
  }

  /**
   * 从所有 run.json 重建索引缓存。
   *
   * @returns {Promise<object>} 可重建运行索引
   * @author lvdaxianer@yeah.net
   */
  async rebuildIndex() {
    const entries = await this.readRunEntries();
    const index = { version: 1, runs: entries };
    await writeJsonAtomically(join(this.cacheRoot, INDEX_FILE), index);
    return index;
  }

  /**
   * 返回某个运行的目录，并阻止路径穿越。
   *
   * @param {string} runId 运行 ID
   * @returns {string} 运行目录
   * @author lvdaxianer@yeah.net
   */
  getRunDirectory(runId) {
    assertIdentifier(runId, '运行 ID');
    return join(this.runsRoot, runId);
  }

  /**
   * 创建运行目录并区分重复运行。
   *
   * @param {string} runDirectory 运行目录
   * @returns {Promise<void>} 创建完成
   * @throws {FactStoreError} 目录已存在时抛出
   * @author lvdaxianer@yeah.net
   */
  async createRunDirectory(runDirectory) {
    try {
      await mkdir(this.runsRoot, { recursive: true });
      await mkdir(runDirectory, { recursive: false });
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new FactStoreError('FACT_RUN_EXISTS', '运行已经存在');
      }
      throw error;
    }
  }

  /**
   * 读取并排序交互账本。
   *
   * @param {string} runId 运行 ID
   * @returns {Promise<object[]>} 交互消息
   * @author lvdaxianer@yeah.net
   */
  async readInteraction(runId) {
    return readJsonLines(join(this.getRunDirectory(runId), 'interaction.jsonl'));
  }

  /**
   * 读取全部运行记录用于重建索引。
   *
   * @returns {Promise<object[]>} 运行记录
   * @author lvdaxianer@yeah.net
   */
  async readRunEntries() {
    const entries = await readDirectoryEntries(this.runsRoot);
    const runs = await Promise.all(entries.map((entry) => this.readRun(entry.name)));
    return runs.sort((left, right) => left.runId.localeCompare(right.runId));
  }
}

/**
 * 校验交互消息并添加记录时间。
 *
 * @param {string} runId 当前运行 ID
 * @param {object} message 交互消息
 * @returns {object} 校验后的消息
 * @author lvdaxianer@yeah.net
 */
function validateMessage(runId, message) {
  const requiredText = ['message_id', 'from', 'to', 'correlation_id'];
  requiredText.forEach((field) => assertText(message[field], `消息字段 ${field}`));
  assertIdentifier(message.message_id, '消息 ID');
  if (message.run_id !== runId || !MESSAGE_KINDS.has(message.kind)) {
    throw new FactStoreError('FACT_MESSAGE_INVALID', '消息运行或类型不匹配');
  }
  if (!MESSAGE_ACTIONS.has(message.action) || !MESSAGE_STATUSES.has(message.status)) {
    throw new FactStoreError('FACT_MESSAGE_INVALID', '消息动作或状态不匹配');
  }
  if (!Number.isInteger(message.round) || message.round < 1) {
    throw new FactStoreError('FACT_MESSAGE_INVALID', '消息轮次无效');
  }
  if (!Array.isArray(message.input_refs) || !Array.isArray(message.output_refs)) {
    throw new FactStoreError('FACT_MESSAGE_INVALID', '消息引用必须是数组');
  }
  return { ...message, recorded_at: new Date().toISOString() };
}

/**
 * 校验审计事件的最小字段。
 *
 * @param {object} event 审计事件
 * @returns {object} 校验后的审计事件
 * @author lvdaxianer@yeah.net
 */
function validateAudit(event) {
  assertIdentifier(event.event_id, '审计事件 ID');
  assertText(event.action, '审计动作');
  assertText(event.actor, '审计操作者');
  assertText(event.reason, '审计原因');
  return { ...event };
}

/**
 * 判断消息是否应投递给目标 Worker。
 *
 * @param {object} message 交互消息
 * @param {string} workerId 目标 Worker
 * @returns {boolean} 是否为待执行消息
 * @author lvdaxianer@yeah.net
 */
function isPendingForWorker(message, workerId) {
  return message.to === workerId
    && message.action === 'execute'
    && ['pending', 'processing'].includes(message.status);
}

/**
 * 读取目录中的运行条目，目录不存在时返回空集合。
 *
 * @param {string} directory 目录路径
 * @returns {Promise<import('node:fs').Dirent[]>} 运行目录条目
 * @author lvdaxianer@yeah.net
 */
async function readDirectoryEntries(directory) {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && IDENTIFIER_PATTERN.test(entry.name));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 读取 JSON 文件并转换为稳定事实源错误。
 *
 * @param {string} path JSON 文件路径
 * @returns {Promise<object>} JSON 对象
 * @author lvdaxianer@yeah.net
 */
async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new FactStoreError('FACT_NOT_FOUND', '事实文件不存在');
    }
    if (error instanceof SyntaxError) {
      throw new FactStoreError('FACT_STORE_CORRUPT', '事实文件格式损坏');
    }
    throw error;
  }
}

/**
 * 读取 JSONL 文件，缺失文件视为空账本。
 *
 * @param {string} path JSONL 文件路径
 * @returns {Promise<object[]>} 事件集合
 * @author lvdaxianer@yeah.net
 */
async function readJsonLines(path) {
  try {
    const content = await readFile(path, 'utf8');
    return parseJsonLines(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 将 JSONL 文本解析成事件集合。
 *
 * @param {string} content JSONL 文本
 * @returns {object[]} 事件集合
 * @throws {FactStoreError} JSONL 损坏时抛出
 * @author lvdaxianer@yeah.net
 */
function parseJsonLines(content) {
  return content.split('\n').filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new FactStoreError('FACT_STORE_CORRUPT', 'JSONL 事实文件格式损坏');
    }
  });
}

/**
 * 原子写入 JSON 文件。
 *
 * @param {string} path 目标路径
 * @param {object} value JSON 值
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function writeJsonAtomically(path, value) {
  const directory = join(path, '..');
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  await rename(temporaryPath, path);
}

/**
 * 追加一条 JSONL 记录。
 *
 * @param {string} path JSONL 路径
 * @param {object} value 记录值
 * @returns {Promise<void>} 追加完成
 * @author lvdaxianer@yeah.net
 */
async function appendJsonLine(path, value) {
  await appendFile(path, `${JSON.stringify(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

/**
 * 校验标识符并防止路径穿越。
 *
 * @param {string} value 标识符
 * @param {string} label 字段名称
 * @returns {void}
 * @throws {FactStoreError} 标识符非法时抛出
 * @author lvdaxianer@yeah.net
 */
function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    throw new FactStoreError('FACT_IDENTIFIER_INVALID', `${label}无效`);
  }
}

/**
 * 校验非空文本。
 *
 * @param {unknown} value 待校验值
 * @param {string} label 字段名称
 * @returns {void}
 * @throws {FactStoreError} 文本非法时抛出
 * @author lvdaxianer@yeah.net
 */
function assertText(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new FactStoreError('FACT_FIELD_INVALID', `${label}不能为空`);
  }
}
