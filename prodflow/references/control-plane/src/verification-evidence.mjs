import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const EVIDENCE_DIRECTORY = 'verification/evidence';
const VERIFICATION_DIRECTORY = 'verification';
const VALID_TYPES = new Set(['command', 'api', 'browser', 'smoke']);

/**
 * 表示验收证据不满足门禁协议。
 *
 * @author lvdaxianer@yeah.net
 */
export class VerificationEvidenceError extends Error {
  /**
   * 创建带稳定错误码的证据错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'VerificationEvidenceError';
    this.code = code;
  }
}

/**
 * 管理验收契约、证据记录和 verification bundle。
 *
 * @author lvdaxianer@yeah.net
 */
export class VerificationStore {
  /**
   * 创建绑定项目根目录的证据存储。
   *
   * @param {object} options 初始化配置
   * @param {string} options.projectRoot 项目根目录
   * @author lvdaxianer@yeah.net
   */
  constructor({ projectRoot }) {
    if (typeof projectRoot !== 'string' || projectRoot.length === 0) {
      throw new TypeError('项目根目录不能为空');
    }
    this.projectRoot = resolve(projectRoot);
  }

  /**
   * 为每条验收标准创建独立验证契约。
   *
   * @param {string} runId 运行 ID
   * @param {string} featureId 功能 ID
   * @param {object[]} acceptanceCriteria 验收标准
   * @returns {Promise<object[]>} 验证契约
   * @author lvdaxianer@yeah.net
   */
  async createContracts(runId, featureId, acceptanceCriteria) {
    const contracts = acceptanceCriteria.map((criterion) => createContract(runId, featureId, criterion));
    await this.writeRunFile(runId, 'contracts.json', contracts);
    return contracts;
  }

  /**
   * 追加一条可回放证据记录。
   *
   * @param {string} runId 运行 ID
   * @param {object} evidence 证据输入
   * @returns {Promise<object>} 证据记录
   * @author lvdaxianer@yeah.net
   */
  async recordEvidence(runId, evidence) {
    const contracts = await this.readContracts(runId);
    const contract = contracts.find((item) => item.acceptanceId === evidence.acceptanceId);
    if (!contract) {
      throw new VerificationEvidenceError('VERIFICATION_CONTRACT_NOT_FOUND', '验收标准契约不存在');
    }
    validateEvidence(contract, evidence);
    const record = {
      ...evidence,
      evidenceId: `EVIDENCE-${randomUUID()}`,
      runId,
      recordedAt: new Date().toISOString()
    };
    await this.writeRunFile(runId, `${EVIDENCE_DIRECTORY}/${record.evidenceId}.json`, record);
    return record;
  }

  /**
   * 评估所有验收证据并写入 bundle。
   *
   * @param {string} runId 运行 ID
   * @param {object} binding 当前 commit/release 绑定
   * @returns {Promise<object>} 证据门禁结果
   * @author lvdaxianer@yeah.net
   */
  async evaluate(runId, binding) {
    const contracts = await this.readContracts(runId);
    const evidence = await this.readEvidence(runId);
    const result = evaluateContracts(contracts, evidence, binding);
    const bundle = await this.writeBundle(runId, result, binding);
    return { ...result, bundlePath: bundle.path, bundleHash: bundle.bundleHash };
  }

  /**
   * 读取当前 run 的验证契约。
   *
   * @param {string} runId 运行 ID
   * @returns {Promise<object[]>} 契约集合
   * @author lvdaxianer@yeah.net
   */
  async readContracts(runId) {
    return readJson(this.runPath(runId, 'contracts.json'));
  }

  /**
   * 读取当前 run 的全部证据。
   *
   * @param {string} runId 运行 ID
   * @returns {Promise<object[]>} 证据集合
   * @author lvdaxianer@yeah.net
   */
  async readEvidence(runId) {
    return readJsonDirectory(this.runPath(runId, EVIDENCE_DIRECTORY));
  }

  /**
   * 写入 bundle 并生成内容哈希。
   *
   * @param {string} runId 运行 ID
   * @param {object} result 评估结果
   * @param {object} binding 当前绑定
   * @returns {Promise<object>} bundle 元数据
   * @author lvdaxianer@yeah.net
   */
  async writeBundle(runId, result, binding) {
    const payload = {
      runId,
      status: result.status,
      reasons: result.reasons,
      evidenceRefs: result.evidenceRefs,
      binding,
      generatedAt: new Date().toISOString()
    };
    const bundleHash = hashObject(payload);
    const bundle = { ...payload, bundleHash };
    const path = this.runPath(runId, `${VERIFICATION_DIRECTORY}/verification-bundle.json`);
    await writeJsonAtomically(path, bundle);
    return { path, bundleHash };
  }

  /**
   * 返回 run 文件路径。
   *
   * @param {string} runId 运行 ID
   * @param {string} relativePath run 内相对路径
   * @returns {string} 文件路径
   * @author lvdaxianer@yeah.net
   */
  runPath(runId, relativePath) {
    return join(this.projectRoot, '.product', 'runs', runId, relativePath);
  }

  /**
   * 写入 run 文件。
   *
   * @param {string} runId 运行 ID
   * @param {string} relativePath run 内相对路径
   * @param {object[]} value JSON 值
   * @returns {Promise<void>} 写入完成
   * @author lvdaxianer@yeah.net
   */
  async writeRunFile(runId, relativePath, value) {
    await writeJsonAtomically(this.runPath(runId, relativePath), value);
  }
}

/**
 * 创建一个验收契约。
 *
 * @param {string} runId 运行 ID
 * @param {string} featureId 功能 ID
 * @param {object} criterion 验收标准
 * @returns {object} 验收契约
 * @author lvdaxianer@yeah.net
 */
function createContract(runId, featureId, criterion) {
  const type = criterion.verificationType ?? inferVerificationType(criterion.verification);
  if (!VALID_TYPES.has(type)) {
    throw new VerificationEvidenceError('VERIFICATION_TYPE_INVALID', '验证类型无效');
  }
  return {
    runId,
    featureId,
    acceptanceId: criterion.id,
    description: criterion.content,
    verificationType: type,
    operation: criterion.verification,
    expected: criterion.expected ?? '满足验收标准',
    requiredEvidence: requiredEvidenceFor(type)
  };
}

/**
 * 根据验证描述推断验证类型。
 *
 * @param {string} verification 验证描述
 * @returns {string} 验证类型
 * @author lvdaxianer@yeah.net
 */
function inferVerificationType(verification = '') {
  if (/浏览器|页面|点击|截图/.test(verification)) return 'browser';
  if (/API|接口|HTTP/i.test(verification)) return 'api';
  return 'command';
}

/**
 * 返回不同验证类型的必要证据字段。
 *
 * @param {string} type 验证类型
 * @returns {string[]} 必要字段
 * @author lvdaxianer@yeah.net
 */
function requiredEvidenceFor(type) {
  if (type === 'browser') return ['pageUrl', 'actions', 'assertions', 'screenshotRefs'];
  if (type === 'api') return ['apiSummary'];
  return ['command', 'exitCode'];
}

/**
 * 校验证据的通用字段和类型特有字段。
 *
 * @param {object} contract 验收契约
 * @param {object} evidence 证据输入
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function validateEvidence(contract, evidence) {
  if (evidence.type !== contract.verificationType || !['passed', 'failed'].includes(evidence.status)) {
    throw new VerificationEvidenceError('VERIFICATION_EVIDENCE_INVALID', '证据类型或状态无效');
  }
  if (typeof evidence.expected !== 'string' || typeof evidence.actual !== 'string') {
    throw new VerificationEvidenceError('VERIFICATION_EVIDENCE_INVALID', '证据缺少预期或实际结果');
  }
}

/**
 * 评估契约集合和证据集合。
 *
 * @param {object[]} contracts 验收契约
 * @param {object[]} evidence 证据集合
 * @param {object} binding 当前绑定
 * @returns {object} 评估结果
 * @author lvdaxianer@yeah.net
 */
function evaluateContracts(contracts, evidence, binding) {
  const reasons = [];
  const evidenceRefs = [];
  let hasFailure = false;
  contracts.forEach((contract) => {
    const records = evidence.filter((item) => item.acceptanceId === contract.acceptanceId);
    const latest = records.at(-1);
    if (!latest) {
      reasons.push(`${contract.acceptanceId} 缺少证据`);
      return;
    }
    evidenceRefs.push(latest.evidenceId);
    if (latest.status === 'failed') {
      hasFailure = true;
    }
    reasons.push(...bindingProblems(latest, binding));
    reasons.push(...missingRequiredEvidence(contract, latest));
  });
  const status = hasFailure ? 'FAILED' : reasons.length > 0 ? 'INCONCLUSIVE' : 'VERIFIED';
  return { status, reasons, evidenceRefs };
}

/**
 * 检查证据与当前 commit/release 的绑定。
 *
 * @param {object} evidence 证据
 * @param {object} binding 当前绑定
 * @returns {string[]} 绑定问题
 * @author lvdaxianer@yeah.net
 */
function bindingProblems(evidence, binding) {
  const commitMatches = binding.currentCommit && evidence.commit === binding.currentCommit;
  const releaseMatches = binding.currentRelease && evidence.release === binding.currentRelease;
  return commitMatches || releaseMatches ? [] : ['证据与当前 commit/release 不匹配'];
}

/**
 * 检查浏览器/API/命令的必要字段。
 *
 * @param {object} contract 验收契约
 * @param {object} evidence 证据
 * @returns {string[]} 缺失字段原因
 * @author lvdaxianer@yeah.net
 */
function missingRequiredEvidence(contract, evidence) {
  return contract.requiredEvidence.flatMap((field) => {
    const value = evidence[field];
    const missing = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    const labels = {
      pageUrl: '页面 URL',
      screenshotRefs: '截图',
      actions: '操作记录',
      assertions: '页面断言'
    };
    const label = labels[field] ?? field;
    return missing ? [`${contract.acceptanceId} 缺少 ${label} 证据`] : [];
  });
}

/**
 * 原子写入 JSON。
 *
 * @param {string} path 文件路径
 * @param {object} value JSON 值
 * @returns {Promise<void>} 写入完成
 * @author lvdaxianer@yeah.net
 */
async function writeJsonAtomically(path, value) {
  await mkdir(join(path, '..'), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

/**
 * 读取 JSON 文件。
 *
 * @param {string} path 文件路径
 * @returns {Promise<object|object[]>} JSON 值
 * @author lvdaxianer@yeah.net
 */
async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/**
 * 读取目录下的 JSON 证据文件。
 *
 * @param {string} directory 目录
 * @returns {Promise<object[]>} JSON 集合
 * @author lvdaxianer@yeah.net
 */
async function readJsonDirectory(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => readJson(join(directory, entry.name))));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * 计算 bundle 内容哈希。
 *
 * @param {object} value bundle 内容
 * @returns {string} SHA-256
 * @author lvdaxianer@yeah.net
 */
function hashObject(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}
