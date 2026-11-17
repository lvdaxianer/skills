import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SCHEMA_VERSION = 1;
const DEFAULT_MAX_ITEMS = 20;
const DEFAULT_MAX_BYTES = 32 * 1024;
const MAX_ITEM_TEXT_LENGTH = 2000;
const MAX_TASK_LENGTH = 4000;
const MAX_SOURCE_ITEMS = 1000;
const MAX_CURRENT_FACTS = 100;
const MAX_REFERENCE_LENGTH = 512;
const VALID_LAYERS = new Set(['global', 'project', 'current']);
const SEVERITY_SCORE = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const SOURCE_PRIORITY = { global: 1, project: 2, current: 3 };

/**
 * 表示 RSI 上下文协议不满足稳定约束。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiContextError extends Error {
  /**
   * 创建带稳定错误码的 RSI 错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'RsiContextError';
    this.code = code;
  }
}

/**
 * 从全局目录和项目事实源生成工具无关的 RSI 快照。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiContextBuilder {
  /**
   * 创建绑定到一个项目的快照构建器。
   *
   * @param {object} options 构建器依赖
   * @param {string} options.projectRoot 项目根目录
   * @param {string} options.sharedKnowledgeRoot 共享知识根目录
   * @param {object} options.globalCatalog 全局知识目录
   * @param {object} options.knowledgeStore 项目知识事实源
   * @author lvdaxianer@yeah.net
   */
  constructor({ projectRoot, sharedKnowledgeRoot, globalCatalog, knowledgeStore }) {
    assertPath(projectRoot, '项目根目录');
    assertPath(sharedKnowledgeRoot, '共享知识根目录');
    if (!globalCatalog || typeof globalCatalog.listProblems !== 'function') {
      throw new RsiContextError('RSI_GLOBAL_CATALOG_INVALID', '全局知识目录不可用');
    }
    if (!knowledgeStore || typeof knowledgeStore.listKnowledge !== 'function') {
      throw new RsiContextError('RSI_KNOWLEDGE_STORE_INVALID', '项目知识事实源不可用');
    }
    this.projectRoot = resolve(projectRoot);
    this.sharedKnowledgeRoot = resolve(sharedKnowledgeRoot);
    this.globalCatalog = globalCatalog;
    this.knowledgeStore = knowledgeStore;
  }

  /**
   * 生成并落盘一份 RSI 快照。
   *
   * @param {object} options 构建参数
   * @returns {Promise<object>} 快照和落盘路径
   * @author lvdaxianer@yeah.net
   */
  async build(options = {}) {
    const input = normalizeBuildOptions(options);
    const layers = await this.loadLayers(input);
    const sourceHash = stableHash(layers.flatMap((layer) => layer.items)
      .map(toSourceRecord).sort(compareSource));
    const selected = selectItems(layers, input);
    const snapshot = createSnapshot(layers, selected, input, sourceHash);
    const paths = await this.persist(snapshot);
    return { ...snapshot, paths };
  }

  /**
   * 并行读取全局和项目知识，形成固定三层。
   *
   * @param {object} input 已规范化构建参数
   * @returns {Promise<object[]>} 三层事实
   * @author lvdaxianer@yeah.net
   */
  async loadLayers(input) {
    const [globalRows, projectRows] = await Promise.all([
      this.globalCatalog.listProblems({ lifecycle: 'active' }),
      this.knowledgeStore.listKnowledge({ lifecycle: 'active' })
    ]);
    return [
      { name: 'global', items: normalizeRows(globalRows, 'global') },
      { name: 'project', items: normalizeRows(projectRows, 'project') },
      { name: 'current', items: normalizeCurrentFacts(input) }
    ];
  }

  /**
   * 读取指定快照，供重试和跨工具恢复使用。
   *
   * @param {string} snapshotId 快照 ID
   * @returns {Promise<object>} 快照
   * @author lvdaxianer@yeah.net
   */
  async read(snapshotId) {
    assertSnapshotId(snapshotId);
    try {
      return JSON.parse(await readFile(this.snapshotPath(snapshotId), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new RsiContextError('RSI_SNAPSHOT_NOT_FOUND', 'RSI 快照不存在');
      }
      throw new RsiContextError('RSI_SNAPSHOT_INVALID', 'RSI 快照无法读取');
    }
  }

  /**
   * 将 JSON 快照转换成工具可导入的 Markdown。
   *
   * @param {object} snapshot RSI 快照
   * @returns {string} Markdown 文本
   * @author lvdaxianer@yeah.net
   */
  toMarkdown(snapshot) {
    validateSnapshot(snapshot);
    return renderMarkdown(snapshot);
  }

  /**
   * 原子写入全部快照文件。
   *
   * @param {object} snapshot RSI 快照
   * @param {object} paths 快照路径
   * @param {string} markdown Markdown 内容
   * @returns {Promise<void>} 写入完成
   * @author lvdaxianer@yeah.net
   */
  async writeArtifacts(snapshot, paths, markdown) {
    await writeJsonAtomically(paths.json, snapshot);
    await writeTextAtomically(paths.markdown, markdown);
    await writeJsonAtomically(paths.manifest, snapshot.manifest);
    await writeJsonAtomically(paths.currentJson, snapshot);
    await writeTextAtomically(paths.currentMarkdown, markdown);
    await writeJsonAtomically(paths.currentManifest, snapshot.manifest);
  }

  /**
   * 计算快照的所有落盘路径。
   *
   * @param {string} snapshotId 快照 ID
   * @returns {object} 文件路径
   * @author lvdaxianer@yeah.net
   */
  snapshotPaths(snapshotId) {
    const root = join(this.projectRoot, '.product', 'rsi');
    const snapshotsRoot = join(root, 'snapshots');
    return {
      json: this.snapshotPath(snapshotId),
      markdown: join(snapshotsRoot, `${snapshotId}.md`),
      manifest: join(snapshotsRoot, `${snapshotId}.manifest.json`),
      currentJson: join(root, 'current.json'),
      currentMarkdown: join(root, 'current.md'),
      currentManifest: join(root, 'current.manifest.json')
    };
  }

  /**
   * 原子写入 JSON、Markdown 和 manifest，并更新 current 指针。
   *
   * @param {object} snapshot RSI 快照
   * @returns {Promise<object>} 文件路径
   * @author lvdaxianer@yeah.net
   */
  async persist(snapshot) {
    validateSnapshot(snapshot);
    const paths = this.snapshotPaths(snapshot.snapshotId);
    const markdown = this.toMarkdown(snapshot);
    await this.writeArtifacts(snapshot, paths, markdown);
    return paths;
  }

  /**
   * 返回快照 JSON 路径。
   *
   * @param {string} snapshotId 快照 ID
   * @returns {string} 路径
   * @author lvdaxianer@yeah.net
   */
  snapshotPath(snapshotId) {
    assertSnapshotId(snapshotId);
    return join(this.projectRoot, '.product', 'rsi', 'snapshots', `${snapshotId}.json`);
  }
}

function renderMarkdown(snapshot) {
  const lines = [
    '# RSI Context Snapshot',
    `<!-- snapshotId: ${snapshot.snapshotId} -->`,
    `<!-- contentHash: ${snapshot.contentHash} -->`,
    '',
    '> 这是受预算限制的 RSI 上下文快照。它只提供已验证事实和来源引用，不替代用户当前要求。',
    ''
  ];
  snapshot.layers.forEach((layer) => appendLayerMarkdown(lines, layer));
  lines.push(
    `预算：${snapshot.budget.selectedItems}/${snapshot.budget.requestedItems} 条，最多 ${snapshot.budget.maxBytes} bytes。`,
    `快照 ID：${snapshot.snapshotId}；来源哈希：${snapshot.sourceHash}。`,
    ''
  );
  return lines.join('\n');
}

function appendLayerMarkdown(lines, layer) {
  lines.push(`## ${layerTitle(layer.name)}`);
  if (!layer.items.length) {
    lines.push('（本层无可注入条目）', '');
    return;
  }
  layer.items.forEach((item) => appendItemMarkdown(lines, item));
  lines.push('');
}

function appendItemMarkdown(lines, item) {
  lines.push(`- **${escapeMarkdown(item.title)}**（${item.itemId}）`);
  lines.push(`  - 内容：${escapeMarkdown(item.content)}`);
  lines.push(`  - 来源：${item.evidenceRefs.length ? item.evidenceRefs.join('、') : '未提供'}`);
  if (item.conflictRefs?.length) {
    lines.push(`  - 冲突来源：${item.conflictRefs.join('、')}`);
  }
}

function createSnapshot(layers, selected, input, sourceHash) {
  const selectedLayers = layers.map((layer) => ({
    name: layer.name,
    items: selected.selectedByLayer.get(layer.name) ?? []
  }));
  const sourceCount = layers.reduce((count, layer) => count + layer.items.length, 0);
  const budget = createBudget(layers, selected, input, sourceCount);
  const content = createSnapshotContent(input, selectedLayers, budget, sourceHash);
  const contentHash = stableHash(content);
  const snapshotId = `RSI-SNAPSHOT-${randomUUID()}`;
  const generatedAt = new Date().toISOString();
  return {
    ...content,
    snapshotId,
    generatedAt,
    contentHash,
    manifest: createManifest(snapshotId, generatedAt, input, sourceHash, contentHash, selectedLayers)
  };
}

function createSnapshotContent(input, layers, budget, sourceHash) {
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    provider: input.provider,
    task: input.task,
    layers,
    budget,
    sourceHash
  };
}

function createBudget(layers, selected, input, sourceCount) {
  return {
    maxItems: input.maxItems,
    maxBytes: input.maxBytes,
    requestedItems: sourceCount,
    selectedItems: selected.selectedItems,
    omittedItems: sourceCount - selected.selectedItems,
    omittedByLayer: countOmitted(layers, selected.selectedByLayer),
    truncated: selected.selectedItems < sourceCount
  };
}

function createManifest(snapshotId, generatedAt, input, sourceHash, contentHash, layers) {
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshotId,
    projectId: input.projectId,
    runId: input.runId,
    provider: input.provider,
    generatedAt,
    sourceHash,
    contentHash,
    sources: layers.flatMap((layer) => layer.items.map((item) => ({
      scope: layer.name,
      sourceScope: item.sourceScope,
      itemId: item.itemId,
      evidenceRefs: item.evidenceRefs
    })))
  };
}

/**
 * 对任意值生成稳定 SHA-256 哈希。
 *
 * @param {unknown} value 任意协议值
 * @returns {string} 十六进制哈希
 * @author lvdaxianer@yeah.net
 */
export function stableHash(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function normalizeBuildOptions(options) {
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 500) {
    throw new RsiContextError('RSI_BUDGET_INVALID', 'maxItems 必须是 1 到 500 的整数');
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 256 || maxBytes > 1024 * 1024) {
    throw new RsiContextError('RSI_BUDGET_INVALID', 'maxBytes 必须是 256 到 1048576 的整数');
  }
  return {
    projectId: normalizeLabel(options.projectId, '项目 ID', 'current-project'),
    runId: normalizeOptionalLabel(options.runId, '运行 ID'),
    provider: normalizeLabel(options.provider, 'Provider', 'generic'),
    task: normalizeText(options.task, MAX_TASK_LENGTH),
    currentFacts: Array.isArray(options.currentFacts) ? options.currentFacts : [],
    maxItems,
    maxBytes
  };
}

function normalizeRows(rows, defaultScope) {
  return (Array.isArray(rows) ? rows : []).slice(0, MAX_SOURCE_ITEMS)
    .filter((row) => isAllowedSourceScope(row.scope, defaultScope))
    .map((row) => normalizeItem(row, defaultScope))
    .filter((item) => isInjectable(item));
}

function isAllowedSourceScope(scope, layer) {
  if (!scope) return layer !== 'current';
  if (layer === 'global') return ['common', 'hybrid', 'global'].includes(scope);
  if (layer === 'project') return ['project', 'hybrid'].includes(scope);
  return scope === 'current';
}

function normalizeCurrentFacts(input) {
  const facts = input.currentFacts.slice(0, MAX_CURRENT_FACTS).map((fact, index) => normalizeItem({
    ...fact,
    eventId: fact.factId ?? fact.eventId ?? `CURRENT-${index + 1}`,
    scope: 'current',
    title: fact.title ?? '当前任务事实',
    solution: fact.content ?? fact.solution ?? fact.description
  }, 'current'));
  if (input.task && !facts.some((fact) => fact.itemId === 'CURRENT-TASK')) {
    facts.push(normalizeItem({
      eventId: 'CURRENT-TASK',
      scope: 'current',
      title: '当前任务',
      solution: input.task,
      evidenceRefs: []
    }, 'current'));
  }
  return facts.filter((item) => item.content);
}

function normalizeItem(row, fallbackScope) {
  const scope = fallbackScope;
  const content = firstText(row.content, row.solution, row.description, row.rootCause, row.title);
  const title = firstText(row.title, row.name, '未命名 RSI 条目');
  const itemId = row.itemId ?? row.eventId ?? row.id
    ?? `${fallbackScope.toUpperCase()}-${stableHash({ title, content }).slice(0, 12)}`;
  return {
    itemId: String(itemId),
    title: title.slice(0, 200),
    content: content.slice(0, MAX_ITEM_TEXT_LENGTH),
    scope,
    sourceScope: row.scope ?? fallbackScope,
    lifecycle: row.lifecycle ?? 'active',
    classificationStatus: row.classificationStatus ?? row.status ?? 'verified',
    severity: row.severity ?? 'info',
    confidence: Number.isFinite(row.confidence) ? row.confidence : null,
    evidenceRefs: normalizeRefs(row.evidenceRefs),
    verifiedAt: row.verifiedAt ?? row.updatedAt ?? row.createdAt ?? null,
    sourceType: row.sourceType ?? (scope === 'current' ? 'current-fact' : 'knowledge-fact')
  };
}

function isInjectable(item) {
  return VALID_LAYERS.has(item.scope)
    && item.lifecycle === 'active'
    && !['unknown', 'pending', 'candidate'].includes(item.classificationStatus)
    && Boolean(item.content);
}

function selectItems(layers, input) {
  const ranked = rankCandidates(layers, input.task);
  const selected = selectRanked(ranked, layers, input);
  return {
    selectedItems: selected.length,
    selectedByLayer: addOverrides(layers, selected)
  };
}

function rankCandidates(layers, task) {
  return layers.flatMap((layer) => layer.items.map((item) => ({
    ...item,
    _layer: layer.name,
    _score: relevanceScore(item, task)
  }))).sort((left, right) => (
    (SOURCE_PRIORITY[right._layer] - SOURCE_PRIORITY[left._layer])
      || (right._score - left._score)
      || left.itemId.localeCompare(right.itemId)
  ));
}

function selectRanked(ranked, layers, input) {
  const selected = [];
  ranked.some((candidate) => {
    if (selected.length >= input.maxItems) return true;
    const tentative = [...selected, candidate];
    if (estimateBytes(addOverrides(layers, tentative), input) <= input.maxBytes || !selected.length) {
      selected.push(candidate);
    }
    return false;
  });
  return selected;
}

function addOverrides(layers, selected) {
  const selectedIds = new Set(selected.map((item) => `${item._layer}:${item.itemId}`));
  const globalIds = new Set(selected.filter((item) => item._layer === 'global').map((item) => item.itemId));
  const projectIds = new Set(selected.filter((item) => item._layer === 'project').map((item) => item.itemId));
  return new Map(layers.map((layer) => [layer.name, layer.items
    .filter((item) => selectedIds.has(`${layer.name}:${item.itemId}`))
    .map((item) => {
      const copy = { ...item };
      if (layer.name === 'project' && globalIds.has(item.itemId)) {
        copy.conflictRefs = [`global:${item.itemId}`];
      }
      if (layer.name === 'global' && projectIds.has(item.itemId)) {
        copy.overriddenBy = [`project:${item.itemId}`];
      }
      return copy;
    })]));
}

function estimateBytes(selectedByLayer, input) {
  const layers = [...selectedByLayer.entries()].map(([name, items]) => ({ name, items }));
  const selectedItems = layers.reduce((count, layer) => count + layer.items.length, 0);
  const draft = {
    snapshotId: 'RSI-SNAPSHOT-00000000-0000-0000-0000-000000000000',
    contentHash: '0'.repeat(64),
    sourceHash: '0'.repeat(64),
    budget: { selectedItems, requestedItems: 999999, maxBytes: input.maxBytes },
    layers
  };
  return Buffer.byteLength(renderMarkdown(draft), 'utf8');
}

function countOmitted(layers, selectedByLayer) {
  return Object.fromEntries(layers.map((layer) => [
    layer.name,
    layer.items.length - (selectedByLayer.get(layer.name)?.length ?? 0)
  ]));
}

function relevanceScore(item, task) {
  const normalizedTask = task.toLowerCase();
  if (!normalizedTask) return SEVERITY_SCORE[item.severity] ?? 0;
  const haystack = `${item.title} ${item.content}`.toLowerCase();
  const tokens = normalizedTask.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const overlap = tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
  return overlap * 10 + (SEVERITY_SCORE[item.severity] ?? 0);
}

function toSourceRecord(item) {
  return {
    itemId: item.itemId,
    scope: item.scope,
    title: item.title,
    content: item.content,
    evidenceRefs: item.evidenceRefs,
    verifiedAt: item.verifiedAt,
    sourceType: item.sourceType,
    sourceScope: item.sourceScope
  };
}

function compareSource(left, right) {
  return left.scope.localeCompare(right.scope) || left.itemId.localeCompare(right.itemId);
}

function layerTitle(name) {
  return { global: '全局 RSI', project: '项目 RSI', current: '当前事实' }[name] ?? name;
}

function escapeMarkdown(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('*', '\\*')
    .replaceAll('_', '\\_')
    .replaceAll('`', '\\`')
    .replaceAll('\n', ' ');
}

function normalizeRefs(refs) {
  return Array.isArray(refs)
    ? refs.filter((ref) => typeof ref === 'string')
      .map((ref) => ref.slice(0, MAX_REFERENCE_LENGTH)).slice(0, 20)
    : [];
}

function firstText(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() ?? '';
}

function normalizeLabel(value, label, fallback) {
  const normalized = value ?? fallback;
  if (typeof normalized !== 'string' || normalized.trim().length === 0 || normalized.length > 128) {
    throw new RsiContextError('RSI_INPUT_INVALID', `${label}必须是 1 到 128 个字符`);
  }
  return normalized.trim();
}

function normalizeOptionalLabel(value, label) {
  if (value === null || value === undefined) return null;
  return normalizeLabel(value, label, '');
}

function normalizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validateSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== SCHEMA_VERSION || !Array.isArray(snapshot.layers)) {
    throw new RsiContextError('RSI_SNAPSHOT_INVALID', 'RSI 快照结构无效');
  }
  if (!snapshot.layers.every((layer) => VALID_LAYERS.has(layer.name) && Array.isArray(layer.items))) {
    throw new RsiContextError('RSI_SNAPSHOT_INVALID', 'RSI 快照层无效');
  }
}

function assertPath(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new RsiContextError('RSI_PATH_INVALID', `${label}不能为空`);
  }
}

function assertSnapshotId(value) {
  if (typeof value !== 'string' || !/^RSI-SNAPSHOT-[A-Za-z0-9-]+$/.test(value)) {
    throw new RsiContextError('RSI_SNAPSHOT_ID_INVALID', 'RSI 快照 ID 无效');
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
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
