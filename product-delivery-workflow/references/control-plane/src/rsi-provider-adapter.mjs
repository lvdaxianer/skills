import { randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ADAPTER_SCHEMA_VERSION = 1;
const DEFAULT_PROMPT_MAX_BYTES = 16 * 1024;
const PROVIDER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const PROVIDER_PROFILES = Object.freeze({
  claude: { name: 'claude', importSnippet: (path) => `@${path}` },
  codex: { name: 'codex', importSnippet: (path) => `请先读取 ${path}，再回答当前任务。` },
  kimi: { name: 'kimi', importSnippet: (path) => `请先读取 ${path}，再回答当前任务。` },
  cursor: { name: 'cursor', importSnippet: (path) => `读取 ${path} 作为当前 RSI 上下文。` },
  generic: { name: 'generic', importSnippet: (path) => `读取 ${path} 作为当前 RSI 上下文。` }
});

/**
 * 表示 Provider Adapter 的稳定协议错误。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiProviderAdapterError extends Error {
  /**
   * 创建带稳定错误码的适配器错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'RsiProviderAdapterError';
    this.code = code;
  }
}

/**
 * 为不同 AI 工具生成统一 RSI 文件或 Prompt 注入结果。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiProviderAdapterRegistry {
  /**
   * 创建绑定项目目录和快照构建器的注册表。
   *
   * @param {object} options 注册表依赖
   * @param {string} options.projectRoot 项目根目录
   * @param {object} options.builder RSI 快照构建器
   * @author lvdaxianer@yeah.net
   */
  constructor({ projectRoot, builder }) {
    if (typeof projectRoot !== 'string' || !projectRoot) {
      throw new RsiProviderAdapterError('RSI_ADAPTER_PATH_INVALID', '项目根目录不能为空');
    }
    if (!builder || typeof builder.read !== 'function' || typeof builder.toMarkdown !== 'function') {
      throw new RsiProviderAdapterError('RSI_ADAPTER_BUILDER_INVALID', 'RSI 快照构建器不可用');
    }
    this.projectRoot = projectRoot;
    this.builder = builder;
  }

  /**
   * 执行一次文件、Prompt 或 fallback 注入。
   *
   * @param {object} options 注入参数
   * @returns {Promise<object>} 注入结果
   * @author lvdaxianer@yeah.net
   */
  async inject(options = {}) {
    const input = normalizeInjectionOptions(options);
    const snapshot = await resolveSnapshot(this.builder, input);
    const profile = resolveProfile(input.provider);
    const base = createResultBase(input.provider, profile, snapshot);
    if (input.mode === 'file') return this.injectFile(base, snapshot, profile);
    if (input.mode === 'prompt') return this.createPrompt(base, snapshot, input.maxPromptBytes);
    return this.createFallback(base, snapshot, input.maxPromptBytes, input.mode);
  }

  /**
   * 把快照写入独立 Provider 目录，不触碰用户规则文件。
   *
   * @param {object} base 结果基础信息
   * @param {object} snapshot RSI 快照
   * @param {object} profile Provider 配置
   * @returns {Promise<object>} 文件注入结果
   * @author lvdaxianer@yeah.net
   */
  async injectFile(base, snapshot, profile) {
    const providerRoot = join(this.projectRoot, '.product', 'rsi', 'providers', profile.name);
    const paths = createProviderPaths(providerRoot);
    const markdown = this.builder.toMarkdown(snapshot);
    const manifest = { ...base.manifest, injectionMethod: 'file', generatedAt: new Date().toISOString() };
    await writeTextAtomically(paths.markdown, markdown);
    await writeJsonAtomically(paths.manifest, manifest);
    const importPath = relative(this.projectRoot, paths.markdown).split('\\').join('/');
    return {
      ...base,
      status: 'injected',
      injectionMethod: 'file',
      paths,
      importSnippet: profile.importSnippet(importPath),
      manifest
    };
  }

  /**
   * 生成受字节预算限制的 Prompt prelude。
   *
   * @param {object} base 结果基础信息
   * @param {object} snapshot RSI 快照
   * @param {number} maxPromptBytes Prompt 上限
   * @returns {object} Prompt 注入结果
   * @author lvdaxianer@yeah.net
   */
  createPrompt(base, snapshot, maxPromptBytes) {
    const markdown = this.builder.toMarkdown(snapshot);
    const prelude = truncateUtf8(createPrelude(base, markdown), maxPromptBytes);
    return {
      ...base,
      status: 'injected',
      injectionMethod: 'prompt',
      promptPrelude: prelude,
      promptBytes: Buffer.byteLength(prelude, 'utf8'),
      truncated: prelude.length < createPrelude(base, markdown).length,
      manifest: { ...base.manifest, injectionMethod: 'prompt' }
    };
  }

  /**
   * 对不支持的注入方式提供明确的 Prompt fallback。
   *
   * @param {object} base 结果基础信息
   * @param {object} snapshot RSI 快照
   * @param {number} maxPromptBytes Prompt 上限
   * @param {string} requestedMode 请求方式
   * @returns {object} fallback 结果
   * @author lvdaxianer@yeah.net
   */
  createFallback(base, snapshot, maxPromptBytes, requestedMode) {
    const prompt = this.createPrompt(base, snapshot, maxPromptBytes);
    return {
      ...prompt,
      status: 'fallback',
      fallback: {
        requestedMode,
        selectedMode: 'prompt',
        reason: 'Provider 不支持请求的注入方式'
      }
    };
  }
}

function normalizeInjectionOptions(options) {
  const provider = options.provider ?? 'generic';
  if (typeof provider !== 'string' || !PROVIDER_PATTERN.test(provider)) {
    throw new RsiProviderAdapterError('RSI_PROVIDER_INVALID', 'Provider 标识无效');
  }
  const maxPromptBytes = options.maxPromptBytes ?? DEFAULT_PROMPT_MAX_BYTES;
  if (!Number.isInteger(maxPromptBytes) || maxPromptBytes < 256 || maxPromptBytes > 1024 * 1024) {
    throw new RsiProviderAdapterError('RSI_PROMPT_BUDGET_INVALID', 'Prompt 字节预算无效');
  }
  return {
    provider: provider.toLowerCase(),
    snapshot: options.snapshot,
    snapshotId: options.snapshotId,
    mode: options.mode ?? 'file',
    maxPromptBytes
  };
}

function resolveProfile(provider) {
  return PROVIDER_PROFILES[provider] ?? {
    name: provider,
    importSnippet: PROVIDER_PROFILES.generic.importSnippet
  };
}

async function resolveSnapshot(builder, input) {
  if (input.snapshot) return input.snapshot;
  if (typeof input.snapshotId === 'string' && input.snapshotId) return builder.read(input.snapshotId);
  throw new RsiProviderAdapterError('RSI_SNAPSHOT_REQUIRED', '必须提供 snapshot 或 snapshotId');
}

function createResultBase(provider, profile, snapshot) {
  return {
    provider,
    adapter: profile.name,
    snapshotId: snapshot.snapshotId,
    contentHash: snapshot.contentHash,
    manifest: {
      schemaVersion: ADAPTER_SCHEMA_VERSION,
      provider,
      adapter: profile.name,
      snapshotId: snapshot.snapshotId,
      contentHash: snapshot.contentHash,
      sourceHash: snapshot.sourceHash
    }
  };
}

function createProviderPaths(providerRoot) {
  return {
    markdown: join(providerRoot, 'current.md'),
    manifest: join(providerRoot, 'current.manifest.json')
  };
}

function createPrelude(base, markdown) {
  return [
    `<!-- RSI snapshotId=${base.snapshotId} contentHash=${base.contentHash} -->`,
    '以下是已验证的 RSI 上下文。当前用户要求和当前运行证据优先于它：',
    markdown,
    '<!-- END RSI CONTEXT -->'
  ].join('\n');
}

function truncateUtf8(text, maxBytes) {
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.length <= maxBytes) return text;
  let result = buffer.subarray(0, maxBytes).toString('utf8');
  while (Buffer.byteLength(result, 'utf8') > maxBytes) result = result.slice(0, -1);
  return result;
}

async function writeJsonAtomically(path, value) {
  await writeTextAtomically(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextAtomically(path, text) {
  await mkdir(join(path, '..'), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, text, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, path);
}
