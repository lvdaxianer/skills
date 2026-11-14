import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validatePrd } from './prd-schema.mjs';

const DEVELOPMENT_WORKFLOW = 'development-workflow';
const READY_STATUS = 'DEVELOPMENT_READY';

/**
 * 表示开发交接未满足门禁。
 *
 * @author lvdaxianer@yeah.net
 */
export class DevelopmentHandoffError extends Error {
  /**
   * 创建带稳定错误码的交接错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'DevelopmentHandoffError';
    this.code = code;
  }
}

/**
 * 校验开发就绪交接并向 development-workflow 写入执行请求。
 *
 * @param {object} options 交接配置
 * @param {object} options.store 文件事实源
 * @param {string} options.runId 运行 ID
 * @returns {Promise<object>} 交接结果
 * @author lvdaxianer@yeah.net
 */
export async function dispatchDevelopmentWorkflow({ store, runId }) {
  const validated = await validateDevelopmentHandoff({ store, runId });
  const correlationId = `DEV-${runId}-${validated.prd.version}`;
  const existing = (await store.readInteraction(runId)).find(
    (message) => message.correlation_id === correlationId && message.to === DEVELOPMENT_WORKFLOW
  );
  if (existing) {
    return {
      status: 'DEVELOPMENT_ALREADY_DISPATCHED',
      request: existing,
      handoffPath: validated.handoffPath
    };
  }

  const request = {
    message_id: `MSG-${runId}-DEVELOPMENT`,
    run_id: runId,
    round: 1,
    from: 'product-delivery-workflow',
    to: DEVELOPMENT_WORKFLOW,
    kind: 'request',
    action: 'execute',
    status: 'pending',
    verdict: null,
    correlation_id: correlationId,
    input_refs: validated.inputRefs,
    output_refs: [],
    payload: {
      handoffPath: validated.handoffPath,
      taskIds: validated.tasks.map((task) => task.taskId),
      acceptanceIds: validated.prd.acceptanceCriteria.map((criterion) => criterion.id),
      authority: 'development-workflow'
    }
  };
  await store.appendInteraction(runId, request);
  await store.updateRun(runId, {
    status: 'DEVELOPMENT_RUNNING',
    developmentRequestId: request.message_id
  });
  await store.appendAudit(runId, {
    event_id: `AUDIT-${runId}-DEVELOPMENT-DISPATCHED`,
    action: 'development_dispatched',
    actor: 'product-delivery-workflow',
    reason: 'DEVELOPMENT_READY 交接门禁通过，已发送 development-workflow 执行请求'
  });
  return { status: 'DEVELOPMENT_DISPATCHED', request, handoffPath: validated.handoffPath };
}

/**
 * 校验开发交接所需的 PRD、任务、验收和假设。
 *
 * @param {object} options 校验配置
 * @returns {Promise<object>} 已校验交接内容
 * @author lvdaxianer@yeah.net
 */
export async function validateDevelopmentHandoff({ store, runId }) {
  const run = await store.readRun(runId);
  const runRoot = join(store.projectRoot, '.product', 'runs', runId);
  const handoffPath = join(runRoot, 'handoff.md');
  if (run.status !== READY_STATUS) {
    throw blocked('运行状态不是 DEVELOPMENT_READY');
  }

  const handoff = await readFact(runRoot, 'handoff.json');
  const prd = await readFact(runRoot, 'prd/prd-verified.json');
  const tasks = await readFact(runRoot, 'tasks.json');
  const errors = collectHandoffErrors({ run, handoff, prd, tasks });
  if (errors.length > 0) {
    throw blocked(errors.join('；'));
  }

  await writeHandoffMarkdown(handoffPath, { run, handoff, prd, tasks });
  return {
    run,
    handoff,
    prd,
    tasks,
    handoffPath,
    inputRefs: [
      '.product/runs/' + runId + '/handoff.md',
      '.product/runs/' + runId + '/prd/prd-verified.json',
      '.product/runs/' + runId + '/tasks.json'
    ]
  };
}

/**
 * 收集交接门禁问题。
 *
 * @param {object} input 交接内容
 * @returns {string[]} 门禁问题
 * @author lvdaxianer@yeah.net
 */
function collectHandoffErrors({ run, handoff, prd, tasks }) {
  const errors = [];
  if (handoff.status !== READY_STATUS) errors.push('handoff 状态不是 DEVELOPMENT_READY');
  if (handoff.prdVersion !== prd.version || run.prdVersion !== prd.version) {
    errors.push('PRD 版本与运行交接不一致');
  }
  if (!Array.isArray(handoff.blockedAssumptions) || handoff.blockedAssumptions.length > 0) {
    errors.push('存在未处理的 blocked 假设');
  }
  if (!Array.isArray(prd.acceptanceCriteria) || prd.acceptanceCriteria.length === 0) {
    errors.push('验收标准为空');
  }
  if (!Array.isArray(tasks) || tasks.length === 0) errors.push('任务拆分为空');
  const prdValidation = validatePrd(prd);
  if (!prdValidation.valid) errors.push(`PRD 不完整：${prdValidation.errors.join('；')}`);
  errors.push(...validateTaskCoverage(tasks, prd.acceptanceCriteria, handoff));
  return errors;
}

/**
 * 检查任务、验收和复检引用是否完整。
 *
 * @param {object[]} tasks 任务
 * @param {object[]} acceptanceCriteria 验收标准
 * @param {object} handoff 交接包
 * @returns {string[]} 覆盖问题
 * @author lvdaxianer@yeah.net
 */
function validateTaskCoverage(tasks, acceptanceCriteria = [], handoff) {
  const acceptanceIds = new Set(acceptanceCriteria.map((criterion) => criterion.id));
  const taskAcceptanceIds = new Set(tasks.map((task) => task.acceptanceId));
  const taskIds = new Set(tasks.map((task) => task.taskId));
  const handoffAcceptanceIds = new Set(handoff.acceptanceRefs ?? []);
  const handoffTaskIds = new Set(handoff.taskRefs ?? []);
  const missingAcceptance = [...acceptanceIds].filter((id) => !taskAcceptanceIds.has(id));
  const missingAcceptanceRefs = [...acceptanceIds].filter((id) => !handoffAcceptanceIds.has(id));
  const missingTasks = [...handoffTaskIds].filter((id) => !taskIds.has(id));
  const missingTaskRefs = [...taskIds].filter((id) => !handoffTaskIds.has(id));
  const missingReviews = !Array.isArray(handoff.reviewRefs) || handoff.reviewRefs.length !== 2;
  const errors = [];
  if (missingAcceptance.length > 0) errors.push(`任务缺少验收覆盖：${missingAcceptance.join('、')}`);
  if (missingAcceptanceRefs.length > 0) {
    errors.push(`交接验收引用不完整：${missingAcceptanceRefs.join('、')}`);
  }
  if (missingTasks.length > 0) errors.push(`交接任务引用无效：${missingTasks.join('、')}`);
  if (missingTaskRefs.length > 0) errors.push(`交接缺少任务引用：${missingTaskRefs.join('、')}`);
  if (missingReviews) errors.push('双复检引用不完整');
  tasks.forEach((task) => {
    if (!task.taskId || !task.acceptanceId || !task.verification) {
      errors.push('任务缺少稳定 ID、验收关联或验证计划');
    }
  });
  return errors;
}

/**
 * 读取运行事实 JSON。
 *
 * @param {string} runRoot 运行目录
 * @param {string} relativePath 相对路径
 * @returns {Promise<object|object[]>} JSON 内容
 * @author lvdaxianer@yeah.net
 */
async function readFact(runRoot, relativePath) {
  try {
    return JSON.parse(await readFile(resolve(runRoot, relativePath), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw blocked(`缺少交接事实文件：${relativePath}`);
    if (error instanceof SyntaxError) throw blocked(`交接事实文件损坏：${relativePath}`);
    throw error;
  }
}

/**
 * 写入面向 development-workflow 的中文交接文档。
 *
 * @param {string} path 交接文档路径
 * @param {object} input 交接内容
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function writeHandoffMarkdown(path, { run, handoff, prd, tasks }) {
  const content = [
    '# 开发交接',
    '',
    `- 运行 ID：${run.runId}`,
    `- PRD 版本：${prd.version}`,
    '- 状态：DEVELOPMENT_READY',
    '',
    '## 工程执行边界',
    '',
    '请由 `development-workflow` 继续执行分支、OpenSpec、TDD、领域 review、提交和合并。',
    '本交接不替代工程 Skill，也不允许跳过其既有门禁。',
    '',
    '## 冻结输入',
    '',
    `- PRD：${handoff.prdRefs.join('、')}`,
    `- 任务：${tasks.map((task) => `${task.taskId}（${task.acceptanceId}）`).join('、')}`,
    `- 验收：${handoff.acceptanceRefs.join('、')}`,
    `- 复检：${handoff.reviewRefs.join('、')}`,
    '',
    '## 执行约束',
    '',
    '- 所有任务必须保留测试、实现、审计和最终验证证据。',
    '- 验收证据必须绑定实际 commit/release。',
    '- 页面功能必须保留 URL、操作、断言和截图引用。',
    '- 完成开发与验证后返回总控流程，进入最终审计和部署决策。',
    ''
  ].join('\n');
  await mkdir(join(path, '..'), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, content, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, path);
}

/**
 * 构造稳定的开发交接阻塞错误。
 *
 * @param {string} message 中文错误说明
 * @returns {DevelopmentHandoffError} 阻塞错误
 * @author lvdaxianer@yeah.net
 */
function blocked(message) {
  return new DevelopmentHandoffError('DEVELOPMENT_HANDOFF_BLOCKED', message);
}
