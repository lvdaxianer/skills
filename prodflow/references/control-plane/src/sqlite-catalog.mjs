import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 1;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    project_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_root TEXT NOT NULL,
    status TEXT NOT NULL,
    source_path TEXT NOT NULL,
    source_hash TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS knowledge_items (
    item_id TEXT PRIMARY KEY,
    source_project_id TEXT,
    scope TEXT NOT NULL,
    owning_project_id TEXT,
    title TEXT NOT NULL,
    lifecycle TEXT NOT NULL,
    severity TEXT,
    payload_json TEXT NOT NULL,
    source_path TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    source_version INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ownership_history (
    operation_id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    from_scope TEXT,
    to_scope TEXT NOT NULL,
    from_project_id TEXT,
    to_project_id TEXT,
    operator TEXT NOT NULL,
    reason TEXT NOT NULL,
    source_path TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    recorded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rule_bindings (
    binding_id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    relation TEXT NOT NULL,
    source_item_id TEXT,
    source_version INTEGER,
    lifecycle TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sync_checkpoints (
    source_id TEXT PRIMARY KEY,
    source_kind TEXT NOT NULL,
    source_path TEXT NOT NULL,
    cursor TEXT,
    source_hash TEXT,
    status TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projection_errors (
    error_id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    event_id TEXT,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    retryable INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS applied_events (
    operation_id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_knowledge_scope ON knowledge_items(scope);
  CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge_items(owning_project_id);
  CREATE INDEX IF NOT EXISTS idx_bindings_project ON rule_bindings(project_id);
`;

const UPSERT_PROJECT_SQL = `
  INSERT INTO projects(project_id, name, project_root, status, source_path, source_hash, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(project_id) DO UPDATE SET name=excluded.name,
    project_root=excluded.project_root, status=excluded.status,
    source_path=excluded.source_path, source_hash=excluded.source_hash,
    updated_at=excluded.updated_at
`;

const UPSERT_KNOWLEDGE_SQL = `
  INSERT INTO knowledge_items(item_id, source_project_id, scope, owning_project_id, title, lifecycle,
    severity, payload_json, source_path, source_hash, source_version, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(item_id) DO UPDATE SET source_project_id=excluded.source_project_id,
    scope=excluded.scope, owning_project_id=excluded.owning_project_id,
    title=excluded.title, lifecycle=excluded.lifecycle, severity=excluded.severity,
    payload_json=excluded.payload_json, source_path=excluded.source_path,
    source_hash=excluded.source_hash, source_version=excluded.source_version,
    updated_at=excluded.updated_at
`;

const UPSERT_CHECKPOINT_SQL = `
  INSERT INTO sync_checkpoints(source_id, source_kind, source_path, cursor, source_hash, status,
    error_code, error_message, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_id) DO UPDATE SET source_kind=excluded.source_kind,
    source_path=excluded.source_path, cursor=excluded.cursor,
    source_hash=excluded.source_hash, status=excluded.status,
    error_code=excluded.error_code, error_message=excluded.error_message,
    updated_at=excluded.updated_at
`;

const RECORD_ERROR_SQL = `
  INSERT OR REPLACE INTO projection_errors(error_id, source_id, event_id, error_code, error_message,
    retryable, created_at, resolved_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * 管理可重建的 SQLite 查询目录。
 *
 * @author lvdaxianer@yeah.net
 */
export class SqliteCatalog {
  /**
   * 创建或打开 SQLite catalog。
   *
   * @param {object} options 初始化配置
   * @param {string} options.dbPath 数据库路径
   * @author lvdaxianer@yeah.net
   */
  constructor({ dbPath }) {
    if (typeof dbPath !== 'string' || dbPath.length === 0) {
      throw new TypeError('SQLite 路径不能为空');
    }
    this.dbPath = resolve(dbPath);
    this.db = undefined;
    this.open();
  }

  /**
   * 打开数据库并初始化 schema。
   *
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  open() {
    if (this.db) return;
    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA journal_mode = DELETE;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA_SQL);
    this.db.prepare(
      "INSERT INTO schema_meta(key, value) VALUES ('schema_version', ?) "
      + 'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(String(SCHEMA_VERSION));
  }

  /**
   * 返回 schema 版本。
   *
   * @returns {number} schema 版本
   * @author lvdaxianer@yeah.net
   */
  schemaVersion() {
    this.assertOpen();
    const row = this.db.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get();
    return Number(row?.value ?? 0);
  }

  /**
   * 列出业务表名。
   *
   * @returns {string[]} 表名
   * @author lvdaxianer@yeah.net
   */
  listTables() {
    this.assertOpen();
    return this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all().map((row) => row.name);
  }

  /**
   * 在 SQLite 事务中执行投影写入。
   *
   * @param {Function} callback 事务操作
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  transaction(callback) {
    this.assertOpen();
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      // 正常路径提交整个事实源的快照写入。
      callback();
      this.db.exec('COMMIT;');
    } catch (error) {
      // 任一写入失败都回滚，避免产生半套投影。
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  /**
   * 写入项目投影。
   *
   * @param {object} project 项目注册事实
   * @param {string} sourcePath 注册文件路径
   * @param {string} sourceHash 注册文件哈希
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  upsertProject(project, sourcePath, sourceHash) {
    this.assertOpen();
    this.db.prepare(UPSERT_PROJECT_SQL).run(
      project.projectId,
      project.name,
      project.projectRoot,
      project.status,
      sourcePath,
      sourceHash,
      project.updatedAt
    );
  }

  /**
   * 写入知识当前状态投影。
   *
   * @param {object} item 知识投影
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  upsertKnowledgeItem(item) {
    this.assertOpen();
    this.db.prepare(UPSERT_KNOWLEDGE_SQL).run(
      item.itemId,
      item.sourceProjectId,
      item.scope,
      item.owningProjectId,
      item.title,
      item.lifecycle,
      item.severity,
      item.payloadJson,
      item.sourcePath,
      item.sourceHash,
      item.sourceVersion,
      item.updatedAt
    );
  }

  /**
   * 写入同步检查点。
   *
   * @param {object} checkpoint 检查点
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  upsertCheckpoint(checkpoint) {
    this.assertOpen();
    this.db.prepare(UPSERT_CHECKPOINT_SQL).run(
      checkpoint.sourceId,
      checkpoint.sourceKind,
      checkpoint.sourcePath,
      checkpoint.cursor,
      checkpoint.sourceHash,
      checkpoint.status,
      checkpoint.errorCode,
      checkpoint.errorMessage,
      checkpoint.updatedAt
    );
  }

  /**
   * 写入投影错误。
   *
   * @param {object} error 投影错误
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  recordProjectionError(error) {
    this.assertOpen();
    this.db.prepare(RECORD_ERROR_SQL).run(
      error.errorId,
      error.sourceId,
      error.eventId,
      error.errorCode,
      error.errorMessage,
      error.retryable ? 1 : 0,
      error.createdAt,
      error.resolvedAt
    );
  }

  /**
   * 列出知识投影。
   *
   * @returns {object[]} 知识投影集合
   * @author lvdaxianer@yeah.net
   */
  listKnowledgeItems() {
    this.assertOpen();
    return this.db.prepare('SELECT * FROM knowledge_items ORDER BY item_id').all().map(mapKnowledgeRow);
  }

  /**
   * 删除某个事实源前缀下的旧投影。
   *
   * @param {string} sourcePrefix 事实源目录前缀
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  deleteKnowledgeForSource(sourcePrefix) {
    this.assertOpen();
    this.db.prepare(
      'DELETE FROM knowledge_items WHERE substr(source_path, 1, length(?)) = ?'
    ).run(sourcePrefix, sourcePrefix);
  }

  /**
   * 列出同步检查点。
   *
   * @returns {object[]} 检查点集合
   * @author lvdaxianer@yeah.net
   */
  listCheckpoints() {
    this.assertOpen();
    return this.db.prepare('SELECT * FROM sync_checkpoints ORDER BY source_id').all().map(mapCheckpointRow);
  }

  /**
   * 列出投影错误。
   *
   * @returns {object[]} 投影错误集合
   * @author lvdaxianer@yeah.net
   */
  listProjectionErrors() {
    this.assertOpen();
    return this.db.prepare(
      'SELECT * FROM projection_errors ORDER BY source_id, event_id'
    ).all().map(mapProjectionErrorRow);
  }

  /**
   * 关闭数据库连接。
   *
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  close() {
    if (this.db) this.db.close();
    this.db = undefined;
  }

  /**
   * 确保连接可用。
   *
   * @returns {void}
   * @throws {Error} 连接未打开时抛出
   * @author lvdaxianer@yeah.net
   */
  assertOpen() {
    if (!this.db) throw new Error('SQLite catalog 未打开');
  }
}

/**
 * 将 SQLite 知识行映射为应用层字段。
 *
 * @param {object} row SQLite 行
 * @returns {object} 应用层知识行
 * @author lvdaxianer@yeah.net
 */
function mapKnowledgeRow(row) {
  return {
    itemId: row.item_id,
    sourceProjectId: row.source_project_id,
    scope: row.scope,
    owningProjectId: row.owning_project_id,
    title: row.title,
    lifecycle: row.lifecycle,
    severity: row.severity,
    payloadJson: row.payload_json,
    sourcePath: row.source_path,
    sourceHash: row.source_hash,
    sourceVersion: row.source_version,
    updatedAt: row.updated_at
  };
}

/**
 * 将 SQLite 检查点映射为应用层字段。
 *
 * @param {object} row SQLite 行
 * @returns {object} 应用层检查点
 * @author lvdaxianer@yeah.net
 */
function mapCheckpointRow(row) {
  return {
    sourceId: row.source_id,
    sourceKind: row.source_kind,
    sourcePath: row.source_path,
    cursor: row.cursor,
    sourceHash: row.source_hash,
    status: row.status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    updatedAt: row.updated_at
  };
}

/**
 * 将 SQLite 投影错误映射为应用层字段。
 *
 * @param {object} row SQLite 行
 * @returns {object} 应用层投影错误
 * @author lvdaxianer@yeah.net
 */
function mapProjectionErrorRow(row) {
  return {
    errorId: row.error_id,
    sourceId: row.source_id,
    eventId: row.event_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    retryable: Boolean(row.retryable),
    createdAt: row.created_at,
    resolvedAt: row.resolved_at
  };
}
