import { randomUUID } from 'node:crypto';
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  writeFile
} from 'node:fs/promises';
import { join, resolve } from 'node:path';

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const VALID_SCOPES = new Set(['common', 'project', 'hybrid']);
const VALID_LIFECYCLES = new Set(['active', 'excluded', 'deprecated']);
const SCOPE_PRIORITY = { common: 1, hybrid: 2, project: 3 };

/**
 * 表示全局知识目录操作不满足稳定协议。
 *
 * @author lvdaxianer@yeah.net
 */
export class GlobalKnowledgeCatalogError extends Error {
  /**
   * 创建带稳定错误码的全局目录错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'GlobalKnowledgeCatalogError';
    this.code = code;
  }
}

/**
 * 管理跨项目文件事实、SQLite 投影和有效规则视图。
 *
 * @author lvdaxianer@yeah.net
 */
export class GlobalKnowledgeCatalog {
  /**
   * 创建全局知识目录服务。
   *
   * @param {object} options 服务依赖
   * @param {string} options.sharedRoot 公共知识根目录
   * @param {object} options.registry 项目注册器
   * @param {object} options.catalog SQLite catalog
   * @param {object} options.projector 文件投影器
   * @author lvdaxianer@yeah.net
   */
  constructor({ sharedRoot, registry, catalog, projector }) {
    assertText(sharedRoot, '共享知识根目录');
    this.sharedRoot = resolve(sharedRoot);
    this.registry = registry;
    this.catalog = catalog;
    this.projector = projector;
    this.historyRoot = join(this.sharedRoot, 'control-plane', 'history');
  }

  /**
   * 查询 SQLite 中的全局问题。
   *
   * @param {object} filters 查询条件
   * @returns {Promise<object[]>} 问题列表
   * @author lvdaxianer@yeah.net
   */
  async listProblems(filters = {}) {
    const rows = this.catalog.listKnowledgeItems();
    return rows
      .map(toProblem)
      .filter((item) => matchesFilters(item, filters));
  }

  /**
   * 执行项目和公共事实的增量同步。
   *
   * @returns {Promise<object>} 同步结果
   * @author lvdaxianer@yeah.net
   */
  async sync() {
    return this.projector.syncAll();
  }

  /**
   * 从项目文件事实创建问题。
   *
   * @param {object} input 创建输入
   * @returns {Promise<object>} 操作结果
   * @author lvdaxianer@yeah.net
   */
  async createProblem({ projectId, problem, audit }) {
    const project = await this.registry.readProject(projectId);
    const operationId = createOperationId();
    validateAudit(audit);
    const eventId = problem.eventId ?? `EVENT-${randomUUID()}`;
    assertIdentifier(eventId, '问题 ID');
    const event = createProblemEvent({ eventId, operationId, projectId, problem, audit });
    await writeJsonAtomically(
      join(project.projectRoot, '.product', 'knowledge', 'events', `${eventId}.json`),
      event
    );
    await this.appendHistory(eventId, createHistory({
      eventId, operationId, eventType: 'problem_created', audit, to: event.scope
    }));
    return this.finishMutation(operationId, projectId, eventId);
  }

  /**
   * 修改问题字段并写入版本化决定事实。
   *
   * @param {string} itemId 问题 ID
   * @param {object} patch 可编辑字段
   * @param {object} audit 审计信息
   * @returns {Promise<object>} 操作结果
   * @author lvdaxianer@yeah.net
   */
  async updateProblem(itemId, patch, audit) {
    return this.applyProblemPatch(itemId, patch, audit, 'problem_updated');
  }

  /**
   * 修改问题生命周期。
   *
   * @param {string} itemId 问题 ID
   * @param {string} lifecycle 目标生命周期
   * @param {object} audit 审计信息
   * @returns {Promise<object>} 操作结果
   * @author lvdaxianer@yeah.net
   */
  async changeLifecycle(itemId, lifecycle, audit) {
    if (!VALID_LIFECYCLES.has(lifecycle)) {
      throw new GlobalKnowledgeCatalogError('KNOWLEDGE_LIFECYCLE_INVALID', '生命周期无效');
    }
    return this.applyProblemPatch(itemId, { lifecycle }, audit, `lifecycle_${lifecycle}`);
  }

  /**
   * 移动问题归属并追加 ownership_changed 事实。
   *
   * @param {string} itemId 问题 ID
   * @param {object} target 目标归属
   * @param {object} audit 审计信息
   * @returns {Promise<object>} 操作结果
   * @author lvdaxianer@yeah.net
   */
  async moveOwnership(itemId, target, audit) {
    validateTarget(target);
    const current = this.requireProblem(itemId);
    const operationId = createOperationId();
    validateAudit(audit);
    const patch = { scope: target.scope, owningProjectId: target.projectId ?? null };
    const result = await this.writeDecision(current, patch, audit, operationId);
    await this.appendHistory(itemId, createHistory({
      eventId: itemId,
      operationId,
      eventType: 'ownership_changed',
      audit,
      from: current.scope,
      to: target.scope,
      fromProjectId: current.owningProjectId,
      toProjectId: target.projectId ?? null
    }));
    return { ...result, item: this.requireProblem(itemId), operationId };
  }

  /**
   * 将公共规则复制为项目 hybrid 适配。
   *
   * @param {string} itemId 公共规则 ID
   * @param {object} target 目标项目
   * @param {object} audit 审计信息
   * @returns {Promise<object>} 复制结果
   * @author lvdaxianer@yeah.net
   */
  async reuseRule(itemId, { projectId }, audit) {
    const source = this.requireProblem(itemId);
    if (source.scope !== 'common') {
      throw new GlobalKnowledgeCatalogError('KNOWLEDGE_REUSE_SOURCE_INVALID', '只有公共规则可以复制复用');
    }
    const project = await this.registry.readProject(projectId);
    validateAudit(audit);
    const operationId = createOperationId();
    const reusedId = `${itemId}--${projectId}`;
    const event = createReuseEvent(source, reusedId, projectId, operationId, audit);
    await writeJsonAtomically(
      join(project.projectRoot, '.product', 'knowledge', 'events', `${reusedId}.json`),
      event
    );
    await this.appendHistory(itemId, createHistory({
      eventId: itemId, operationId, eventType: 'rule_reused', audit,
      to: 'hybrid', toProjectId: projectId
    }));
    const projection = await this.projector.syncProject(project);
    return { operationId, itemId: reusedId, relation: 'hybrid', projection, syncStatus: await this.getSyncStatus() };
  }

  /**
   * 通过最小公共晋升门禁发布公共规则。
   *
   * @param {string} itemId 问题 ID
   * @param {object} review 公共复检结果
   * @param {object} audit 审计信息
   * @returns {Promise<object>} 发布结果
   * @author lvdaxianer@yeah.net
   */
  async publishCommon(itemId, review, audit) {
    validateAudit(audit);
    validatePromotion(review);
    const source = this.requireProblem(itemId);
    const operationId = createOperationId();
    const event = createCommonEvent(source, operationId, review, audit);
    await writeJsonAtomically(join(this.sharedRoot, 'common', 'guardrails', `${itemId}.json`), event);
    await this.appendHistory(itemId, createHistory({
      eventId: itemId, operationId, eventType: 'common_published', audit, to: 'common'
    }));
    const projection = await this.projector.syncCommon();
    return { operationId, itemId, projection, syncStatus: await this.getSyncStatus() };
  }

  /**
   * 注册项目并立即生成其初始投影。
   *
   * @param {object} input 项目注册信息
   * @returns {Promise<object>} 注册结果
   * @author lvdaxianer@yeah.net
   */
  async registerProject(input) {
    const operationId = createOperationId();
    const project = await this.registry.registerProject(input);
    const projection = await this.projector.syncProject(project);
    await this.projector.syncCommon();
    return { operationId, project, projection, syncStatus: await this.getSyncStatus() };
  }

  /**
   * 返回项目有效规则和来源关系。
   *
   * @param {string} projectId 项目 ID
   * @returns {Promise<object>} 项目规则视图
   * @author lvdaxianer@yeah.net
   */
  async getProjectRules(projectId) {
    await this.registry.readProject(projectId);
    const rows = this.catalog.listKnowledgeItems().map(toProblem).filter(isEffectiveCandidate);
    const selected = selectRules(rows, projectId);
    return { projectId, items: selected, syncStatus: await this.getSyncStatus() };
  }

  /**
   * 比较多个项目的有效规则差异。
   *
   * @param {string[]} projectIds 项目 ID 列表
   * @returns {Promise<object>} 差异结果
   * @author lvdaxianer@yeah.net
   */
  async compareProjects(projectIds) {
    if (!Array.isArray(projectIds) || projectIds.length < 2) {
      throw new GlobalKnowledgeCatalogError('KNOWLEDGE_PROJECTS_INVALID', '至少选择两个项目进行比较');
    }
    const views = await Promise.all(projectIds.map((projectId) => this.getProjectRules(projectId)));
    const syncStatus = await this.getSyncStatus();
    return { projects: views, shared: findSharedRules(views), differences: findDifferences(views), syncStatus };
  }

  /**
   * 返回项目注册、checkpoint 和漂移护栏状态。
   *
   * @returns {Promise<object>} 同步状态
   * @author lvdaxianer@yeah.net
   */
  async getSyncStatus() {
    const [projects, drift] = await Promise.all([this.registry.listProjects(), this.projector.detectDrift()]);
    const checkpoints = this.catalog.listCheckpoints();
    const expected = new Set([...projects.map((project) => `project:${project.projectId}`), 'common:guardrails']);
    const missing = [...expected].filter((sourceId) => !checkpoints.some((row) => row.sourceId === sourceId));
    const hasError = checkpoints.some((row) => row.status === 'error');
    const status = getSyncState(drift, hasError, missing);
    return { status, checkpoint: checkpoints, missing, conflicts: drift.sources, isComplete: status === 'synced' };
  }

  /**
   * 从文件事实全量重建 SQLite 投影。
   *
   * @returns {Promise<object>} 重建结果
   * @author lvdaxianer@yeah.net
   */
  async rebuild() {
    return this.projector.rebuild();
  }

  /**
   * 返回某问题的历史事实。
   *
   * @param {string} itemId 问题 ID
   * @returns {Promise<object[]>} 历史记录
   * @author lvdaxianer@yeah.net
   */
  async listHistory(itemId) {
    assertIdentifier(itemId, '问题 ID');
    return readJsonLines(join(this.historyRoot, `${itemId}.jsonl`));
  }

  /**
   * 关闭底层 catalog。
   *
   * @returns {void}
   * @author lvdaxianer@yeah.net
   */
  close() {
    this.catalog.close();
  }

  /**
   * 取得当前问题并转换不存在错误。
   *
   * @param {string} itemId 问题 ID
   * @returns {object} 当前问题
   * @author lvdaxianer@yeah.net
   */
  requireProblem(itemId) {
    assertIdentifier(itemId, '问题 ID');
    const row = this.catalog.listKnowledgeItems().find((item) => item.itemId === itemId);
    if (!row) throw new GlobalKnowledgeCatalogError('KNOWLEDGE_NOT_FOUND', '问题不存在');
    return toProblem(row);
  }

  /**
   * 写入修改决定、历史事实并重新投影。
   *
   * @param {string} itemId 问题 ID
   * @param {object} patch 修改字段
   * @param {object} audit 审计信息
   * @param {string} eventType 历史事件类型
   * @returns {Promise<object>} 修改结果
   * @author lvdaxianer@yeah.net
   */
  async applyProblemPatch(itemId, patch, audit, eventType) {
    const current = this.requireProblem(itemId);
    validateAudit(audit);
    validatePatch(patch);
    const operationId = createOperationId();
    const result = await this.writeDecision(current, patch, audit, operationId);
    await this.appendHistory(itemId, createHistory({
      eventId: itemId, operationId, eventType, audit, to: patch.scope ?? current.scope
    }));
    return { ...result, item: this.requireProblem(itemId), operationId };
  }

  /**
   * 写入项目决定或公共规则事实。
   *
   * @param {object} current 当前问题
   * @param {object} patch 修改字段
   * @param {object} audit 审计信息
   * @param {string} operationId 操作 ID
   * @returns {Promise<object>} 修改结果
   * @author lvdaxianer@yeah.net
   */
  async writeDecision(current, patch, audit, operationId) {
    const next = {
      ...current, ...patch, operationId, decisionSource: 'human',
      operator: audit.operator, reason: audit.reason, updatedAt: new Date().toISOString()
    };
    if (current.sourceProjectId) {
      const project = await this.registry.readProject(current.sourceProjectId);
      await writeJsonAtomically(
        join(project.projectRoot, '.product', 'knowledge', 'decisions', `${current.itemId}.json`),
        next
      );
      const projection = await this.projector.syncProject(project);
      return { itemId: current.itemId, projection, syncStatus: await this.getSyncStatus() };
    }
    await writeJsonAtomically(join(this.sharedRoot, 'common', 'guardrails', `${current.itemId}.json`), next);
    const projection = await this.projector.syncCommon();
    return { itemId: current.itemId, projection, syncStatus: await this.getSyncStatus() };
  }

  /**
   * 完成新问题操作并返回最新投影。
   *
   * @param {string} operationId 操作 ID
   * @param {string} projectId 项目 ID
   * @param {string} itemId 问题 ID
   * @returns {Promise<object>} 操作结果
   * @author lvdaxianer@yeah.net
   */
  async finishMutation(operationId, projectId, itemId) {
    const project = await this.registry.readProject(projectId);
    const projection = await this.projector.syncProject(project);
    return { operationId, item: this.requireProblem(itemId), projection, syncStatus: await this.getSyncStatus() };
  }

  /**
   * 追加共享历史 JSONL 事实。
   *
   * @param {string} itemId 问题 ID
   * @param {object} record 历史记录
   * @returns {Promise<void>} 写入完成
   * @author lvdaxianer@yeah.net
   */
  async appendHistory(itemId, record) {
    await mkdir(this.historyRoot, { recursive: true });
    await appendFile(join(this.historyRoot, `${itemId}.jsonl`), `${JSON.stringify(record)}\n`, 'utf8');
  }
}

function createOperationId() {
  return `OP-${randomUUID()}`;
}

function createProblemEvent({ eventId, operationId, projectId, problem, audit }) {
  return {
    ...problem,
    schemaVersion: 1,
    eventId,
    operationId,
    sourceProjectId: projectId,
    eventType: 'problem_created',
    scope: 'project',
    owningProjectId: projectId,
    lifecycle: 'active',
    version: 1,
    operator: audit.operator,
    reason: audit.reason,
    createdAt: new Date().toISOString(),
    eventType: 'problem_created',
    scope: 'project',
    owningProjectId: projectId,
    lifecycle: 'active'
  };
}

function createReuseEvent(source, eventId, projectId, operationId, audit) {
  return {
    eventId,
    operationId,
    sourceProjectId: projectId,
    sourceItemId: source.itemId,
    sourceVersion: source.sourceVersion,
    eventType: 'rule_reused',
    scope: 'hybrid',
    owningProjectId: projectId,
    lifecycle: 'active',
    title: source.title,
    solution: source.solution,
    ruleKey: source.ruleKey,
    operator: audit.operator,
    reason: audit.reason,
    createdAt: new Date().toISOString()
  };
}

function createCommonEvent(source, operationId, review, audit) {
  return {
    eventId: source.itemId,
    operationId,
    scope: 'common',
    lifecycle: 'active',
    title: source.title,
    rootCause: source.rootCause,
    solution: source.solution,
    ruleKey: source.ruleKey,
    evidenceRefs: source.evidenceRefs,
    reviewedBy: review.reviewedBy,
    independentReproductions: review.independentReproductions,
    operator: audit.operator,
    reason: audit.reason,
    publishedAt: new Date().toISOString()
  };
}

function createHistory(input) {
  return { ...input, recordedAt: new Date().toISOString() };
}

function toProblem(row) {
  const payload = parsePayload(row.payloadJson);
  const event = payload.event ?? {};
  const decision = payload.decision ?? {};
  return {
    ...event,
    ...decision,
    itemId: row.itemId,
    sourceProjectId: row.sourceProjectId,
    scope: row.scope,
    owningProjectId: row.owningProjectId,
    title: row.title,
    lifecycle: row.lifecycle,
    severity: row.severity,
    sourceVersion: row.sourceVersion,
    sourcePath: row.sourcePath,
    evidenceRefs: event.evidenceRefs ?? [],
    ruleKey: event.ruleKey ?? decision.ruleKey ?? event.fingerprint ?? row.title
  };
}

function parsePayload(payloadJson) {
  try {
    return JSON.parse(payloadJson);
  } catch {
    return {};
  }
}

function matchesFilters(item, filters) {
  return (!filters.itemId || item.itemId === filters.itemId)
    && (!filters.projectId || item.owningProjectId === filters.projectId || item.sourceProjectId === filters.projectId)
    && (!filters.scope || item.scope === filters.scope)
    && (!filters.lifecycle || item.lifecycle === filters.lifecycle)
    && (!filters.severity || item.severity === filters.severity);
}

function isEffectiveCandidate(item) {
  return item.lifecycle === 'active' && VALID_SCOPES.has(item.scope);
}

function selectRules(rows, projectId) {
  const candidates = rows.filter((row) => row.scope === 'common' || row.owningProjectId === projectId);
  const grouped = new Map();
  candidates.forEach((item) => addRuleCandidate(grouped, item));
  return [...grouped.values()].map((items) => decorateSelectedRule(items));
}

function addRuleCandidate(grouped, item) {
  const key = item.ruleKey;
  const current = grouped.get(key) ?? [];
  current.push(item);
  grouped.set(key, current);
}

function decorateSelectedRule(items) {
  const selected = [...items].sort((left, right) => SCOPE_PRIORITY[right.scope] - SCOPE_PRIORITY[left.scope])[0];
  const common = items.find((item) => item.scope === 'common');
  const relation = selected.scope === 'common'
    ? 'inherited'
    : selected.scope === 'project' && common && selected.itemId !== common.itemId
      ? 'overridden'
      : selected.scope;
  return { ...selected, relation, overriddenSource: relation === 'overridden' ? common.itemId : undefined };
}

function findSharedRules(views) {
  const keys = views.map((view) => new Set(view.items.map((item) => item.ruleKey)));
  return [...keys[0]].filter((key) => keys.every((set) => set.has(key)));
}

function findDifferences(views) {
  const keys = new Set(views.flatMap((view) => view.items.map((item) => item.ruleKey)));
  return [...keys].filter((key) => hasRuleDifference(views, key)).map((ruleKey) => ({
    ruleKey,
    projects: views.map((view) => ({
      projectId: view.projectId,
      item: view.items.find((item) => item.ruleKey === ruleKey)
    }))
  }));
}

function hasRuleDifference(views, ruleKey) {
  const signatures = views.map((view) => {
    const item = view.items.find((candidate) => candidate.ruleKey === ruleKey);
    return item ? JSON.stringify([item.solution, item.severity, item.relation]) : 'missing';
  });
  return new Set(signatures).size > 1;
}

function getSyncState(drift, hasError, missing) {
  if (drift.status === 'conflict') return 'conflict';
  if (hasError) return 'error';
  if (missing.length > 0) return 'pending';
  return 'synced';
}

function validateTarget(target) {
  if (!target || !VALID_SCOPES.has(target.scope)) {
    throw new GlobalKnowledgeCatalogError('KNOWLEDGE_SCOPE_INVALID', '归属范围无效');
  }
  if (target.scope === 'project' || target.scope === 'hybrid') {
    assertIdentifier(target.projectId, '目标项目 ID');
  }
}

function validatePatch(patch) {
  if (patch.scope !== undefined) validateTarget({ scope: patch.scope, projectId: patch.owningProjectId });
  if (patch.lifecycle !== undefined && !VALID_LIFECYCLES.has(patch.lifecycle)) {
    throw new GlobalKnowledgeCatalogError('KNOWLEDGE_LIFECYCLE_INVALID', '生命周期无效');
  }
}

function validatePromotion(review) {
  const isValid = review?.sanitized === true
    && review?.portable === true
    && Number(review?.independentReproductions) >= 1;
  if (!isValid) {
    throw new GlobalKnowledgeCatalogError(
      'KNOWLEDGE_PROMOTION_BLOCKED',
      '公共规则未通过脱敏、可移植性和独立复检门禁'
    );
  }
}

function validateAudit(audit) {
  if (!audit || !audit.operator || !audit.reason) {
    throw new GlobalKnowledgeCatalogError('KNOWLEDGE_AUDIT_REQUIRED', '操作者和原因不能为空');
  }
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    throw new GlobalKnowledgeCatalogError('KNOWLEDGE_IDENTIFIER_INVALID', `${label}无效`);
  }
}

function assertText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new GlobalKnowledgeCatalogError('KNOWLEDGE_FIELD_INVALID', `${label}不能为空`);
  }
}

async function writeJsonAtomically(path, value) {
  await mkdir(join(path, '..'), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, path);
}

async function readJsonLines(path) {
  try {
    const content = await readFile(path, 'utf8');
    return content.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
