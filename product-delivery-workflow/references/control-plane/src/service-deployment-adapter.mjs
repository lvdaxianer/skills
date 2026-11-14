import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SERVICE_DEPLOYMENT = 'service-deployment';
const DEPLOYMENT_DIRECTORY = 'deployment';
const REQUIRED_INPUTS = [
  'DEPLOY_ROOT',
  'service_name',
  'artifact',
  'config_path',
  'runtime_target',
  'lifecycle',
  'migration',
  'retention'
];
const LIFECYCLE_FIELDS = ['mode', 'start', 'stop', 'status', 'readiness', 'liveness', 'smoke'];
const LIFECYCLE_MODES = new Set(['systemd', 'manual-foreground', 'manual-background']);
const RUNTIME_TARGETS = new Set(['host-process', 'docker-container']);

/**
 * 表示部署交接未满足门禁。
 *
 * @author lvdaxianer@yeah.net
 */
export class DeploymentHandoffError extends Error {
  /**
   * 创建带稳定错误码的部署交接错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'DeploymentHandoffError';
    this.code = code;
  }
}

/**
 * 在最终审计后生成部署 dry-run，并返回用户决策提示。
 *
 * @param {object} options 部署决策配置
 * @param {object} options.store 文件事实源
 * @param {string} options.runId 运行 ID
 * @param {object} [options.deploymentInput] 已知部署输入
 * @param {object} [options.authorization] 授权信息
 * @returns {Promise<object>} 部署决策结果
 * @author lvdaxianer@yeah.net
 */
export async function requestDeploymentDecision({
  store,
  runId,
  deploymentInput = {},
  authorization = {}
}) {
  const run = await store.readRun(runId);
  if (!['FINAL_AUDIT_PASSED', 'DEPLOYMENT_DECISION_REQUIRED'].includes(run.status)) {
    throw new DeploymentHandoffError(
      'DEPLOYMENT_NOT_READY',
      '开发、验证或最终审计尚未完成，不能进入部署决策'
    );
  }
  const reportPath = join(store.projectRoot, '.product', 'runs', runId, DEPLOYMENT_DIRECTORY, 'dry-run.json');
  const missingInputs = collectMissingInputs(deploymentInput);
  const report = buildDryRunReport({ run, deploymentInput, authorization, missingInputs });
  await writeJsonAtomically(reportPath, report);
  if (run.status !== 'DEPLOYMENT_DECISION_REQUIRED') {
    await store.updateRun(runId, { status: 'DEPLOYMENT_DECISION_REQUIRED' });
    await store.appendAudit(runId, {
      event_id: `AUDIT-${runId}-DEPLOYMENT-DECISION`,
      action: 'deployment_decision_required',
      actor: 'product-delivery-workflow',
      reason: '开发、验证和最终审计完成，等待用户明确部署选择'
    });
  }
  return {
    status: 'DEPLOYMENT_DECISION_REQUIRED',
    question: '是否需要部署？请明确授权并提供部署参数；未授权不会执行真实部署。',
    reportPath,
    missingInputs
  };
}

/**
 * 在用户明确授权且参数完整后向 service-deployment 发送执行请求。
 *
 * @param {object} options 部署请求配置
 * @param {object} options.store 文件事实源
 * @param {string} options.runId 运行 ID
 * @param {object} options.authorization 用户授权
 * @param {object} options.deploymentInput 部署参数
 * @returns {Promise<object>} 部署请求结果
 * @author lvdaxianer@yeah.net
 */
export async function dispatchServiceDeployment({
  store,
  runId,
  authorization = {},
  deploymentInput = {}
}) {
  if (authorization.approved !== true) {
    return requestDeploymentDecision({ store, runId, deploymentInput, authorization });
  }
  validateAuthorization(authorization);
  const missingInputs = collectMissingInputs(deploymentInput);
  if (missingInputs.length > 0) {
    const decision = await requestDeploymentDecision({
      store,
      runId,
      deploymentInput,
      authorization
    });
    return { status: 'DEPLOYMENT_INPUT_REQUIRED', ...decision, missingInputs };
  }
  validateDeploymentInput(deploymentInput);
  const run = await store.readRun(runId);
  if (!['FINAL_AUDIT_PASSED', 'DEPLOYMENT_DECISION_REQUIRED'].includes(run.status)) {
    throw new DeploymentHandoffError('DEPLOYMENT_NOT_READY', '运行尚未进入部署决策状态');
  }
  const reportPath = join(store.projectRoot, '.product', 'runs', runId, DEPLOYMENT_DIRECTORY, 'dry-run.json');
  await writeJsonAtomically(
    reportPath,
    buildDryRunReport({ run, deploymentInput, authorization, missingInputs: [] })
  );
  const correlationId = `DEPLOY-${runId}`;
  const existing = (await store.readInteraction(runId)).find(
    (message) => message.correlation_id === correlationId && message.to === SERVICE_DEPLOYMENT
  );
  if (existing) {
    return { status: 'DEPLOYMENT_ALREADY_REQUESTED', request: existing, reportPath };
  }
  const request = {
    message_id: `MSG-${runId}-DEPLOYMENT`,
    run_id: runId,
    round: 1,
    from: 'product-delivery-workflow',
    to: SERVICE_DEPLOYMENT,
    kind: 'request',
    action: 'execute',
    status: 'pending',
    verdict: null,
    correlation_id: correlationId,
    input_refs: [`.product/runs/${runId}/${DEPLOYMENT_DIRECTORY}/dry-run.json`],
    output_refs: [],
    payload: {
      operator: authorization.operator,
      reason: authorization.reason,
      deploymentInput: sanitizeDeploymentInput(deploymentInput),
      authority: 'service-deployment'
    }
  };
  await store.appendInteraction(runId, request);
  await store.updateRun(runId, {
    status: 'DEPLOYMENT_REQUESTED',
    deploymentRequestId: request.message_id
  });
  await store.appendAudit(runId, {
    event_id: `AUDIT-${runId}-DEPLOYMENT-REQUESTED`,
    action: 'deployment_requested',
    actor: authorization.operator,
    reason: authorization.reason
  });
  return { status: 'DEPLOYMENT_REQUESTED', request, reportPath };
}

/**
 * 检查授权字段。
 *
 * @param {object} authorization 授权信息
 * @returns {void}
 * @throws {DeploymentHandoffError} 授权不完整时抛出
 * @author lvdaxianer@yeah.net
 */
function validateAuthorization(authorization) {
  if (typeof authorization.operator !== 'string' || authorization.operator.trim() === '') {
    throw new DeploymentHandoffError('DEPLOYMENT_AUTH_INVALID', '部署授权缺少操作者');
  }
  if (typeof authorization.reason !== 'string' || authorization.reason.trim() === '') {
    throw new DeploymentHandoffError('DEPLOYMENT_AUTH_INVALID', '部署授权缺少原因');
  }
}

/**
 * 收集部署必需输入，不猜测缺失值。
 *
 * @param {object} input 部署输入
 * @returns {string[]} 缺失字段
 * @author lvdaxianer@yeah.net
 */
function collectMissingInputs(input) {
  return REQUIRED_INPUTS.filter((field) => input[field] === undefined || input[field] === null);
}

/**
 * 校验 service-deployment 所需参数。
 *
 * @param {object} input 部署输入
 * @returns {void}
 * @throws {DeploymentHandoffError} 参数非法时抛出
 * @author lvdaxianer@yeah.net
 */
function validateDeploymentInput(input) {
  if (typeof input.DEPLOY_ROOT !== 'string' || !input.DEPLOY_ROOT.startsWith('/')) {
    throw invalidInput('DEPLOY_ROOT 必须是绝对路径');
  }
  if (typeof input.service_name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(input.service_name)) {
    throw invalidInput('service_name 不是合法的小写服务名');
  }
  if (!RUNTIME_TARGETS.has(input.runtime_target)) throw invalidInput('runtime_target 无效');
  if (typeof input.config_path !== 'string' || !input.config_path.startsWith('/')) {
    throw invalidInput('config_path 必须是绝对路径');
  }
  if (!input.artifact || typeof input.artifact !== 'object') throw invalidInput('artifact 缺失');
  if (!/^[a-f0-9]{64}$/i.test(input.artifact.sha256 ?? '')) {
    throw invalidInput('artifact.sha256 必须是 SHA-256');
  }
  if (!input.migration || typeof input.migration !== 'object') throw invalidInput('migration 缺失');
  if (!Number.isInteger(input.retention) || input.retention < 0) throw invalidInput('retention 无效');
  validateLifecycle(input.lifecycle);
  if (input.runtime_target === 'docker-container' && !input.dockerManifest) {
    throw invalidInput('docker-container 缺少 dockerManifest');
  }
}

/**
 * 校验生命周期命令和模式。
 *
 * @param {object} lifecycle 生命周期配置
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateLifecycle(lifecycle) {
  if (!lifecycle || !LIFECYCLE_MODES.has(lifecycle.mode)) throw invalidInput('lifecycle.mode 无效');
  const missing = LIFECYCLE_FIELDS.filter((field) => typeof lifecycle[field] !== 'string'
    || lifecycle[field].trim() === '');
  if (missing.length > 0) throw invalidInput(`lifecycle 缺少：${missing.join('、')}`);
}

/**
 * 生成不包含秘密的 dry-run 报告。
 *
 * @param {object} input 报告输入
 * @returns {object} dry-run 报告
 * @author lvdaxianer@yeah.net
 */
function buildDryRunReport({ run, deploymentInput, authorization, missingInputs }) {
  return {
    schema_version: 'deployment-v2',
    dry_run: true,
    status: 'decision-required',
    run_id: run.runId,
    service: deploymentInput.service_name ?? null,
    service_root: deploymentInput.DEPLOY_ROOT ?? null,
    operator: authorization.operator ?? null,
    timestamp: new Date().toISOString(),
    missing_inputs: missingInputs,
    exact_commands: collectCommands(deploymentInput.lifecycle),
    note: '本报告不执行真实部署；只有用户明确授权且参数完整时才会交给 '
      + 'service-deployment。'
  };
}

/**
 * 提取可审计的生命周期命令。
 *
 * @param {object|undefined} lifecycle 生命周期配置
 * @returns {string[]} 命令摘要
 * @author lvdaxianer@yeah.net
 */
function collectCommands(lifecycle = {}) {
  return ['start', 'stop', 'status', 'readiness', 'liveness', 'smoke']
    .filter((field) => typeof lifecycle[field] === 'string')
    .map((field) => `${field}: ${lifecycle[field]}`);
}

/**
 * 去除部署输入中的敏感字段。
 *
 * @param {object} input 部署输入
 * @returns {object} 可落账输入
 * @author lvdaxianer@yeah.net
 */
function sanitizeDeploymentInput(input) {
  const safe = {};
  Object.entries(input).forEach(([key, value]) => {
    if (/password|secret|token|private|credential|envValue/i.test(key)) return;
    safe[key] = value;
  });
  return safe;
}

/**
 * 创建非法输入错误。
 *
 * @param {string} message 中文错误说明
 * @returns {DeploymentHandoffError} 参数错误
 * @author lvdaxianer@yeah.net
 */
function invalidInput(message) {
  return new DeploymentHandoffError('DEPLOYMENT_INPUT_INVALID', message);
}

/**
 * 原子写入 JSON。
 *
 * @param {string} path 文件路径
 * @param {object} value JSON 内容
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function writeJsonAtomically(path, value) {
  await mkdir(join(path, '..'), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  await rename(temporaryPath, path);
}
