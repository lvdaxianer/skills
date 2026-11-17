import { createHash, randomUUID } from 'node:crypto';
import {
  readdir,
  readFile,
  rename,
  rm
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const PROJECT_KNOWLEDGE_DIRECTORY = '.product/knowledge';
const EVENT_DIRECTORY = 'events';
const DECISION_DIRECTORY = 'decisions';
const COMMON_GUARDRAIL_DIRECTORY = 'common/guardrails';

/**
 * 管理文件事实源到 SQLite catalog 的幂等投影。
 *
 * @author lvdaxianer@yeah.net
 */
export class KnowledgeProjector {
  /**
   * 创建知识投影器。
   *
   * @param {object} options 投影配置
   * @param {string} options.sharedRoot 公共知识根目录
   * @param {object} options.registry 项目注册器
   * @param {object} options.catalog SQLite catalog
   * @author lvdaxianer@yeah.net
   */
  constructor({ sharedRoot, registry, catalog }) {
    if (typeof sharedRoot !== 'string' || sharedRoot.length === 0) {
      throw new TypeError('共享知识根目录不能为空');
    }
    this.sharedRoot = resolve(sharedRoot);
    this.registry = registry;
    this.catalog = catalog;
  }

  /**
   * 投影全部项目和公共 Guardrail。
   *
   * @returns {Promise<object>} 投影结果
   * @author lvdaxianer@yeah.net
   */
  async syncAll() {
    const projects = await this.registry.listProjects();
    const results = [];
    for (const project of projects) {
      results.push(await this.syncProject(project));
    }
    results.push(await this.syncCommon());
    const hasErrors = results.some((result) => result.status === 'error');
    return { status: hasErrors ? 'partial' : 'synced', results };
  }

  /**
   * 投影单个项目的事件和人工决定。
   *
   * @param {object} project 项目注册事实
   * @returns {Promise<object>} 项目投影结果
   * @author lvdaxianer@yeah.net
   */
  async syncProject(project) {
    const sourceId = `project:${project.projectId}`;
    const sourceRoot = join(project.projectRoot, PROJECT_KNOWLEDGE_DIRECTORY);
    const projectSourcePath = this.registry.projectPath(project.projectId);
    const projectSourceHash = await hashFile(projectSourcePath);
    const entries = await readProjectSource(sourceRoot, project.projectId);
    return this.persistProjection({
      sourceId,
      sourceKind: 'project',
      sourceRoot,
      entries,
      project,
      projectSourcePath,
      projectSourceHash
    });
  }

  /**
   * 投影共享公共 Guardrail。
   *
   * @returns {Promise<object>} 公共投影结果
   * @author lvdaxianer@yeah.net
   */
  async syncCommon() {
    const sourceId = 'common:guardrails';
    const sourceRoot = join(this.sharedRoot, COMMON_GUARDRAIL_DIRECTORY);
    const files = await listJsonFiles(sourceRoot);
    const entries = await readCommonEntries(files);
    return this.persistProjection({ sourceId, sourceKind: 'common', sourceRoot, entries });
  }

  /**
   * 将一个事实源的读取结果在单个事务内写入 SQLite。
   *
   * @param {object} input 投影输入
   * @returns {object} 投影结果
   * @author lvdaxianer@yeah.net
   */
  persistProjection({
    sourceId,
    sourceKind,
    sourceRoot,
    entries,
    project,
    projectSourcePath,
    projectSourceHash
  }) {
    const checkpoint = createCheckpoint({
      sourceId,
      sourceKind,
      sourcePath: sourceRoot,
      sourceHash: aggregateHashes(entries.hashes),
      status: entries.errors.length > 0 ? 'error' : 'synced',
      error: entries.errors[0]
    });
    this.catalog.transaction(() => this.writeProjection({
      sourceRoot,
      entries,
      checkpoint,
      project,
      projectSourcePath,
      projectSourceHash
    }));
    return summarizeProjection(sourceId, checkpoint, entries);
  }

  /**
   * 写入投影内容、项目注册、错误和检查点。
   *
   * @param {object} input 投影写入输入
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  writeProjection({
    sourceRoot,
    entries,
    checkpoint,
    project,
    projectSourcePath,
    projectSourceHash
  }) {
    this.catalog.deleteKnowledgeForSource(sourceRoot);
    if (project) {
      this.catalog.upsertProject(project, projectSourcePath, projectSourceHash);
    }
    entries.items.forEach((item) => this.catalog.upsertKnowledgeItem(item));
    entries.errors.forEach((error) => this.catalog.recordProjectionError(error));
    this.catalog.upsertCheckpoint(checkpoint);
  }

  /**
   * 从所有文件事实构建临时 catalog 并原子替换当前 SQLite。
   *
   * @returns {Promise<object>} 重建结果
   * @author lvdaxianer@yeah.net
   */
  async rebuild() {
    const temporaryPath = `${this.catalog.dbPath}.rebuild-${randomUUID()}`;
    const temporaryCatalog = new this.catalog.constructor({ dbPath: temporaryPath });
    let replaced = false;
    try {
      const result = await this.rebuildTemporaryCatalog(temporaryCatalog);
      replaced = result.replaced;
      return result;
    } finally {
      await this.cleanupRebuild(temporaryCatalog, temporaryPath, replaced);
    }
  }

  /**
   * 构建临时 catalog 并执行原子替换。
   *
   * @param {object} temporaryCatalog 临时 catalog
   * @returns {Promise<object>} 重建结果
   * @author lvdaxianer@yeah.net
   */
  async rebuildTemporaryCatalog(temporaryCatalog) {
    const projector = new KnowledgeProjector({
      sharedRoot: this.sharedRoot,
      registry: this.registry,
      catalog: temporaryCatalog
    });
    const result = await projector.syncAll();
    if (result.status !== 'synced') return { ...result, status: 'error', replaced: false };
    this.catalog.close();
    await rename(temporaryCatalog.dbPath, this.catalog.dbPath);
    this.catalog.open();
    return { ...result, replaced: true };
  }

  /**
   * 清理临时 catalog，失败时重新打开旧 catalog。
   *
   * @param {object} temporaryCatalog 临时 catalog
   * @param {string} temporaryPath 临时路径
   * @param {boolean} replaced 是否已经替换
   * @returns {Promise<void>} 清理完成
   * @author lvdaxianer@yeah.net
   */
  async cleanupRebuild(temporaryCatalog, temporaryPath, replaced) {
    temporaryCatalog.close();
    if (!replaced) {
      await rm(temporaryPath, { force: true });
      if (!this.catalog.db) this.catalog.open();
    }
  }

  /**
   * 检查文件内容与当前投影哈希是否一致。
   *
   * @returns {Promise<object>} 漂移结果
   * @author lvdaxianer@yeah.net
   */
  async detectDrift() {
    const rows = this.catalog.listKnowledgeItems();
    const sources = new Set();
    for (const row of rows) {
      try {
        const contentHash = await hashProjectedSource(row);
        if (contentHash !== row.sourceHash) sources.add(sourceIdForRow(row));
      } catch {
        sources.add(sourceIdForRow(row));
      }
    }
    return { status: sources.size > 0 ? 'conflict' : 'synced', sources: [...sources] };
  }
}

/**
 * 读取项目事件和决定。
 *
 * @param {string[]} eventFiles 事件文件
 * @param {string} decisionRoot 决定目录
 * @param {string} projectId 项目 ID
 * @returns {Promise<object>} 读取结果
 * @author lvdaxianer@yeah.net
 */
async function readProjectEntries(eventFiles, decisionRoot, projectId) {
  const results = await Promise.all(eventFiles.map((eventPath) => readProjectEntry(
    eventPath,
    decisionRoot,
    projectId
  )));
  return combineEntryResults(results);
}

/**
 * 读取项目目录并返回事件事实集合。
 *
 * @param {string} sourceRoot 项目知识目录
 * @param {string} projectId 项目 ID
 * @returns {Promise<object>} 事件读取结果
 * @author lvdaxianer@yeah.net
 */
async function readProjectSource(sourceRoot, projectId) {
  const eventRoot = join(sourceRoot, EVENT_DIRECTORY);
  const decisionRoot = join(sourceRoot, DECISION_DIRECTORY);
  const eventFiles = await listJsonFiles(eventRoot);
  return readProjectEntries(eventFiles, decisionRoot, projectId);
}

/**
 * 读取单个项目事件及其人工决定。
 *
 * @param {string} eventPath 事件路径
 * @param {string} decisionRoot 决定目录
 * @param {string} projectId 项目 ID
 * @returns {Promise<object>} 单条读取结果
 * @author lvdaxianer@yeah.net
 */
async function readProjectEntry(eventPath, decisionRoot, projectId) {
  const eventId = basename(eventPath, '.json');
  try {
    const eventText = await readFile(eventPath, 'utf8');
    const event = JSON.parse(eventText);
    const decision = await readOptionalJson(join(decisionRoot, `${eventId}.json`));
    const sourceHash = hashText(JSON.stringify({ eventText, decision }));
    return { item: toKnowledgeItem({ event, decision, projectId, eventPath, sourceHash }), sourceHash };
  } catch (error) {
    return { error: createProjectionError({ sourceId: `project:${projectId}`, eventId, error }) };
  }
}

/**
 * 读取公共 Guardrail 文件。
 *
 * @param {string[]} files Guardrail 文件
 * @returns {Promise<object>} 读取结果
 * @author lvdaxianer@yeah.net
 */
async function readCommonEntries(files) {
  const results = await Promise.all(files.map((sourcePath) => readCommonEntry(sourcePath)));
  return combineEntryResults(results);
}

/**
 * 读取单个公共 Guardrail 文件。
 *
 * @param {string} sourcePath Guardrail 路径
 * @returns {Promise<object>} 单条读取结果
 * @author lvdaxianer@yeah.net
 */
async function readCommonEntry(sourcePath) {
  const eventId = basename(sourcePath, '.json');
  try {
    const text = await readFile(sourcePath, 'utf8');
    const record = JSON.parse(text);
    const sourceHash = hashText(text);
    return {
      item: toKnowledgeItem({
        event: record,
        projectId: null,
        eventPath: sourcePath,
        sourceHash,
        fallbackEventId: eventId,
        fallbackScope: 'common'
      }),
      sourceHash
    };
  } catch (error) {
    return { error: createProjectionError({ sourceId: 'common:guardrails', eventId, error }) };
  }
}

/**
 * 合并并行读取结果。
 *
 * @param {object[]} results 单条读取结果
 * @returns {object} 聚合结果
 * @author lvdaxianer@yeah.net
 */
function combineEntryResults(results) {
  return {
    items: results.flatMap((result) => result.item ? [result.item] : []),
    hashes: results.flatMap((result) => result.sourceHash ? [result.sourceHash] : []),
    errors: results.flatMap((result) => result.error ? [result.error] : [])
  };
}

/**
 * 将文件事件转换为 SQLite 当前状态。
 *
 * @param {object} input 事件输入
 * @returns {object} 知识投影
 * @author lvdaxianer@yeah.net
 */
function toKnowledgeItem({
  event,
  decision,
  projectId,
  eventPath,
  sourceHash,
  fallbackEventId,
  fallbackScope
}) {
  const state = { ...event, ...(decision ?? {}) };
  const scope = state.scope ?? fallbackScope ?? 'unknown';
  const owningProjectId = scope === 'common'
    ? null
    : state.owningProjectId ?? projectId;
  return {
    itemId: state.eventId ?? fallbackEventId,
    sourceProjectId: projectId,
    scope,
    owningProjectId,
    title: state.title ?? state.summary ?? state.eventType ?? '未命名问题',
    lifecycle: state.lifecycle ?? 'active',
    severity: state.severity ?? 'info',
    payloadJson: JSON.stringify({ event, decision: decision ?? null }),
    sourcePath: eventPath,
    sourceHash,
    sourceVersion: Number(state.version) || 1,
    updatedAt: state.updatedAt ?? state.createdAt ?? new Date().toISOString()
  };
}

/**
 * 列出目录内 JSON 文件，目录不存在视为空。
 *
 * @param {string} directory 目录
 * @returns {Promise<string[]>} 文件路径
 * @author lvdaxianer@yeah.net
 */
async function listJsonFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => join(directory, entry.name))
      .sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * 生成单个事实源的投影摘要。
 *
 * @param {string} sourceId 来源 ID
 * @param {object} checkpoint 同步检查点
 * @param {object} entries 读取结果
 * @returns {object} 投影摘要
 * @author lvdaxianer@yeah.net
 */
function summarizeProjection(sourceId, checkpoint, entries) {
  return {
    sourceId,
    status: checkpoint.status,
    itemCount: entries.items.length,
    errorCount: entries.errors.length
  };
}

/**
 * 读取可选 JSON 文件。
 *
 * @param {string} path 文件路径
 * @returns {Promise<object|undefined>} JSON 内容
 * @author lvdaxianer@yeah.net
 */
async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * 创建同步检查点。
 *
 * @param {object} input 检查点输入
 * @returns {object} 检查点
 * @author lvdaxianer@yeah.net
 */
function createCheckpoint({ sourceId, sourceKind, sourcePath, sourceHash, status, error }) {
  return {
    sourceId,
    sourceKind,
    sourcePath,
    cursor: new Date().toISOString(),
    sourceHash,
    status,
    errorCode: error?.errorCode ?? null,
    errorMessage: error?.errorMessage ?? null,
    updatedAt: new Date().toISOString()
  };
}

/**
 * 创建投影错误。
 *
 * @param {object} input 错误输入
 * @returns {object} 投影错误
 * @author lvdaxianer@yeah.net
 */
function createProjectionError({ sourceId, eventId, error }) {
  return {
    errorId: `PROJECTION-${hashText(`${sourceId}:${eventId}`).slice(7)}`,
    sourceId,
    eventId,
    errorCode: 'SOURCE_FILE_INVALID',
    errorMessage: error instanceof SyntaxError ? '事实文件不是有效 JSON' : error.message,
    retryable: true,
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };
}

/**
 * 聚合文件哈希。
 *
 * @param {string[]} hashes 哈希集合
 * @returns {string} 聚合哈希
 * @author lvdaxianer@yeah.net
 */
function aggregateHashes(hashes) {
  return hashText(hashes.sort().join('|'));
}

/**
 * 读取文件哈希。
 *
 * @param {string} path 文件路径
 * @returns {Promise<string>} SHA-256
 * @author lvdaxianer@yeah.net
 */
async function hashFile(path) {
  return hashText(await readFile(path, 'utf8'));
}

/**
 * 计算投影行对应的事实源哈希。
 *
 * 项目问题由事件文件和同名人工决定共同组成，公共规则只由自身文件组成。
 *
 * @param {object} row 投影行
 * @returns {Promise<string>} SHA-256
 * @author lvdaxianer@yeah.net
 */
async function hashProjectedSource(row) {
  if (!row.sourceProjectId) return hashFile(row.sourcePath);
  const eventText = await readFile(row.sourcePath, 'utf8');
  const decisionPath = join(
    dirname(dirname(row.sourcePath)),
    DECISION_DIRECTORY,
    basename(row.sourcePath)
  );
  const decision = await readOptionalJson(decisionPath);
  return hashText(JSON.stringify({ eventText, decision }));
}

/**
 * 计算文本哈希。
 *
 * @param {string} text 文本
 * @returns {string} SHA-256
 * @author lvdaxianer@yeah.net
 */
function hashText(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

/**
 * 从投影行推导同步来源 ID。
 *
 * @param {object} row 投影行
 * @returns {string} 来源 ID
 * @author lvdaxianer@yeah.net
 */
function sourceIdForRow(row) {
  return row.sourceProjectId ? `project:${row.sourceProjectId}` : 'common:guardrails';
}
