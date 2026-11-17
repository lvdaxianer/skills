import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let root;

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function createFixture() {
  root = await mkdtemp(join(tmpdir(), 'global-knowledge-api-'));
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
  const { GlobalKnowledgeCatalog } = await import('../src/global-knowledge-catalog.mjs');
  const registry = new ProjectRegistry({ sharedRoot });
  await registry.registerProject({ projectId: 'PROJECT-A', projectRoot: projectA, name: '项目 A' });
  await registry.registerProject({ projectId: 'PROJECT-B', projectRoot: projectB, name: '项目 B' });
  const catalog = new SqliteCatalog({ dbPath: join(sharedRoot, 'control-plane', 'catalog.sqlite') });
  const projector = new KnowledgeProjector({ sharedRoot, registry, catalog });
  const globalCatalog = new GlobalKnowledgeCatalog({ sharedRoot, registry, catalog, projector });
  return { sharedRoot, projectA, projectB, registry, catalog, projector, globalCatalog };
}

async function writeProjectEvent(projectRoot, event) {
  await writeFile(
    join(projectRoot, '.product', 'knowledge', 'events', `${event.eventId}.json`),
    `${JSON.stringify({ lifecycle: 'active', severity: 'medium', scope: 'project', ...event })}\n`
  );
}

async function writeCommonRule(sharedRoot, rule) {
  await writeFile(
    join(sharedRoot, 'common', 'guardrails', `${rule.eventId}.json`),
    `${JSON.stringify({ lifecycle: 'active', severity: 'medium', scope: 'common', ...rule })}\n`
  );
}

test('全局问题支持文件优先 CRUD、软删除恢复和操作追踪', async () => {
  const { projectA, globalCatalog } = await createFixture();
  const created = await globalCatalog.createProblem({
    projectId: 'PROJECT-A',
    problem: { eventId: 'EVENT-CREATE', title: '新问题', solution: '初始方案' },
    audit: { operator: 'alice', reason: '录入问题' }
  });
  const eventPath = join(projectA, '.product', 'knowledge', 'events', 'EVENT-CREATE.json');
  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  assert.match(created.operationId, /^OP-/);
  assert.equal(event.title, '新问题');
  assert.equal(event.operationId, created.operationId);

  const updated = await globalCatalog.updateProblem('EVENT-CREATE', {
    solution: '修订方案',
    severity: 'high'
  }, { operator: 'alice', reason: '补充解决方案' });
  assert.match(updated.operationId, /^OP-/);
  const decision = JSON.parse(await readFile(
    join(projectA, '.product', 'knowledge', 'decisions', 'EVENT-CREATE.json'),
    'utf8'
  ));
  assert.equal(decision.solution, '修订方案');

  await globalCatalog.changeLifecycle('EVENT-CREATE', 'excluded', {
    operator: 'alice', reason: '已确认不再适用'
  });
  assert.equal((await globalCatalog.listProblems({ itemId: 'EVENT-CREATE' }))[0].lifecycle, 'excluded');
  await globalCatalog.changeLifecycle('EVENT-CREATE', 'active', {
    operator: 'alice', reason: '重新启用'
  });
  assert.equal((await globalCatalog.listProblems({ itemId: 'EVENT-CREATE' }))[0].lifecycle, 'active');
  await assert.rejects(
    globalCatalog.updateProblem('EVENT-CREATE', { title: '无审计' }, {}),
    (error) => error.code === 'KNOWLEDGE_AUDIT_REQUIRED'
  );
  globalCatalog.close();
});

test('queryProblems 返回筛选后总数和分页切片', async () => {
  const { projectA, globalCatalog } = await createFixture();
  for (let index = 1; index <= 3; index += 1) {
    await writeProjectEvent(projectA, {
      eventId: `EVENT-PAGE-${index}`,
      title: `分页问题 ${index}`,
      solution: '分页方案'
    });
  }
  await globalCatalog.sync();

  const firstPage = await globalCatalog.queryProblems({ limit: 2, offset: 0 });
  assert.equal(firstPage.items.length, 2);
  assert.equal(firstPage.total, 3);
  assert.equal(firstPage.limit, 2);
  assert.equal(firstPage.offset, 0);

  const secondPage = await globalCatalog.queryProblems({ limit: 2, offset: 2 });
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.items[0].itemId, 'EVENT-PAGE-3');

  const filtered = await globalCatalog.queryProblems({ itemId: 'EVENT-PAGE-2' });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0].itemId, 'EVENT-PAGE-2');

  const unbounded = await globalCatalog.queryProblems();
  assert.equal(unbounded.total, 3);
  assert.equal(unbounded.items.length, 3);
  globalCatalog.close();
});

test('归属移动和规则复制分别落 ownership_changed 与 rule_reused 事实', async () => {
  const { sharedRoot, projectA, projectB, globalCatalog } = await createFixture();
  await writeProjectEvent(projectA, {
    eventId: 'EVENT-MOVE', title: '项目问题', solution: '项目方案', owningProjectId: 'PROJECT-A'
  });
  await writeCommonRule(sharedRoot, {
    eventId: 'RULE-COMMON', title: '公共规则', solution: '通用方案', ruleKey: 'login'
  });
  await globalCatalog.sync();
  await globalCatalog.moveOwnership('EVENT-MOVE', {
    scope: 'project', projectId: 'PROJECT-B'
  }, { operator: 'bob', reason: '转移维护责任' });
  const movedDecision = JSON.parse(await readFile(
    join(projectA, '.product', 'knowledge', 'decisions', 'EVENT-MOVE.json'),
    'utf8'
  ));
  assert.equal(movedDecision.owningProjectId, 'PROJECT-B');
  assert.equal((await globalCatalog.listHistory('EVENT-MOVE')).at(-1).eventType, 'ownership_changed');

  const reused = await globalCatalog.reuseRule('RULE-COMMON', { projectId: 'PROJECT-B' }, {
    operator: 'bob', reason: '项目需要适配'
  });
  assert.equal(reused.relation, 'hybrid');
  const reusedPath = join(projectB, '.product', 'knowledge', 'events', `${reused.itemId}.json`);
  const reusedEvent = JSON.parse(await readFile(reusedPath, 'utf8'));
  assert.equal(reusedEvent.eventType, 'rule_reused');
  assert.equal((await globalCatalog.listProblems({ itemId: 'RULE-COMMON' }))[0].scope, 'common');
  globalCatalog.close();
});

test('项目规则按 project > hybrid > common 生效并支持跨项目差异', async () => {
  const { sharedRoot, projectA, projectB, globalCatalog } = await createFixture();
  await writeCommonRule(sharedRoot, {
    eventId: 'RULE-COMMON', title: '登录规则', solution: '公共方案', ruleKey: 'login'
  });
  await writeProjectEvent(projectA, {
    eventId: 'RULE-PROJECT', title: '登录规则覆盖', solution: '项目方案', ruleKey: 'login', scope: 'project'
  });
  await writeProjectEvent(projectB, {
    eventId: 'RULE-HYBRID', title: '登录规则适配', solution: '适配方案', ruleKey: 'login', scope: 'hybrid'
  });
  await globalCatalog.sync();

  const projectRules = await globalCatalog.getProjectRules('PROJECT-A');
  const hybridRules = await globalCatalog.getProjectRules('PROJECT-B');
  assert.equal(projectRules.items.find((item) => item.ruleKey === 'login').relation, 'overridden');
  assert.equal(hybridRules.items.find((item) => item.ruleKey === 'login').relation, 'hybrid');
  const differences = await globalCatalog.compareProjects(['PROJECT-A', 'PROJECT-B']);
  assert.ok(differences.differences.some((item) => item.ruleKey === 'login'));

  const eventPath = join(projectA, '.product', 'knowledge', 'events', 'RULE-PROJECT.json');
  await writeFile(eventPath, `${JSON.stringify({ changed: true })}\n`);
  assert.equal((await globalCatalog.getSyncStatus()).status, 'conflict');
  globalCatalog.close();
});
