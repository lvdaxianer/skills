import { GlobalKnowledgeCatalogError } from './global-knowledge-catalog.mjs';
import { writeJson } from './response.mjs';

const MAX_REQUEST_BYTES = 64 * 1024;
const GLOBAL_PATH_PREFIX = '/api/global';
const EDITABLE_FIELDS = [
  'title', 'rootCause', 'solution', 'severity', 'scope',
  'lifecycle', 'owningProjectId', 'ruleKey'
];

/**
 * 处理全局知识目录 HTTP API。
 *
 * @param {object} input API 依赖
 * @param {import('node:http').IncomingMessage} input.request HTTP 请求
 * @param {import('node:http').ServerResponse} input.response HTTP 响应
 * @param {string} input.pathname 请求路径
 * @param {object} input.catalog 全局知识目录
 * @returns {Promise<boolean>} 是否处理了该路由
 * @author lvdaxianer@yeah.net
 */
export async function handleGlobalKnowledgeRequest({ request, response, pathname, catalog }) {
  if (!pathname.startsWith(GLOBAL_PATH_PREFIX)) return false;
  try {
    await routeGlobalRequest({ request, response, pathname, catalog });
  } catch (error) {
    writeGlobalError(response, request, error);
  }
  return true;
}

/**
 * 分发全局问题、项目规则和同步操作。
 *
 * @param {object} input 路由输入
 * @returns {Promise<void>} 路由处理完成
 * @author lvdaxianer@yeah.net
 */
async function routeGlobalRequest({ request, response, pathname, catalog }) {
  const segments = pathname.split('/').filter(Boolean);
  if (pathname === '/api/global/problems' && request.method === 'GET') {
    return listProblems(request, response, catalog);
  }
  if (pathname === '/api/global/problems' && request.method === 'POST') {
    return createProblem(request, response, catalog);
  }
  if (pathname === '/api/global/projects' && request.method === 'POST') {
    return registerProject(request, response, catalog);
  }
  if (pathname === '/api/global/sync' && request.method === 'GET') return writeSyncStatus(response, catalog);
  if (pathname === '/api/global/sync/rebuild' && request.method === 'POST') {
    return rebuildCatalog(response, catalog);
  }
  if (pathname === '/api/global/rules/diff' && request.method === 'GET') {
    return compareProjects(request, response, catalog);
  }
  if (segments[2] === 'projects' && segments[4] === 'rules' && request.method === 'GET') {
    return projectRules(response, catalog, segments[3]);
  }
  if (segments[2] === 'problems') return routeProblemAction({ request, response, catalog, segments });
  throw new GlobalKnowledgeCatalogError('CONTROL_PLANE_ROUTE_NOT_FOUND', '全局知识路由不存在');
}

/**
 * 路由单条问题操作。
 *
 * @param {object} input 路由输入
 * @returns {Promise<void>} 路由处理完成
 * @author lvdaxianer@yeah.net
 */
async function routeProblemAction({ request, response, catalog, segments }) {
  const itemId = decodeIdentifier(segments[3]);
  if (segments.length === 4 && request.method === 'GET') {
    const items = await catalog.listProblems({ itemId });
    if (items.length === 0) {
      throw new GlobalKnowledgeCatalogError('KNOWLEDGE_NOT_FOUND', '问题不存在');
    }
    return writeJson(response, 200, items[0]);
  }
  if (segments.length === 4 && request.method === 'PATCH') {
    return updateProblem(request, response, catalog, itemId);
  }
  if (segments.length === 4 && request.method === 'DELETE') {
    return lifecycleProblem(request, response, catalog, itemId, 'excluded');
  }
  if (segments[4] === 'restore' && request.method === 'POST') {
    return lifecycleProblem(request, response, catalog, itemId, 'active');
  }
  if (segments[4] === 'exclude' && request.method === 'POST') {
    return lifecycleProblem(request, response, catalog, itemId, 'excluded');
  }
  if (segments[4] === 'move' && request.method === 'POST') {
    return moveProblem(request, response, catalog, itemId);
  }
  if (segments[4] === 'reuse' && request.method === 'POST') {
    return reuseProblem(request, response, catalog, itemId);
  }
  if (segments[4] === 'publish' && request.method === 'POST') {
    return publishProblem(request, response, catalog, itemId);
  }
  if (segments[4] === 'history' && request.method === 'GET') {
    return writeJson(response, 200, { items: await catalog.listHistory(itemId) });
  }
  throw new GlobalKnowledgeCatalogError('CONTROL_PLANE_ROUTE_NOT_FOUND', '问题操作路由不存在');
}

async function listProblems(request, response, catalog) {
  const url = new URL(request.url, 'http://127.0.0.1');
  const items = await catalog.listProblems({
    itemId: url.searchParams.get('itemId') ?? undefined,
    projectId: url.searchParams.get('projectId') ?? undefined,
    scope: url.searchParams.get('scope') ?? undefined,
    lifecycle: url.searchParams.get('lifecycle') ?? undefined,
    severity: url.searchParams.get('severity') ?? undefined
  });
  const syncStatus = await catalog.getSyncStatus();
  writeJson(response, 200, {
    items,
    syncStatus: syncStatus.status,
    checkpoint: syncStatus.checkpoint,
    isComplete: syncStatus.isComplete
  });
}

async function createProblem(request, response, catalog) {
  const body = await readJsonBody(request);
  const result = await catalog.createProblem({
    projectId: body.projectId,
    problem: body.problem ?? {},
    audit: readAudit(body)
  });
  writeJson(response, 201, result);
}

async function updateProblem(request, response, catalog, itemId) {
  const body = await readJsonBody(request);
  const result = await catalog.updateProblem(itemId, pickFields(body, EDITABLE_FIELDS), readAudit(body));
  writeJson(response, 200, result);
}

async function lifecycleProblem(request, response, catalog, itemId, lifecycle) {
  const body = await readJsonBody(request);
  writeJson(response, 200, await catalog.changeLifecycle(itemId, lifecycle, readAudit(body)));
}

async function moveProblem(request, response, catalog, itemId) {
  const body = await readJsonBody(request);
  const result = await catalog.moveOwnership(
    itemId,
    { scope: body.scope, projectId: body.projectId },
    readAudit(body)
  );
  writeJson(response, 200, result);
}

async function reuseProblem(request, response, catalog, itemId) {
  const body = await readJsonBody(request);
  const result = await catalog.reuseRule(itemId, { projectId: body.projectId }, readAudit(body));
  writeJson(response, 200, result);
}

async function publishProblem(request, response, catalog, itemId) {
  const body = await readJsonBody(request);
  const result = await catalog.publishCommon(itemId, body.review ?? body, readAudit(body));
  writeJson(response, 200, result);
}

async function registerProject(request, response, catalog) {
  writeJson(response, 201, await catalog.registerProject(await readJsonBody(request)));
}

async function projectRules(response, catalog, projectId) {
  writeJson(response, 200, await catalog.getProjectRules(decodeIdentifier(projectId)));
}

async function compareProjects(request, response, catalog) {
  const url = new URL(request.url, 'http://127.0.0.1');
  const projectIds = (url.searchParams.get('projects') ?? '').split(',').filter(Boolean);
  writeJson(response, 200, await catalog.compareProjects(projectIds));
}

async function writeSyncStatus(response, catalog) {
  writeJson(response, 200, await catalog.getSyncStatus());
}

async function rebuildCatalog(response, catalog) {
  writeJson(response, 200, await catalog.rebuild());
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw new GlobalKnowledgeCatalogError('CONTROL_PLANE_INPUT_INVALID', '请求体过大');
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new GlobalKnowledgeCatalogError('CONTROL_PLANE_INPUT_INVALID', '请求体不是有效 JSON');
  }
}

function pickFields(body, fields) {
  return fields.reduce((patch, field) => {
    if (body[field] !== undefined) patch[field] = body[field];
    return patch;
  }, {});
}

function readAudit(body) {
  return { operator: body.operator, reason: body.reason };
}

function decodeIdentifier(value) {
  try {
    return decodeURIComponent(value ?? '');
  } catch {
    throw new GlobalKnowledgeCatalogError('KNOWLEDGE_IDENTIFIER_INVALID', '标识无效');
  }
}

function writeGlobalError(response, request, error) {
  const status = getErrorStatus(error);
  const errorCode = error.code ?? 'CONTROL_PLANE_INTERNAL_ERROR';
  const traceId = request.headers['x-trace-id'] ?? `TRACE-${Date.now()}`;
  writeJson(response, status, {
    errorCode,
    message: status === 500 ? '控制平面内部错误' : error.message,
    traceId
  });
}

function getErrorStatus(error) {
  if (error.code === 'KNOWLEDGE_NOT_FOUND') return 404;
  if (error.code === 'KNOWLEDGE_PROMOTION_BLOCKED') return 422;
  if (error.code === 'CONTROL_PLANE_ROUTE_NOT_FOUND') return 404;
  if (error instanceof GlobalKnowledgeCatalogError) return 400;
  return 500;
}
