import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

let projectRoot;
let sharedKnowledgeRoot;

/**
 * 清理知识治理测试目录。
 *
 * @returns {Promise<void>} 清理完成
 * @author lvdaxianer@yeah.net
 */
async function cleanupKnowledge() {
  await rm(projectRoot, { recursive: true, force: true });
  await rm(sharedKnowledgeRoot, { recursive: true, force: true });
}

afterEach(cleanupKnowledge);

/**
 * 创建知识治理测试实例。
 *
 * @returns {Promise<import('../src/knowledge-governance.mjs').KnowledgeStore>} 知识库
 * @author lvdaxianer@yeah.net
 */
async function createStore() {
  projectRoot = await mkdtemp(join(tmpdir(), 'product-knowledge-project-'));
  sharedKnowledgeRoot = await mkdtemp(join(tmpdir(), 'product-knowledge-shared-'));
  const { KnowledgeStore } = await import('../src/knowledge-governance.mjs');
  return new KnowledgeStore({ projectRoot, sharedKnowledgeRoot });
}

/**
 * 创建最小失败事件。
 *
 * @param {string} eventId 事件 ID
 * @returns {object} 错误事件
 * @author lvdaxianer@yeah.net
 */
function createError(eventId) {
  return {
    eventId,
    runId: 'RUN-KNOWLEDGE-001',
    featureId: 'FEATURE-001',
    acceptanceId: 'AC-001',
    title: '验收断言失败',
    description: '实际状态与预期状态不一致',
    phase: 'verification',
    severity: 'high',
    evidenceRefs: ['evidence://verification/001'],
    rootCauseHints: ['输入校验缺失']
  };
}

test('错误先落为 unknown/pending，后台分类建议不阻塞主流程', async () => {
  const store = await createStore();
  await store.recordError(createError('ERR-001'));
  let classifierStarted = false;
  const classification = store.classifyInBackground('ERR-001', async () => {
    classifierStarted = true;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { scope: 'project', confidence: 0.9, rationale: '依赖项目验收环境' };
  });

  const rawEvent = await store.readEvent('ERR-001');
  assert.equal(rawEvent.scope, 'unknown');
  assert.equal(rawEvent.classificationStatus, 'pending');
  await classification;
  assert.equal(classifierStarted, true);
  const suggestion = await store.readClassification('ERR-001');
  assert.equal(suggestion.suggestedScope, 'project');
  assert.equal(suggestion.status, 'completed');
});

test('人工覆盖优先，并将项目问题写入项目知识与审计链', async () => {
  const store = await createStore();
  await store.recordError(createError('ERR-002'));
  await store.applyDecision('ERR-002', {
    scope: 'project',
    severity: 'medium',
    title: '项目接口参数校验问题',
    rootCause: '当前项目 API 约定不一致',
    solution: '在项目适配层增加参数校验',
    lifecycle: 'active'
  }, { operator: 'human-reviewer', reason: '只在当前项目接口出现' });

  const state = await store.resolveEvent('ERR-002');
  const projectLesson = join(projectRoot, '.product', 'knowledge', 'lessons', 'ERR-002.json');
  const auditPath = join(projectRoot, '.product', 'knowledge', 'audit.jsonl');
  assert.equal(state.scope, 'project');
  assert.equal(state.severity, 'medium');
  assert.equal(state.decisionSource, 'human');
  await access(projectLesson);
  assert.match(await readFile(auditPath, 'utf8'), /human-reviewer/);
});

test('共通知识发布必须满足脱敏、可移植、依据和独立复检', async () => {
  const store = await createStore();
  await store.recordError(createError('ERR-003'));
  await store.applyDecision('ERR-003', {
    scope: 'common',
    title: '输入边界校验缺失',
    rootCause: '通用输入校验不完整',
    solution: '在入口统一校验边界并增加回归断言',
    lifecycle: 'active'
  }, { operator: 'human-reviewer', reason: '可脱离项目复用' });

  await assert.rejects(
    () => store.publishCommon('ERR-003', {
      sanitized: false,
      portable: false,
      independentReproductions: 0,
      reviewedBy: []
    }, { operator: 'human-reviewer', reason: '证据不足' })
  );
  await store.publishCommon('ERR-003', {
    sanitized: true,
    portable: true,
    independentReproductions: 2,
    normativeRefs: ['spec://input-validation'],
    reviewedBy: ['product-reviewer', 'engineering-reviewer']
  }, { operator: 'human-reviewer', reason: '通过公共晋升门禁' });

  const guardrail = join(sharedKnowledgeRoot, 'common', 'guardrails', 'ERR-003.json');
  await access(guardrail);
  assert.match(await readFile(guardrail, 'utf8'), /输入边界校验缺失/);
});

test('hybrid 和 excluded 由人工决定，排除事件不进入知识快照', async () => {
  const store = await createStore();
  await store.recordError(createError('ERR-004'));
  await store.applyDecision('ERR-004', {
    scope: 'hybrid',
    title: '通用原则的项目适配',
    rootCause: '通用校验规则与项目接口适配层耦合',
    solution: '公共规则保持抽象，项目适配器保存字段映射',
    lifecycle: 'active'
  }, { operator: 'human-reviewer', reason: '通用规则加项目实现' });
  const hybridAdapter = join(projectRoot, '.product', 'knowledge', 'adapters', 'ERR-004.json');
  await access(hybridAdapter);

  await store.recordError(createError('ERR-005'));
  await store.applyDecision('ERR-005', {
    scope: 'project',
    title: '排除的重复噪音',
    lifecycle: 'excluded'
  }, { operator: 'human-reviewer', reason: '确认是重复噪音' });
  const snapshot = await store.createLessonSnapshot({ maxItems: 10 });

  assert.equal(snapshot.items.some((item) => item.eventId === 'ERR-005'), false);
  assert.equal(snapshot.items.some((item) => item.eventId === 'ERR-004'), true);
});

test('知识快照按预算截断，只暴露有限规则和证据引用', async () => {
  const store = await createStore();
  for (const eventId of ['ERR-006', 'ERR-007', 'ERR-008']) {
    await store.recordError(createError(eventId));
    await store.applyDecision(eventId, {
      scope: 'project',
      title: `项目规则 ${eventId}`,
      rootCause: '项目根因',
      solution: '项目解决方案',
      lifecycle: 'active'
    }, { operator: 'human-reviewer', reason: '项目知识' });
  }
  const snapshot = await store.createLessonSnapshot({ maxItems: 2 });

  assert.equal(snapshot.items.length, 2);
  assert.equal(snapshot.truncated, true);
  assert.equal('description' in snapshot.items[0], false);
  assert.deepEqual(snapshot.items[0].evidenceRefs, ['evidence://verification/001']);
});
