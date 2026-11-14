import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const VALID_SCOPES = new Set(['unknown', 'common', 'project', 'hybrid']);
const VALID_LIFECYCLES = new Set(['active', 'excluded', 'deprecated']);
const SEVERITY_SCORE = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

/**
 * 表示知识治理数据不满足稳定协议。
 *
 * @author lvdaxianer@yeah.net
 */
export class KnowledgeGovernanceError extends Error {
  /**
   * 创建带稳定错误码的治理错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'KnowledgeGovernanceError';
    this.code = code;
  }
}

/**
 * 管理项目错误事件、公共候选、人工归属和有限知识快照。
 *
 * @author lvdaxianer@yeah.net
 */
export class KnowledgeStore {
  /**
   * 创建绑定到项目和共享知识根目录的知识库。
   *
   * @param {object} options 初始化配置
   * @param {string} options.projectRoot 项目根目录
   * @param {string} options.sharedKnowledgeRoot 共享知识根目录
   * @author lvdaxianer@yeah.net
   */
  constructor({ projectRoot, sharedKnowledgeRoot }) {
    assertPath(projectRoot, '项目根目录');
    assertPath(sharedKnowledgeRoot, '共享知识根目录');
    this.projectRoot = resolve(projectRoot);
    this.sharedRoot = resolve(sharedKnowledgeRoot);
    this.projectKnowledgeRoot = join(this.projectRoot, '.product', 'knowledge');
    this.commonRoot = join(this.sharedRoot, 'common');
  }

  /**
   * 立即记录错误事件，初始归属固定为 unknown。
   *
   * @param {object} event 错误事件
   * @returns {Promise<object>} 原始错误事件
   * @author lvdaxianer@yeah.net
   */
  async recordError(event) {
    return this.recordEvent({ ...event, eventType: 'error' });
  }

  /**
   * 立即记录成功前的近失误事件。
   *
   * @param {object} event 近失误事件
   * @returns {Promise<object>} 原始近失误事件
   * @author lvdaxianer@yeah.net
   */
  async recordNearMiss(event) {
    return this.recordEvent({ ...event, eventType: 'near_miss' });
  }

  /**
   * 将原始事件写入项目事实源。
   *
   * @param {object} event 事件
   * @returns {Promise<object>} 规范化事件
   * @author lvdaxianer@yeah.net
   */
  async recordEvent(event) {
    validateEvent(event);
    const normalized = {
      ...event,
      scope: 'unknown',
      classificationStatus: 'pending',
      lifecycle: 'active',
      createdAt: new Date().toISOString()
    };
    const path = this.projectPath('events', `${event.eventId}.json`);
    await writeJsonAtomically(path, normalized);
    return normalized;
  }

  /**
   * 读取原始事件，不混入自动建议或人工覆盖。
   *
   * @param {string} eventId 事件 ID
   * @returns {Promise<object>} 原始事件
   * @author lvdaxianer@yeah.net
   */
  async readEvent(eventId) {
    assertIdentifier(eventId, '事件 ID');
    return readJson(this.projectPath('events', `${eventId}.json`));
  }

  /**
   * 将分类任务放入后台队列，不阻塞调用方主流程。
   *
   * @param {string} eventId 事件 ID
   * @param {Function} classifier 分类 Worker
   * @returns {Promise<object>} 后台分类结果
   * @author lvdaxianer@yeah.net
   */
  classifyInBackground(eventId, classifier = defaultClassifier) {
    return new Promise((resolveResult, rejectResult) => {
      setImmediate(() => this.classifyEvent(eventId, classifier).then(resolveResult, rejectResult));
    });
  }

  /**
   * 执行一次分类建议并单独保存，不改写原始事件归属。
   *
   * @param {string} eventId 事件 ID
   * @param {Function} classifier 分类 Worker
   * @returns {Promise<object>} 分类建议
   * @author lvdaxianer@yeah.net
   */
  async classifyEvent(eventId, classifier = defaultClassifier) {
    const event = await this.readEvent(eventId);
    const classification = await executeClassifier(classifier, event);
    const result = {
      eventId,
      status: classification.status,
      suggestedScope: classification.suggestion.scope,
      confidence: classification.suggestion.confidence,
      rationale: classification.suggestion.rationale,
      criteria: classification.suggestion.criteria ?? [],
      completedAt: new Date().toISOString()
    };
    await writeJsonAtomically(this.projectPath('classifications', `${eventId}.json`), result);
    return result;
  }

  /**
   * 读取后台分类建议。
   *
   * @param {string} eventId 事件 ID
   * @returns {Promise<object>} 分类建议
   * @author lvdaxianer@yeah.net
   */
  async readClassification(eventId) {
    assertIdentifier(eventId, '事件 ID');
    return readJson(this.projectPath('classifications', `${eventId}.json`));
  }

  /**
   * 应用人工归属、描述、严重级别或生命周期覆盖。
   *
   * @param {string} eventId 事件 ID
   * @param {object} patch 人工修改
   * @param {object} audit 审计信息
   * @returns {Promise<object>} 当前解析状态
   * @author lvdaxianer@yeah.net
   */
  async applyDecision(eventId, patch, audit) {
    const event = await this.readEvent(eventId);
    validateDecision(patch, audit);
    const decision = {
      ...patch,
      eventId,
      decisionSource: 'human',
      operator: audit.operator,
      reason: audit.reason,
      version: randomUUID(),
      updatedAt: new Date().toISOString()
    };
    await writeJsonAtomically(this.projectPath('decisions', `${eventId}.json`), decision);
    await writeJsonAtomically(this.projectPath('decision-history', `${eventId}-${decision.version}.json`), decision);
    await this.writeScopedKnowledge({ ...event, ...decision });
    await this.appendAudit({
      eventId,
      action: 'human_decision',
      operator: audit.operator,
      reason: audit.reason,
      patch
    });
    return this.resolveEvent(eventId);
  }

  /**
   * 按人工覆盖、自动建议、原始事件的优先级解析当前状态。
   *
   * @param {string} eventId 事件 ID
   * @returns {Promise<object>} 当前知识状态
   * @author lvdaxianer@yeah.net
   */
  async resolveEvent(eventId) {
    const event = await this.readEvent(eventId);
    const decision = await readOptionalJson(this.projectPath('decisions', `${eventId}.json`));
    const suggestion = await readOptionalJson(this.projectPath('classifications', `${eventId}.json`));
    if (decision) {
      return { ...event, ...decision, decisionSource: 'human' };
    }
    return {
      ...event,
      suggestedScope: suggestion?.suggestedScope,
      suggestionConfidence: suggestion?.confidence,
      classificationStatus: suggestion?.status ?? event.classificationStatus
    };
  }

  /**
   * 返回控制台可管理的知识事件列表。
   *
   * @param {object} filters 查询过滤条件
   * @returns {Promise<object[]>} 知识状态列表
   * @author lvdaxianer@yeah.net
   */
  async listKnowledge(filters = {}) {
    const events = await readJsonDirectory(this.projectPath('events'));
    const states = await Promise.all(events.map((event) => this.resolveEvent(event.eventId)));
    return states.filter((state) => matchesKnowledgeFilters(state, filters));
  }

  /**
   * 通过公共晋升门禁发布 Guardrail。
   *
   * @param {string} eventId 事件 ID
   * @param {object} review 独立复检和脱敏结果
   * @param {object} audit 审计信息
   * @returns {Promise<object>} 公共 Guardrail
   * @throws {KnowledgeGovernanceError} 晋升条件不足时抛出
   * @author lvdaxianer@yeah.net
   */
  async publishCommon(eventId, review, audit) {
    const state = await this.resolveEvent(eventId);
    validatePromotion(state, review, audit);
    const guardrail = {
      eventId,
      scope: 'common',
      title: state.title,
      rootCause: state.rootCause,
      solution: state.solution,
      evidenceRefs: state.evidenceRefs ?? [],
      publishedAt: new Date().toISOString(),
      reviewedBy: review.reviewedBy,
      independentReproductions: review.independentReproductions
    };
    await writeJsonAtomically(join(this.commonRoot, 'guardrails', `${eventId}.json`), guardrail);
    await this.appendAudit({
      eventId,
      action: 'common_guardrail_published',
      operator: audit.operator,
      reason: audit.reason,
      patch: { scope: 'common' }
    });
    return guardrail;
  }

  /**
   * 生成有限知识快照，排除已排除或已废弃条目。
   *
   * @param {object} options 快照配置
   * @param {number} options.maxItems 最大条目数
   * @returns {Promise<object>} lesson snapshot
   * @author lvdaxianer@yeah.net
   */
  async createLessonSnapshot({ maxItems = 20 } = {}) {
    const candidates = await this.readSnapshotCandidates();
    const sorted = candidates.sort(compareKnowledge).map(toSnapshotItem);
    const items = sorted.slice(0, maxItems);
    const snapshot = {
      snapshotId: `LESSON-SNAPSHOT-${randomUUID()}`,
      maxItems,
      truncated: sorted.length > items.length,
      items,
      generatedAt: new Date().toISOString()
    };
    await writeJsonAtomically(this.projectPath('snapshots', `${snapshot.snapshotId}.json`), snapshot);
    return snapshot;
  }

  /**
   * 写入项目范围的知识文件或 hybrid adapter。
   *
   * @param {object} state 当前知识状态
   * @returns {Promise<void>} 写入完成
   * @author lvdaxianer@yeah.net
   */
  async writeScopedKnowledge(state) {
    if (state.lifecycle === 'excluded' || state.lifecycle === 'deprecated') {
      return;
    }
    if (state.scope === 'project' || state.scope === 'hybrid') {
      await writeJsonAtomically(this.projectPath('lessons', `${state.eventId}.json`), state);
    }
    if (state.scope === 'hybrid') {
      await writeJsonAtomically(this.projectPath('adapters', `${state.eventId}.json`), {
        eventId: state.eventId,
        scope: 'hybrid',
        solution: state.solution,
        updatedAt: state.updatedAt
      });
    }
    if (state.scope === 'common') {
      await writeJsonAtomically(this.projectPath('lessons', `${state.eventId}.json`), {
        eventId: state.eventId,
        scope: 'common',
        lifecycle: 'candidate',
        title: state.title,
        rootCause: state.rootCause,
        solution: state.solution
      });
    }
  }

  /**
   * 追加治理审计事件。
   *
   * @param {object} audit 审计事件
   * @returns {Promise<void>} 写入完成
   * @author lvdaxianer@yeah.net
   */
  async appendAudit(audit) {
    const path = this.projectPath('audit.jsonl');
    await mkdir(join(path, '..'), { recursive: true });
    await appendFile(path, `${JSON.stringify({ ...audit, recordedAt: new Date().toISOString() })}\n`, 'utf8');
  }

  /**
   * 读取项目和公共知识候选。
   *
   * @returns {Promise<object[]>} 可进入快照的候选
   * @author lvdaxianer@yeah.net
   */
  async readSnapshotCandidates() {
    const projectItems = await readJsonDirectory(this.projectPath('lessons'));
    const hybridItems = await readJsonDirectory(this.projectPath('adapters'));
    const commonItems = await readJsonDirectory(join(this.commonRoot, 'guardrails'));
    return [...projectItems, ...hybridItems, ...commonItems]
      .filter((item) => !['excluded', 'deprecated', 'candidate'].includes(item.lifecycle));
  }

  /**
   * 返回项目知识路径。
   *
   * @param {...string} segments 相对路径
   * @returns {string} 项目知识路径
   * @author lvdaxianer@yeah.net
   */
  projectPath(...segments) {
    return join(this.projectKnowledgeRoot, ...segments);
  }
}

/**
 * 根据字段和证据提出归属建议。
 *
 * @param {object} input 分类输入
 * @returns {object} 分类建议
 * @author lvdaxianer@yeah.net
 */
export function defaultClassifier({ event }) {
  const projectSpecific = event.projectSpecific === true || Boolean(event.projectApi || event.environmentPath);
  const portable = event.portable === true;
  const independentlyReproduced = (event.independentReproductions ?? 0) >= 2;
  if (projectSpecific) {
    return {
      scope: 'project',
      confidence: 0.95,
      rationale: '根因或修复位置依赖项目事实',
      criteria: ['project-specific']
    };
  }
  if (portable && independentlyReproduced) {
    return {
      scope: 'common',
      confidence: 0.85,
      rationale: '可移植且有多个独立复现',
      criteria: ['portable', 'reproduced']
    };
  }
  if (portable && event.projectAdapterRequired === true) {
    return {
      scope: 'hybrid', confidence: 0.75, rationale: '通用原则加项目适配器', criteria: ['portable', 'adapter']
    };
  }
  return {
    scope: 'unknown',
    confidence: 0.4,
    rationale: '证据不足，等待人工判断',
    criteria: ['insufficient-evidence']
  };
}

/**
 * 执行分类 Worker，并把异常转换为非阻塞失败状态。
 *
 * @param {Function} classifier 分类 Worker
 * @param {object} event 原始事件
 * @returns {Promise<object>} 分类状态和建议
 * @author lvdaxianer@yeah.net
 */
async function executeClassifier(classifier, event) {
  try {
    return { status: 'completed', suggestion: normalizeSuggestion(await classifier({ event })) };
  } catch {
    return {
      status: 'failed',
      suggestion: normalizeSuggestion({ scope: 'unknown', confidence: 0, rationale: '分类 Worker 执行失败' })
    };
  }
}

/**
 * 将分类输出限制在协议允许的范围。
 *
 * @param {object} suggestion 分类输出
 * @returns {object} 规范化分类
 * @author lvdaxianer@yeah.net
 */
function normalizeSuggestion(suggestion = {}) {
  const scope = VALID_SCOPES.has(suggestion.scope) ? suggestion.scope : 'unknown';
  return {
    scope,
    confidence: Number.isFinite(suggestion.confidence) ? suggestion.confidence : 0,
    rationale: suggestion.rationale ?? '未提供分类理由',
    criteria: suggestion.criteria ?? []
  };
}

/**
 * 校验事件最小关联字段。
 *
 * @param {object} event 错误事件
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateEvent(event) {
  assertIdentifier(event.eventId, '事件 ID');
  ['runId', 'featureId', 'title', 'description', 'phase'].forEach((field) => assertText(event[field], field));
  if (!Array.isArray(event.evidenceRefs)) {
    throw new KnowledgeGovernanceError('KNOWLEDGE_EVENT_INVALID', '证据引用必须是数组');
  }
}

/**
 * 校验人工修改和审计信息。
 *
 * @param {object} patch 人工修改
 * @param {object} audit 审计信息
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateDecision(patch, audit) {
  if (patch.scope && !VALID_SCOPES.has(patch.scope)) {
    throw new KnowledgeGovernanceError('KNOWLEDGE_SCOPE_INVALID', '知识归属无效');
  }
  if (patch.lifecycle && !VALID_LIFECYCLES.has(patch.lifecycle)) {
    throw new KnowledgeGovernanceError('KNOWLEDGE_LIFECYCLE_INVALID', '知识生命周期无效');
  }
  assertText(audit?.operator, '审计操作者');
  assertText(audit?.reason, '审计原因');
}

/**
 * 校验公共 Guardrail 晋升门禁。
 *
 * @param {object} state 当前知识状态
 * @param {object} review 晋升复检
 * @param {object} audit 审计信息
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validatePromotion(state, review, audit) {
  if (state.scope !== 'common') {
    throw new KnowledgeGovernanceError('KNOWLEDGE_SCOPE_INVALID', '只有 common 候选可发布');
  }
  if (state.lifecycle !== 'active') {
    throw new KnowledgeGovernanceError('KNOWLEDGE_PROMOTION_BLOCKED', '只有 active 知识可发布');
  }
  if (!review?.sanitized || !review.portable) {
    throw new KnowledgeGovernanceError('KNOWLEDGE_PROMOTION_BLOCKED', '公共知识必须脱敏且可移植');
  }
  const hasEvidence = review.independentReproductions >= 2 || review.normativeRefs?.length > 0;
  if (!hasEvidence || !Array.isArray(review.reviewedBy) || review.reviewedBy.length < 2) {
    throw new KnowledgeGovernanceError('KNOWLEDGE_PROMOTION_BLOCKED', '公共知识缺少复现或独立复检依据');
  }
  assertText(audit?.operator, '审计操作者');
  assertText(audit?.reason, '审计原因');
}

/**
 * 按严重级别、重复次数和置信度排序知识候选。
 *
 * @param {object} left 左侧候选
 * @param {object} right 右侧候选
 * @returns {number} 排序结果
 * @author lvdaxianer@yeah.net
 */
function compareKnowledge(left, right) {
  const leftScore = SEVERITY_SCORE[left.severity] ?? 0;
  const rightScore = SEVERITY_SCORE[right.severity] ?? 0;
  return (rightScore - leftScore)
    || ((right.occurrenceCount ?? 1) - (left.occurrenceCount ?? 1))
    || ((right.confidence ?? 0) - (left.confidence ?? 0));
}

/**
 * 将完整知识压缩为 Worker 可读取的有限条目。
 *
 * @param {object} item 完整知识
 * @returns {object} 快照条目
 * @author lvdaxianer@yeah.net
 */
function toSnapshotItem(item) {
  return {
    eventId: item.eventId,
    scope: item.scope ?? 'common',
    title: item.title,
    rootCause: item.rootCause,
    solution: item.solution,
    severity: item.severity,
    confidence: item.confidence,
    evidenceRefs: item.evidenceRefs ?? []
  };
}

/**
 * 判断知识状态是否符合控制台过滤条件。
 *
 * @param {object} state 知识状态
 * @param {object} filters 过滤条件
 * @returns {boolean} 是否保留
 * @author lvdaxianer@yeah.net
 */
function matchesKnowledgeFilters(state, filters) {
  const scopeMatches = !filters.scope || state.scope === filters.scope;
  const lifecycleMatches = !filters.lifecycle || state.lifecycle === filters.lifecycle;
  return scopeMatches && lifecycleMatches;
}

/**
 * 校验路径字符串。
 *
 * @param {unknown} value 路径
 * @param {string} label 字段名称
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function assertPath(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label}不能为空`);
  }
}

/**
 * 校验标识符。
 *
 * @param {unknown} value 标识符
 * @param {string} label 字段名称
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    throw new KnowledgeGovernanceError('KNOWLEDGE_IDENTIFIER_INVALID', `${label}无效`);
  }
}

/**
 * 校验非空文本。
 *
 * @param {unknown} value 文本
 * @param {string} label 字段名称
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function assertText(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new KnowledgeGovernanceError('KNOWLEDGE_FIELD_INVALID', `${label}不能为空`);
  }
}

/**
 * 原子写入 JSON 文件。
 *
 * @param {string} path 文件路径
 * @param {object} value JSON 值
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function writeJsonAtomically(path, value) {
  await mkdir(join(path, '..'), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, path);
}

/**
 * 读取 JSON 文件。
 *
 * @param {string} path 文件路径
 * @returns {Promise<object>} JSON 值
 * @author lvdaxianer@yeah.net
 */
async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new KnowledgeGovernanceError('KNOWLEDGE_NOT_FOUND', '知识事实不存在');
    }
    throw error;
  }
}

/**
 * 读取可选 JSON 文件。
 *
 * @param {string} path 文件路径
 * @returns {Promise<object|undefined>} JSON 值
 * @author lvdaxianer@yeah.net
 */
async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error.code === 'KNOWLEDGE_NOT_FOUND') {
      return undefined;
    }
    throw error;
  }
}

/**
 * 读取目录中的 JSON 文件。
 *
 * @param {string} directory 目录路径
 * @returns {Promise<object[]>} JSON 集合
 * @author lvdaxianer@yeah.net
 */
async function readJsonDirectory(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => readJson(join(directory, entry.name))));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
