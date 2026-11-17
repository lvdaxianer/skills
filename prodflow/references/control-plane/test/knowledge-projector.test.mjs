import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let root;

/**
 * 清理投影测试项目。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupProject() {
  await rm(root, { recursive: true, force: true });
}

afterEach(cleanupProject);

async function createFixture() {
  root = await mkdtemp(join(tmpdir(), 'knowledge-projector-'));
  const sharedRoot = join(root, 'shared');
  const projectA = join(root, 'project-a');
  const projectB = join(root, 'project-b');
  await Promise.all([
    mkdir(join(projectA, '.product', 'knowledge', 'events'), { recursive: true }),
    mkdir(join(projectB, '.product', 'knowledge', 'events'), { recursive: true }),
    mkdir(join(sharedRoot, 'common', 'guardrails'), { recursive: true })
  ]);
  const { ProjectRegistry } = await import('../src/project-registry.mjs');
  const { SqliteCatalog } = await import('../src/sqlite-catalog.mjs');
  const { KnowledgeProjector } = await import('../src/knowledge-projector.mjs');
  const registry = new ProjectRegistry({ sharedRoot });
  await registry.registerProject({ projectId: 'PROJECT-A', projectRoot: projectA, name: '项目 A' });
  await registry.registerProject({ projectId: 'PROJECT-B', projectRoot: projectB, name: '项目 B' });
  const catalog = new SqliteCatalog({ dbPath: join(sharedRoot, 'control-plane', 'catalog.sqlite') });
  const projector = new KnowledgeProjector({ sharedRoot, registry, catalog });
  return { sharedRoot, projectA, projectB, catalog, projector };
}

async function writeEvent(projectRoot, eventId, title) {
  const event = {
    eventId,
    eventType: 'error',
    title,
    rootCause: '测试根因',
    solution: '测试解决方案',
    severity: 'high',
    scope: 'unknown',
    lifecycle: 'active',
    evidenceRefs: [`evidence://${eventId}`],
    createdAt: new Date().toISOString()
  };
  await writeFile(
    join(projectRoot, '.product', 'knowledge', 'events', `${eventId}.json`),
    `${JSON.stringify(event)}\n`
  );
}

test('多个项目和公共规则可幂等投影到 SQLite', async () => {
  const { sharedRoot, projectA, projectB, catalog, projector } = await createFixture();
  await writeEvent(projectA, 'EVENT-A', '项目 A 问题');
  await writeEvent(projectB, 'EVENT-B', '项目 B 问题');
  await writeFile(join(sharedRoot, 'common', 'guardrails', 'RULE-C.json'), JSON.stringify({
    eventId: 'RULE-C', title: '公共规则', scope: 'common', lifecycle: 'active',
    severity: 'medium', solution: '公共解决方案', evidenceRefs: []
  }));

  const first = await projector.syncAll();
  const second = await projector.syncAll();
  const rows = catalog.listKnowledgeItems();
  assert.equal(first.status, 'synced');
  assert.equal(second.status, 'synced');
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((row) => row.itemId)).size, 3);
  assert.equal(catalog.listCheckpoints().every((row) => row.status === 'synced'), true);
  catalog.close();
});

test('单个损坏项目事件只隔离该项目并保留其他项目投影', async () => {
  const { projectA, projectB, catalog, projector } = await createFixture();
  await writeEvent(projectA, 'EVENT-A', '项目 A 问题');
  await writeFile(join(projectB, '.product', 'knowledge', 'events', 'BROKEN.json'), '{broken');

  const result = await projector.syncAll();
  await projector.syncAll();
  const rows = catalog.listKnowledgeItems();
  const checkpoints = catalog.listCheckpoints();
  assert.equal(result.status, 'partial');
  assert.equal(rows.some((row) => row.itemId === 'EVENT-A'), true);
  assert.equal(checkpoints.find((row) => row.sourceId === 'project:PROJECT-B').status, 'error');
  assert.equal(catalog.listProjectionErrors().length, 1);
  catalog.close();
});

test('删除 SQLite 后可以从文件事实重建投影', async () => {
  const { sharedRoot, projectA, catalog, projector } = await createFixture();
  await writeEvent(projectA, 'EVENT-A', '项目 A 问题');
  await projector.syncAll();
  const dbPath = join(sharedRoot, 'control-plane', 'catalog.sqlite');
  catalog.close();
  await rm(dbPath);
  const { SqliteCatalog } = await import('../src/sqlite-catalog.mjs');
  const rebuiltCatalog = new SqliteCatalog({ dbPath });
  const rebuiltProjector = new projector.constructor({
    sharedRoot,
    registry: projector.registry,
    catalog: rebuiltCatalog
  });
  const result = await rebuiltProjector.rebuild();
  assert.equal(result.status, 'synced');
  assert.equal(rebuiltCatalog.listKnowledgeItems()[0].itemId, 'EVENT-A');
  rebuiltCatalog.close();
});

test('重建遇到损坏项目时保留旧投影并返回可恢复错误', async () => {
  const { projectA, projectB, catalog, projector } = await createFixture();
  await writeEvent(projectA, 'EVENT-A', '项目 A 问题');
  await projector.syncAll();
  await writeFile(join(projectB, '.product', 'knowledge', 'events', 'BROKEN.json'), '{broken');

  const result = await projector.rebuild();
  assert.equal(result.status, 'error');
  assert.equal(result.replaced, false);
  assert.equal(catalog.listKnowledgeItems()[0].itemId, 'EVENT-A');
  catalog.close();
});

test('源文件内容变化但未重新投影时报告 conflict', async () => {
  const { projectA, catalog, projector } = await createFixture();
  await writeEvent(projectA, 'EVENT-A', '项目 A 问题');
  await projector.syncAll();
  assert.deepEqual(await projector.detectDrift(), { status: 'synced', sources: [] });
  const eventPath = join(projectA, '.product', 'knowledge', 'events', 'EVENT-A.json');
  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  event.solution = '被篡改的解决方案';
  await writeFile(eventPath, JSON.stringify(event));

  const drift = await projector.detectDrift();
  assert.equal(drift.status, 'conflict');
  assert.equal(drift.sources.includes('project:PROJECT-A'), true);
  catalog.close();
});
