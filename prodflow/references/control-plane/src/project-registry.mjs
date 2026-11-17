import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * 表示项目注册事实不满足约束。
 *
 * @author lvdaxianer@yeah.net
 */
export class ProjectRegistryError extends Error {
  /**
   * 创建项目注册错误。
   *
   * @param {string} code 稳定错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'ProjectRegistryError';
    this.code = code;
  }
}

/**
 * 管理共享知识根目录下的项目注册事实。
 *
 * @author lvdaxianer@yeah.net
 */
export class ProjectRegistry {
  /**
   * 创建项目注册器。
   *
   * @param {object} options 初始化配置
   * @param {string} options.sharedRoot 公共知识根目录
   * @author lvdaxianer@yeah.net
   */
  constructor({ sharedRoot }) {
    if (typeof sharedRoot !== 'string' || sharedRoot.length === 0) {
      throw new TypeError('共享知识根目录不能为空');
    }
    this.sharedRoot = resolve(sharedRoot);
    this.registryRoot = join(this.sharedRoot, 'registry', 'projects');
  }

  /**
   * 注册或幂等更新项目。
   *
   * @param {object} input 项目注册信息
   * @returns {Promise<object>} 注册事实
   * @throws {ProjectRegistryError} ID 绑定不同路径时抛出
   * @author lvdaxianer@yeah.net
   */
  async registerProject({ projectId, projectRoot, name }) {
    assertIdentifier(projectId, '项目 ID');
    assertText(name, '项目名称');
    if (typeof projectRoot !== 'string' || projectRoot.length === 0) {
      throw new ProjectRegistryError('PROJECT_REGISTRY_INPUT_INVALID', '项目根目录不能为空');
    }
    const normalizedRoot = resolve(projectRoot);
    const existing = await readOptionalJson(this.projectPath(projectId));
    if (existing && existing.projectRoot !== normalizedRoot) {
      throw new ProjectRegistryError('PROJECT_REGISTRY_CONFLICT', '项目 ID 已绑定其他路径');
    }
    const now = new Date().toISOString();
    const record = {
      schemaVersion: 1,
      projectId,
      name,
      projectRoot: normalizedRoot,
      status: existing?.status ?? 'active',
      registrationVersion: existing?.registrationVersion ?? randomUUID(),
      registeredAt: existing?.registeredAt ?? now,
      updatedAt: now
    };
    await writeJsonAtomically(this.projectPath(projectId), record);
    return record;
  }

  /**
   * 读取项目注册事实。
   *
   * @param {string} projectId 项目 ID
   * @returns {Promise<object>} 注册事实
   * @author lvdaxianer@yeah.net
   */
  async readProject(projectId) {
    assertIdentifier(projectId, '项目 ID');
    const record = await readOptionalJson(this.projectPath(projectId));
    if (!record) throw new ProjectRegistryError('PROJECT_NOT_FOUND', '项目注册不存在');
    return record;
  }

  /**
   * 列出所有项目注册事实。
   *
   * @returns {Promise<object[]>} 项目集合
   * @author lvdaxianer@yeah.net
   */
  async listProjects() {
    let entries;
    try {
      entries = await readdir(this.registryRoot, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    const records = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => JSON.parse(await readFile(join(this.registryRoot, entry.name), 'utf8'))));
    return records.sort((left, right) => left.projectId.localeCompare(right.projectId));
  }

  /**
   * 返回项目注册文件路径。
   *
   * @param {string} projectId 项目 ID
   * @returns {string} 文件路径
   * @author lvdaxianer@yeah.net
   */
  projectPath(projectId) {
    assertIdentifier(projectId, '项目 ID');
    return join(this.registryRoot, `${projectId}.json`);
  }
}

/**
 * 校验文本字段。
 *
 * @param {unknown} value 字段值
 * @param {string} label 字段名称
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function assertText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProjectRegistryError('PROJECT_REGISTRY_INPUT_INVALID', `${label}不能为空`);
  }
}

/**
 * 校验项目 ID。
 *
 * @param {unknown} value ID
 * @param {string} label 字段名称
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    throw new ProjectRegistryError('PROJECT_REGISTRY_IDENTIFIER_INVALID', `${label}无效`);
  }
}

/**
 * 读取可选 JSON。
 *
 * @param {string} path 文件路径
 * @returns {Promise<object|undefined>} JSON 内容
 * @author lvdaxianer@yeah.net
 */
async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
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
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  await rename(temporaryPath, path);
}
