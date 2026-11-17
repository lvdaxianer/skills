import { createInterface } from 'node:readline';

const MCP_PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'product-delivery-workflow-rsi';
const SERVER_VERSION = '0.1.0';
const VALID_LAYERS = new Set(['global', 'project', 'current']);

const TOOLS = Object.freeze([
  {
    name: 'rsi_get_context',
    description: '读取指定 RSI 快照的全局、项目或当前事实层。',
    inputSchema: {
      type: 'object',
      required: ['snapshotId'],
      properties: {
        snapshotId: { type: 'string' },
        layer: { type: 'string', enum: ['global', 'project', 'current'] },
        workerId: { type: 'string' }
      }
    }
  },
  {
    name: 'rsi_get_evidence',
    description: '读取 RSI 条目的证据引用和来源范围。',
    inputSchema: {
      type: 'object',
      required: ['snapshotId', 'itemId'],
      properties: { snapshotId: { type: 'string' }, itemId: { type: 'string' } }
    }
  },
  {
    name: 'rsi_get_manifest',
    description: '读取 RSI 快照的来源、哈希和 Provider 无关 manifest。',
    inputSchema: {
      type: 'object',
      required: ['snapshotId'],
      properties: { snapshotId: { type: 'string' } }
    }
  },
  {
    name: 'rsi_report_usage',
    description: '回报 Worker 对 RSI 条目的参考或应用情况。',
    inputSchema: {
      type: 'object',
      required: ['runId', 'workerId', 'snapshotId', 'usages'],
      properties: {
        runId: { type: 'string' },
        workerId: { type: 'string' },
        snapshotId: { type: 'string' },
        usages: { type: 'array', items: {
          type: 'object', required: ['itemId', 'stage'],
          properties: {
            itemId: { type: 'string' },
            stage: { type: 'string', enum: ['consulted', 'applied', 'unknown'] },
            evidenceRefs: { type: 'array', items: { type: 'string' } }
          }
        } }
      }
    }
  },
  {
    name: 'rsi_finalize_run',
    description: '显式结束 Worker 运行，并将未回报的已注入条目标记为 unknown。',
    inputSchema: {
      type: 'object',
      required: ['runId', 'workerId', 'snapshotId'],
      properties: {
        runId: { type: 'string' },
        workerId: { type: 'string' },
        snapshotId: { type: 'string' }
      }
    }
  }
]);

/**
 * 表示 RSI MCP 边界错误。
 *
 * @author lvdaxianer@yeah.net
 */
export class RsiMcpError extends Error {
  /**
   * 创建带稳定错误码的 MCP 错误。
   *
   * @param {string} code 错误码
   * @param {string} message 中文错误说明
   * @author lvdaxianer@yeah.net
   */
  constructor(code, message) {
    super(message);
    this.name = 'RsiMcpError';
    this.code = code;
  }
}

/**
 * 创建只读 RSI MCP JSON-RPC Server。
 *
 * @param {object} options Server 依赖
 * @param {object} options.builder RSI 快照构建器
 * @returns {{handleMessage: Function, run: Function}} MCP Server
 * @author lvdaxianer@yeah.net
 */
export function createRsiMcpServer({ builder, usageStore, defaultWorkerId }) {
  assertBuilder(builder);
  return {
    handleMessage: (message) => handleMessage(builder, usageStore, defaultWorkerId, message),
    run: (options = {}) => runRsiMcpServer({ builder, usageStore, defaultWorkerId, ...options })
  };
}

/**
 * 启动 stdio JSON-RPC 循环，stdout 只输出协议响应。
 *
 * @param {object} options stdio 参数
 * @param {object} options.builder RSI 快照构建器
 * @param {NodeJS.ReadableStream} options.input 输入流
 * @param {NodeJS.WritableStream} options.output 输出流
 * @returns {Promise<void>} 读取结束
 * @author lvdaxianer@yeah.net
 */
export async function runRsiMcpServer({ builder, usageStore, defaultWorkerId, input = process.stdin, output = process.stdout }) {
  const server = createRsiMcpServer({ builder, usageStore, defaultWorkerId });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    const response = await parseAndHandle(server, line);
    if (response) output.write(`${JSON.stringify(response)}\n`);
  }
}

async function parseAndHandle(server, line) {
  try {
    return await server.handleMessage(JSON.parse(line));
  } catch {
    return createRpcError(null, -32700, 'MCP 请求 JSON 无效');
  }
}

async function handleMessage(builder, usageStore, defaultWorkerId, message) {
  if (!isRequest(message)) return createRpcError(null, -32600, 'MCP 请求结构无效');
  if (message.method === 'notifications/initialized') return undefined;
  if (message.method === 'initialize') return initializeResponse(message.id);
  if (message.method === 'tools/list') return toolsListResponse(message.id);
  if (message.method === 'tools/call') return callToolResponse(builder, usageStore, defaultWorkerId, message);
  return createRpcError(message.id, -32601, 'MCP 方法不存在');
}

async function callToolResponse(builder, usageStore, defaultWorkerId, message) {
  try {
    const result = await executeTool(builder, usageStore, defaultWorkerId, message.params);
    return { jsonrpc: '2.0', id: message.id, result: toolResult(result, false) };
  } catch (error) {
    const code = error.code ?? 'RSI_MCP_INTERNAL_ERROR';
    const text = JSON.stringify({ code, message: error.message ?? 'RSI MCP 查询失败' });
    return { jsonrpc: '2.0', id: message.id, result: toolResult(text, true) };
  }
}

async function executeTool(builder, usageStore, defaultWorkerId, params = {}) {
  const name = params.name;
  const args = params.arguments ?? {};
  if (name === 'rsi_get_context') return getContext(builder, usageStore, defaultWorkerId, args);
  if (name === 'rsi_get_evidence') return getEvidence(builder, args);
  if (name === 'rsi_get_manifest') return getManifest(builder, args);
  if (name === 'rsi_report_usage') return reportUsage(builder, usageStore, defaultWorkerId, args);
  if (name === 'rsi_finalize_run') return finalizeRun(builder, usageStore, defaultWorkerId, args);
  throw new RsiMcpError('RSI_TOOL_NOT_FOUND', 'RSI MCP 工具不存在');
}

async function getContext(builder, usageStore, defaultWorkerId, args) {
  const snapshot = await readSnapshot(builder, args.snapshotId);
  const layers = filterLayers(snapshot.layers, args.layer);
  const workerId = args.workerId ?? defaultWorkerId;
  await recordLoaded(usageStore, snapshot, workerId, layers);
  return {
    snapshotId: snapshot.snapshotId,
    runId: snapshot.runId,
    contentHash: snapshot.contentHash,
    layers,
    usageProtocol: createUsageProtocol(snapshot, workerId)
  };
}

async function reportUsage(builder, usageStore, defaultWorkerId, args) {
  const snapshot = await readSnapshot(builder, args.snapshotId);
  assertUsageStore(usageStore);
  assertRunMatch(snapshot, args.runId);
  const result = await usageStore.recordBatch({
    snapshot,
    workerId: args.workerId ?? defaultWorkerId,
    usages: args.usages,
    source: 'worker-report',
    confidence: 'declared'
  });
  return { ...result, runId: snapshot.runId, snapshotId: snapshot.snapshotId };
}

async function finalizeRun(builder, usageStore, defaultWorkerId, args) {
  const snapshot = await readSnapshot(builder, args.snapshotId);
  assertUsageStore(usageStore);
  assertRunMatch(snapshot, args.runId);
  return usageStore.finalize({ snapshot, workerId: args.workerId ?? defaultWorkerId });
}

async function recordLoaded(usageStore, snapshot, workerId, layers) {
  if (!workerId) return;
  assertUsageStore(usageStore);
  const usages = layers.flatMap((layer) => layer.items.map((item) => ({ itemId: item.itemId, stage: 'loaded' })));
  await usageStore.recordBatch({ snapshot, workerId, usages, source: 'mcp-context', confidence: 'observed' });
}

function createUsageProtocol(snapshot, workerId) {
  return {
    runId: snapshot.runId,
    snapshotId: snapshot.snapshotId,
    workerId: workerId ?? null,
    reportTool: 'rsi_report_usage',
    finalizeTool: 'rsi_finalize_run',
    finalizeRequired: Boolean(workerId)
  };
}

async function getEvidence(builder, args) {
  const snapshot = await readSnapshot(builder, args.snapshotId);
  assertText(args.itemId, 'itemId');
  const matches = snapshot.layers.flatMap((layer) => layer.items
    .filter((item) => item.itemId === args.itemId)
    .map((item) => ({ scope: layer.name, item })));
  if (!matches.length) throw new RsiMcpError('RSI_ITEM_NOT_FOUND', 'RSI 条目不存在');
  return { snapshotId: snapshot.snapshotId, itemId: args.itemId, matches };
}

async function getManifest(builder, args) {
  const snapshot = await readSnapshot(builder, args.snapshotId);
  return { snapshotId: snapshot.snapshotId, manifest: snapshot.manifest };
}

async function readSnapshot(builder, snapshotId) {
  assertText(snapshotId, 'snapshotId');
  return builder.read(snapshotId);
}

function filterLayers(layers, layerName) {
  if (layerName === undefined) return layers;
  if (!VALID_LAYERS.has(layerName)) throw new RsiMcpError('RSI_LAYER_INVALID', 'RSI 层无效');
  return layers.filter((layer) => layer.name === layerName);
}

function initializeResponse(id) {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
    }
  };
}

function toolsListResponse(id) {
  return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
}

function toolResult(value, isError) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return { isError, content: [{ type: 'text', text }] };
}

function createRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function isRequest(message) {
  return Boolean(message && message.jsonrpc === '2.0' && typeof message.method === 'string');
}

function assertBuilder(builder) {
  if (!builder || typeof builder.read !== 'function') {
    throw new RsiMcpError('RSI_MCP_BUILDER_INVALID', 'RSI 快照构建器不可用');
  }
}

function assertUsageStore(usageStore) {
  if (!usageStore || typeof usageStore.recordBatch !== 'function' || typeof usageStore.finalize !== 'function') {
    throw new RsiMcpError('RSI_USAGE_STORE_UNAVAILABLE', 'RSI 使用回传存储不可用');
  }
}

function assertRunMatch(snapshot, runId) {
  assertText(runId, 'runId');
  if (snapshot.runId !== runId) throw new RsiMcpError('RSI_RUN_MISMATCH', '运行 ID 与快照不匹配');
}

function assertText(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    throw new RsiMcpError('RSI_INPUT_INVALID', `${label} 无效`);
  }
}
