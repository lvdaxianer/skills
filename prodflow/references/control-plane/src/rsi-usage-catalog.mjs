import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 1;
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rsi_usage_events (
    event_key TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence TEXT NOT NULL,
    evidence_refs_json TEXT NOT NULL,
    recorded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rsi_usage_stats (
    item_id TEXT PRIMARY KEY,
    injected_count INTEGER NOT NULL DEFAULT 0,
    loaded_count INTEGER NOT NULL DEFAULT 0,
    consulted_count INTEGER NOT NULL DEFAULT 0,
    applied_count INTEGER NOT NULL DEFAULT 0,
    unknown_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rsi_usage_run ON rsi_usage_events(run_id);
`;
const STAGE_COLUMNS = Object.freeze({
  injected: 'injected_count',
  loaded: 'loaded_count',
  consulted: 'consulted_count',
  applied: 'applied_count',
  unknown: 'unknown_count'
});

/**
 * 管理 RSI 使用统计的 SQLite 可重建投影。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiUsageCatalog {
  /**
   * 创建使用统计目录。
   *
   * @param {object} options 初始化配置
   * @param {string} options.dbPath SQLite 路径
   * @author lvdaxianer@yeah.net
   */
  constructor({ dbPath }) {
    this.dbPath = resolveRequiredPath(dbPath);
    this.db = undefined;
    this.open();
  }

  /**
   * 打开数据库并初始化使用统计表。
   *
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  open() {
    if (this.db) return;
    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA journal_mode = DELETE;');
    this.db.exec(SCHEMA_SQL);
    this.db.prepare(
      "INSERT INTO schema_meta(key, value) VALUES ('schema_version', ?) "
      + 'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(String(SCHEMA_VERSION));
  }

  /**
   * 批量写入新的使用事件并更新条目聚合计数。
   *
   * @param {object[]} events 已去重事件
   * @returns {number} 实际写入数量
   * @author lvdaxianer@yeah.net
   */
  recordEvents(events) {
    this.assertOpen();
    if (!events.length) return 0;
    let inserted = 0;
    this.transaction(() => {
      events.forEach((event) => {
        inserted += this.insertEvent(event);
      });
    });
    return inserted;
  }

  /**
   * 查询一个条目的使用聚合。
   *
   * @param {string} itemId RSI 条目 ID
   * @returns {object} 使用统计
   * @author lvdaxianer@yeah.net
   */
  getStats(itemId) {
    this.assertOpen();
    const row = this.db.prepare('SELECT * FROM rsi_usage_stats WHERE item_id = ?').get(itemId);
    return mapStatsRow(row, itemId);
  }

  /**
   * 删除全部投影并按照给定事实重放。
   *
   * @param {object[]} events RSI 使用事实
   * @returns {number} 重放事件数
   * @author lvdaxianer@yeah.net
   */
  rebuild(events) {
    this.assertOpen();
    this.transaction(() => {
      this.db.exec('DELETE FROM rsi_usage_events; DELETE FROM rsi_usage_stats;');
      this.insertEvents(events);
    });
    return events.length;
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
   * 在事务中执行投影操作。
   *
   * @param {Function} callback 事务函数
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  transaction(callback) {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      callback();
      this.db.exec('COMMIT;');
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  /**
   * 插入事件并在成功插入时更新聚合。
   *
   * @param {object} event 使用事件
   * @returns {number} 是否插入
   * @author lvdaxianer@yeah.net
   */
  insertEvent(event) {
    const result = this.db.prepare(
      `INSERT OR IGNORE INTO rsi_usage_events
       (event_key, event_id, project_id, run_id, worker_id, snapshot_id, item_id,
        stage, source, confidence, evidence_refs_json, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      event.eventKey, event.eventId, event.projectId, event.runId, event.workerId,
      event.snapshotId, event.itemId, event.stage, event.source, event.confidence,
      JSON.stringify(event.evidenceRefs), event.recordedAt
    );
    if (result.changes === 1) this.incrementStats(event);
    return result.changes;
  }

  /**
   * 批量插入事件，复用同一数据库事务。
   *
   * @param {object[]} events 使用事件
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  insertEvents(events) {
    events.forEach((event) => this.insertEvent(event));
  }

  /**
   * 增加条目对应阶段计数。
   *
   * @param {object} event 使用事件
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  incrementStats(event) {
    const column = STAGE_COLUMNS[event.stage];
    const sql = `INSERT INTO rsi_usage_stats(item_id, ${column}, updated_at)
      VALUES (?, 1, ?)
      ON CONFLICT(item_id) DO UPDATE SET ${column} = ${column} + 1, updated_at = excluded.updated_at`;
    this.db.prepare(sql).run(event.itemId, event.recordedAt);
  }

  /**
   * 确保数据库连接存在。
   *
   * @returns {void}
   * @throws {Error} 数据库未打开
   * @author lvdaxianer@yeah.net
   */
  assertOpen() {
    if (!this.db) throw new Error('RSI 使用统计数据库未打开');
  }
}

function mapStatsRow(row, itemId) {
  return {
    itemId,
    injectedCount: row?.injected_count ?? 0,
    loadedCount: row?.loaded_count ?? 0,
    consultedCount: row?.consulted_count ?? 0,
    appliedCount: row?.applied_count ?? 0,
    unknownCount: row?.unknown_count ?? 0
  };
}

function resolveRequiredPath(path) {
  if (typeof path !== 'string' || path.length === 0) throw new TypeError('SQLite 路径不能为空');
  return path;
}
