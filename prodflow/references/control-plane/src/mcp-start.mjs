import { parseArgs } from 'node:util';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { GlobalKnowledgeCatalog } from './global-knowledge-catalog.mjs';
import { KnowledgeProjector } from './knowledge-projector.mjs';
import { KnowledgeStore } from './knowledge-governance.mjs';
import { ProjectRegistry } from './project-registry.mjs';
import { RsiContextBuilder } from './rsi-context.mjs';
import { runRsiMcpServer } from './rsi-mcp-server.mjs';
import { RsiUsageStore } from './rsi-usage-store.mjs';
import { SqliteCatalog } from './sqlite-catalog.mjs';

const ARGUMENT_OPTIONS = {
  projectRoot: { type: 'string' },
  sharedKnowledgeRoot: { type: 'string' },
  snapshotId: { type: 'string' },
  workerId: { type: 'string' },
  help: { type: 'boolean', short: 'h' }
};

/**
 * 启动独立 RSI MCP stdio 进程。
 *
 * stdout 由 JSON-RPC 协议独占；启动错误只写 stderr。
 *
 * @returns {Promise<void>} MCP 进程生命周期
 * @author lvdaxianer@yeah.net
 */
export async function main() {
  const options = parseArgs({ options: ARGUMENT_OPTIONS, strict: true }).values;
  if (options.help) {
    process.stderr.write('用法：npm run mcp -- --projectRoot <项目目录> --sharedKnowledgeRoot <公共知识目录>\n');
    return;
  }
  const projectRoot = requirePath(options.projectRoot, 'projectRoot');
  const sharedKnowledgeRoot = requirePath(options.sharedKnowledgeRoot, 'sharedKnowledgeRoot');
  const globalCatalog = createGlobalCatalog(sharedKnowledgeRoot);
  const knowledgeStore = new KnowledgeStore({ projectRoot, sharedKnowledgeRoot });
  const builder = new RsiContextBuilder({
    projectRoot,
    sharedKnowledgeRoot,
    globalCatalog,
    knowledgeStore
  });
  const usageStore = new RsiUsageStore({ projectRoot });
  try {
    if (options.snapshotId) await builder.read(options.snapshotId);
    await runRsiMcpServer({ builder, usageStore, defaultWorkerId: options.workerId });
  } finally {
    usageStore.close();
    globalCatalog.close();
  }
}

function createGlobalCatalog(sharedKnowledgeRoot) {
  const registry = new ProjectRegistry({ sharedRoot: sharedKnowledgeRoot });
  const catalog = new SqliteCatalog({
    dbPath: join(sharedKnowledgeRoot, 'control-plane', 'catalog.sqlite')
  });
  const projector = new KnowledgeProjector({ sharedRoot: sharedKnowledgeRoot, registry, catalog });
  return new GlobalKnowledgeCatalog({ sharedRoot: sharedKnowledgeRoot, registry, catalog, projector });
}

function requirePath(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} 不能为空`);
  }
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message ?? 'MCP 启动失败'}\n`);
    process.exitCode = 1;
  });
}
