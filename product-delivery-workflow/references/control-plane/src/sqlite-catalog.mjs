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
    this.db.exec('PRAGMA journal_mode = WAL;');
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
