import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { generateDefaultPrd, validatePrd } from './prd-schema.mjs';

export { generateDefaultPrd } from './prd-schema.mjs';

const MAX_REVIEW_ROUNDS = 3;
const REVIEW_WORKERS = [
  { id: 'product-review', adapter: 'productReview' },
  { id: 'engineering-review', adapter: 'engineeringReview' }
];

/**
 * 运行主 Worker 与两个独立复检 Worker 的 PRD 门禁。
 *
 * @param {object} options 编排配置
 * @returns {Promise<object>} 门禁结果
 * @author lvdaxianer@yeah.net
 */
export async function runPrdWorkflow(options) {
  const context = createWorkflowContext(options);
  const maxRounds = options.maxRounds ?? MAX_REVIEW_ROUNDS;
  let prd = await callMainWorker(context.workerAdapters.mainPrd, {
    intake: context.intake,
    projectFacts: context.projectFacts,
    round: 1
  });
  let reviewResults = [];

  for (let round = 1; round <= maxRounds; round += 1) {
    const outcome = await runPrdRound(context, prd, round);
    prd = outcome.prd;
    reviewResults = outcome.reviews;
    if (outcome.result) {
      return outcome.result;
    }
    if (round === maxRounds) {
      return finishRevisionRequired(context.store, context.runId, prd, reviewResults, round);
    }
    prd = await callMainWorker(context.workerAdapters.mainPrd, {
      intake: context.intake,
      projectFacts: context.projectFacts,
      previousPrd: prd,
      reviewResults,
      round: round + 1
    });
  }
  return finishRevisionRequired(context.store, context.runId, prd, reviewResults, maxRounds);
}

/**
 * 创建 PRD 编排上下文。
 *
 * @param {object} options 编排选项
 * @returns {object} 编排上下文
 * @author lvdaxianer@yeah.net
 */
function createWorkflowContext(options) {
  return {
    store: options.store,
    runId: options.runId,
    intake: options.intake,
    projectFacts: options.projectFacts ?? [],
    workerAdapters: options.workerAdapters ?? {}
  };
}

/**
 * 执行一轮 PRD 保存、双复检和门禁判断。
 *
 * @param {object} context 编排上下文
 * @param {object} prd 当前 PRD
 * @param {number} round 当前轮次
 * @returns {Promise<object>} 当前轮次结果
 * @author lvdaxianer@yeah.net
 */
async function runPrdRound(context, prd, round) {
  const currentPrd = await ensurePrdVersion(prd, round, context.intake, context.projectFacts);
  const validation = validatePrd(currentPrd);
  if (!validation.valid) {
    const result = await finishBlocked(
      context.store,
      context.runId,
      currentPrd,
      `PRD 结构无效：${validation.errors.join('；')}`
    );
    return { prd: currentPrd, reviews: [], result };
  }
  const prdPath = await persistPrd(context.store, context.runId, currentPrd);
  const reviews = await runReviewBarrier({ ...context, prd: currentPrd, prdPath });
  const gate = evaluateGate(currentPrd, reviews);
  const result = await resolveGate(context, currentPrd, prdPath, reviews, gate, round);
  return { prd: currentPrd, reviews, result };
}

/**
 * 将门禁结果映射为冻结、阻塞或继续修订动作。
 *
 * @param {object} context 编排上下文
 * @param {object} prd 当前 PRD
 * @param {string} prdPath PRD 路径
 * @param {object[]} reviews 复检结果
 * @param {object} gate 门禁结果
 * @param {number} round 当前轮次
 * @returns {Promise<object|undefined>} 终态结果或继续标记
 * @author lvdaxianer@yeah.net
 */
async function resolveGate(context, prd, prdPath, reviews, gate, round) {
  if (gate.status === 'verified') {
    return finalizeVerified(context.store, context.runId, prd, prdPath, reviews, round);
  }
  if (gate.status === 'blocked') {
    return finishBlocked(context.store, context.runId, prd, gate.reason, reviews, round);
  }
  return undefined;
}

/**
 * 生成默认主 Worker 输出或调用用户提供的主 Worker。
 *
 * @param {Function|undefined} adapter 主 Worker 适配器
 * @param {object} input 主 Worker 输入
 * @returns {Promise<object>} PRD
 * @author lvdaxianer@yeah.net
 */
async function callMainWorker(adapter, input) {
  if (adapter) {
    const result = await adapter(input);
    return result.prd ?? result;
  }
  return generateDefaultPrd({
    intake: input.intake,
    projectFacts: input.projectFacts,
    version: `prd-v${input.round}`
  });
}

/**
 * 保证主 Worker 输出使用当前轮次版本。
 *
 * @param {object} prd 主 Worker 输出
 * @param {number} round 当前轮次
 * @param {string} intake 原始需求
 * @param {string[]} projectFacts 项目事实
 * @returns {Promise<object>} 当前版本 PRD
 * @author lvdaxianer@yeah.net
 */
async function ensurePrdVersion(prd, round, intake, projectFacts) {
  if (prd?.version === `prd-v${round}`) {
    return prd;
  }
  return {
    ...generateDefaultPrd({ intake, projectFacts, version: `prd-v${round}` }),
    ...prd,
    version: `prd-v${round}`
  };
}

/**
 * 并行运行两个互不可见的复检 Worker。
 *
 * @param {object} input 复检输入
 * @returns {Promise<object[]>} 两个复检结果
 * @author lvdaxianer@yeah.net
 */
async function runReviewBarrier(input) {
  const tasks = REVIEW_WORKERS.map((worker) => runSingleReview({ ...input, worker }));
  return Promise.all(tasks);
}

/**
 * 为一个复检 Worker 写入独立快照、消息和结果。
 *
 * @param {object} input 复检输入
 * @returns {Promise<object>} 复检结果
 * @author lvdaxianer@yeah.net
 */
async function runSingleReview(input) {
  const { store, runId, intake, projectFacts, prd, prdPath, worker, workerAdapters } = input;
  const snapshot = await createReviewSnapshot({ store, runId, intake, projectFacts, prd, prdPath, worker });
  const correlationId = `REVIEW-${runId}-${prd.version}-${worker.id}`;
  const messageId = `MSG-${runId}-${prd.version}-${worker.id}`;
  await appendReviewMessage(store, runId, messageId, correlationId, worker.id, prd, snapshot, 'pending');
  await appendReviewMessage(store, runId, messageId, correlationId, worker.id, prd, snapshot, 'processing');
  const adapter = workerAdapters[worker.adapter] ?? defaultReviewWorker;
  const rawResult = await callReviewWorker(adapter, snapshot);
  const result = normalizeReviewResult(rawResult);
  const resultPath = await persistReviewResult(store, runId, prd, worker.id, result);
  await appendReviewResult(store, runId, messageId, correlationId, worker.id, snapshot, result, resultPath);
  return { worker: worker.id, ...result, snapshotPath: snapshot.snapshotPath, resultPath };
}

/**
 * 执行复检适配器并把异常转换为可审计阻塞结果。
 *
 * @param {Function} adapter 复检适配器
 * @param {object} snapshot 独立输入快照
 * @returns {Promise<object>} 复检输出
 * @author lvdaxianer@yeah.net
 */
async function callReviewWorker(adapter, snapshot) {
  try {
    return await adapter({ snapshot: deepFreeze(snapshot) });
  } catch {
    return {
      status: 'failed',
      verdict: 'block',
      findings: ['复检 Worker 执行失败'],
      reason: '复检适配器异常'
    };
  }
}

/**
 * 创建不包含其他复检结果的独立输入快照。
 *
 * @param {object} input 快照输入
 * @returns {Promise<object>} 冻结快照
 * @author lvdaxianer@yeah.net
 */
async function createReviewSnapshot(input) {
  const { runId, intake, projectFacts, prd, prdPath, worker } = input;
  const snapshotRelativePath = join('.product', 'runs', runId, 'prd', prd.version, 'snapshots', `${worker.id}.json`);
  const snapshotPath = join(input.store.projectRoot, snapshotRelativePath);
  const snapshot = {
    snapshotId: `SNAP-${runId}-${prd.version}-${worker.id}`,
    runId,
    prdVersion: prd.version,
    worker: worker.id,
    sourceRefs: [prdPath],
    ruleRefs: ['product-delivery-workflow/references/worker-protocol.md'],
    lessonRefs: [],
    input: { intake, projectFacts, prd },
    snapshotPath
  };
  snapshot.contextHash = hashObject(snapshot);
  await writeStoreFile(input.store, snapshotPath, snapshot);
  return snapshot;
}

/**
 * 追加复检请求消息。
 *
 * @param {object} store 文件事实源
 * @param {string} runId 运行 ID
 * @param {string} messageId 消息 ID
 * @param {string} correlationId 关联 ID
 * @param {string} workerId 目标 Worker
 * @param {object} prd 当前 PRD
 * @param {object} snapshot 输入快照
 * @param {string} status 消息状态
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function appendReviewMessage(store, runId, messageId, correlationId, workerId, prd, snapshot, status) {
  await store.appendInteraction(runId, {
    message_id: messageId,
    run_id: runId,
    round: Number(prd.version.slice(5)),
    from: 'main-prd',
    to: workerId,
    kind: 'request',
    action: 'execute',
    status,
    verdict: null,
    correlation_id: correlationId,
    input_refs: [snapshot.snapshotPath],
    output_refs: []
  });
}

/**
 * 追加复检结果消息。
 *
 * @param {object} store 文件事实源
 * @param {string} runId 运行 ID
 * @param {string} messageId 消息 ID
 * @param {string} correlationId 关联 ID
 * @param {string} workerId 复检 Worker
 * @param {object} snapshot 输入快照
 * @param {object} result 复检结果
 * @param {string} resultPath 结果路径
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function appendReviewResult(store, runId, messageId, correlationId, workerId, snapshot, result, resultPath) {
  await store.appendInteraction(runId, {
    message_id: messageId,
    run_id: runId,
    round: Number(snapshot.prdVersion.slice(5)),
    from: workerId,
    to: 'main-prd',
    kind: 'response',
    action: 'none',
    status: result.status,
    verdict: result.verdict,
    correlation_id: correlationId,
    input_refs: [snapshot.snapshotPath],
    output_refs: [resultPath]
  });
}

/**
 * 默认复检 Worker，只验证 PRD 结构和验收完整性。
 *
 * @param {object} input 独立快照输入
 * @returns {object} 复检结果
 * @author lvdaxianer@yeah.net
 */
function defaultReviewWorker({ snapshot }) {
  const validation = validatePrd(snapshot.input.prd);
  return validation.valid
    ? { status: 'succeeded', verdict: 'pass', findings: [], reason: '结构化 PRD 可进入双 Worker 门禁' }
    : { status: 'succeeded', verdict: 'revise', findings: validation.errors, reason: 'PRD 结构不完整' };
}

/**
 * 规范化复检输出，避免未定义状态穿透门禁。
 *
 * @param {object} result 复检输出
 * @returns {object} 结构化复检结果
 * @author lvdaxianer@yeah.net
 */
function normalizeReviewResult(result = {}) {
  const status = result.status ?? 'failed';
  const verdict = result.verdict ?? 'block';
  if (!['succeeded', 'failed', 'blocked'].includes(status)) {
    return { status: 'failed', verdict: 'block', findings: ['复检状态非法'] };
  }
  if (!['pass', 'revise', 'block'].includes(verdict)) {
    return { status: 'failed', verdict: 'block', findings: ['复检结论非法'] };
  }
  return { ...result, status, verdict, findings: result.findings ?? [] };
}

/**
 * 判断双复检屏障是否通过、阻塞或需要修订。
 *
 * @param {object} prd 当前 PRD
 * @param {object[]} reviews 复检结果
 * @returns {{status: string, reason?: string}} 门禁结果
 * @author lvdaxianer@yeah.net
 */
function evaluateGate(prd, reviews) {
  if (prd.assumptions.some((assumption) => assumption.status === 'blocked')) {
    return { status: 'blocked', reason: '存在未处理的 blocked 假设' };
  }
  if (reviews.some((review) => review.verdict === 'block' || review.status === 'blocked')) {
    return { status: 'blocked', reason: '复检 Worker 返回 block' };
  }
  const bothPassed = reviews.length === REVIEW_WORKERS.length
    && reviews.every((review) => review.status === 'succeeded' && review.verdict === 'pass');
  if (!bothPassed) {
    return { status: 'revise', reason: '复检未双通过' };
  }
  return { status: 'verified' };
}

/**
 * 生成冻结 PRD、任务拆分和开发交接包。
 *
 * @param {object} store 文件事实源
 * @param {string} runId 运行 ID
 * @param {object} prd 已验证 PRD
 * @param {string} prdPath PRD 路径
 * @param {object[]} reviews 复检结果
 * @param {number} round 通过轮次
 * @returns {Promise<object>} 开发就绪结果
 * @author lvdaxianer@yeah.net
 */
async function finalizeVerified(store, runId, prd, prdPath, reviews, round) {
  const tasks = buildTasks(prd);
  const handoff = buildHandoff(prd, tasks, reviews);
  const verifiedPath = await persistPrd(store, runId, prd, 'prd-verified.json');
  await writeStoreFile(store, join('.product', 'runs', runId, 'tasks.json'), tasks);
  await writeStoreFile(store, join('.product', 'runs', runId, 'handoff.json'), handoff);
  await store.updateRun(runId, { status: 'DEVELOPMENT_READY', prdVersion: prd.version });
  await store.appendAudit(runId, {
    event_id: `AUDIT-${prd.version}-VERIFIED`,
    action: 'prd_verified',
    actor: 'prd-coordinator',
    reason: '产品复检与研发复检均通过，生成开发交接包'
  });
  return {
    status: 'DEVELOPMENT_READY',
    prdStatus: 'PRD_VERIFIED',
    prd,
    prdPath,
    verifiedPath,
    reviews,
    tasks,
    handoff,
    rounds: round
  };
}

/**
 * 记录阻塞结果并保留可审计原因。
 *
 * @param {object} store 文件事实源
 * @param {string} runId 运行 ID
 * @param {object} prd 当前 PRD
 * @param {string} reason 阻塞原因
 * @param {object[]} reviews 复检结果
 * @param {number} round 当前轮次
 * @returns {Promise<object>} 阻塞结果
 * @author lvdaxianer@yeah.net
 */
async function finishBlocked(store, runId, prd, reason, reviews = [], round = 1) {
  await store.updateRun(runId, { status: 'PRD_BLOCKED', prdVersion: prd.version });
  await store.appendAudit(runId, {
    event_id: `AUDIT-${prd.version}-BLOCKED`,
    action: 'prd_blocked',
    actor: 'prd-coordinator',
    reason
  });
  return { status: 'PRD_BLOCKED', prdStatus: 'PRD_BLOCKED', blockedReason: reason, prd, reviews, rounds: round };
}

/**
 * 记录多轮复检仍需修订的结果。
 *
 * @param {object} store 文件事实源
 * @param {string} runId 运行 ID
 * @param {object} prd 当前 PRD
 * @param {object[]} reviews 复检结果
 * @param {number} round 当前轮次
 * @returns {Promise<object>} 修订结果
 * @author lvdaxianer@yeah.net
 */
async function finishRevisionRequired(store, runId, prd, reviews, round) {
  await store.updateRun(runId, { status: 'PRD_REVISE_REQUIRED', prdVersion: prd.version });
  return { status: 'PRD_REVISE_REQUIRED', prdStatus: 'PRD_REVISE_REQUIRED', prd, reviews, rounds: round };
}

/**
 * 将每条验收标准拆成最小开发任务。
 *
 * @param {object} prd 已验证 PRD
 * @returns {object[]} 任务集合
 * @author lvdaxianer@yeah.net
 */
function buildTasks(prd) {
  return prd.acceptanceCriteria.map((criterion, index) => ({
    taskId: `TASK-${String(index + 1).padStart(3, '0')}`,
    title: `实现并验证 ${criterion.id}`,
    acceptanceId: criterion.id,
    dependsOn: [],
    verification: criterion.verification,
    source: 'prd'
  }));
}

/**
 * 生成 development-workflow 可消费的交接包。
 *
 * @param {object} prd 已验证 PRD
 * @param {object[]} tasks 任务集合
 * @param {object[]} reviews 复检结果
 * @returns {object} 交接包
 * @author lvdaxianer@yeah.net
 */
function buildHandoff(prd, tasks, reviews) {
  return {
    status: 'DEVELOPMENT_READY',
    prdVersion: prd.version,
    prdRefs: [`prd/${prd.version}.json`, 'prd-verified.json'],
    taskRefs: tasks.map((task) => task.taskId),
    acceptanceRefs: prd.acceptanceCriteria.map((criterion) => criterion.id),
    reviewRefs: reviews.map((review) => review.resultPath),
    blockedAssumptions: []
  };
}

/**
 * 将 PRD 写入运行事实源并返回相对引用。
 *
 * @param {object} store 文件事实源
 * @param {string} runId 运行 ID
 * @param {object} prd PRD
 * @param {string|undefined} fileName 覆盖文件名
 * @returns {Promise<string>} 项目相对路径
 * @author lvdaxianer@yeah.net
 */
async function persistPrd(store, runId, prd, fileName) {
  const name = fileName ?? `${prd.version}.json`;
  const relativePath = join('.product', 'runs', runId, 'prd', name);
  await writeStoreFile(store, relativePath, prd);
  return relativePath;
}

/**
 * 将复检结果写入当前 PRD 版本目录。
 *
 * @param {object} store 文件事实源
 * @param {string} runId 运行 ID
 * @param {object} prd 当前 PRD
 * @param {string} workerId Worker ID
 * @param {object} result 复检结果
 * @returns {Promise<string>} 结果引用
 * @author lvdaxianer@yeah.net
 */
async function persistReviewResult(store, runId, prd, workerId, result) {
  const relativePath = join('.product', 'runs', runId, 'prd', prd.version, `${workerId}.json`);
  await writeStoreFile(store, relativePath, result);
  return relativePath;
}

/**
 * 使用项目根目录写入 JSON 文件。
 *
 * @param {object} store 文件事实源
 * @param {string} relativePath 项目相对路径
 * @param {object} value JSON 值
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function writeStoreFile(store, relativePath, value) {
  const path = resolve(store.projectRoot, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

/**
 * 计算快照内容哈希。
 *
 * @param {object} value 快照对象
 * @returns {string} SHA-256 哈希
 * @author lvdaxianer@yeah.net
 */
function hashObject(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

/**
 * 深冻结快照，防止 Worker 适配器修改输入。
 *
 * @param {object} value 快照对象
 * @returns {object} 冻结对象
 * @author lvdaxianer@yeah.net
 */
function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  });
  return Object.freeze(value);
}
