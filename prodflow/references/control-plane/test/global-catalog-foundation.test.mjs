import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let root;

/**
 * 清理全局目录基础测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(root, { recursive: true, force: true });
}

afterEach(cleanupProject);

test('项目注册和事实事件信封可幂等写入并保留内容哈希', async () => {
  root = await mkdtemp(join(tmpdir(), 'global-catalog-foundation-'));
  const { ProjectRegistry } = await import('../src/project-registry.mjs');
  const { createFactEnvelope } = await import('../src/fact-events.mjs');
  const registry = new ProjectRegistry({ sharedRoot: root });

  const first = await registry.registerProject({
    projectId: 'PROJECT-A',
    projectRoot: join(root, 'project-a'),
    name: '项目 A'
  });
  const repeated = await registry.registerProject({
    projectId: 'PROJECT-A',
    projectRoot: join(root, 'project-a'),
    name: '项目 A'
  });
  assert.equal(first.projectId, repeated.projectId);
  assert.deepEqual(await registry.listProjects(), [repeated]);

  const envelope = createFactEnvelope({
    eventId: 'EVENT-001',
    operationId: 'OP-001',
    sourceProjectId: 'PROJECT-A',
    eventType: 'ownership_changed',
    payload: { from: 'unknown', to: 'project' }
  });
  assert.match(envelope.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(envelope.schemaVersion, 1);
  const registryFile = join(root, 'registry', 'projects', 'PROJECT-A.json');
  await access(registryFile);
  assert.equal(JSON.parse(await readFile(registryFile, 'utf8')).projectId, 'PROJECT-A');
});

test('相同项目 ID 绑定不同路径时阻止注册', async () => {
  root = await mkdtemp(join(tmpdir(), 'global-catalog-foundation-'));
  const { ProjectRegistry } = await import('../src/project-registry.mjs');
  const registry = new ProjectRegistry({ sharedRoot: root });
  await registry.registerProject({
    projectId: 'PROJECT-A',
    projectRoot: join(root, 'project-a'),
    name: '项目 A'
  });

  await assert.rejects(
    registry.registerProject({
      projectId: 'PROJECT-A',
      projectRoot: join(root, 'project-b'),
      name: '项目 B'
    }),
    (error) => error.code === 'PROJECT_REGISTRY_CONFLICT'
  );
});

test('SQLite catalog 初始化固定 schema 且删除数据库后可重新创建', async () => {
  root = await mkdtemp(join(tmpdir(), 'global-catalog-foundation-'));
  const { SqliteCatalog } = await import('../src/sqlite-catalog.mjs');
  const dbPath = join(root, 'control-plane', 'catalog.sqlite');
  const first = new SqliteCatalog({ dbPath });
  const tables = first.listTables();
  assert.ok(tables.includes('projects'));
  assert.ok(tables.includes('knowledge_items'));
  assert.ok(tables.includes('ownership_history'));
  assert.ok(tables.includes('sync_checkpoints'));
  assert.equal(first.schemaVersion(), 1);
  first.close();

  await rm(dbPath);
  const rebuilt = new SqliteCatalog({ dbPath });
  assert.equal(rebuilt.schemaVersion(), 1);
  rebuilt.close();
});
