import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from './template-renderer.mjs';

const UI_ROOT = fileURLToPath(new URL('../ui/', import.meta.url));
const TEMPLATE_PATH = fileURLToPath(new URL('../ui/index.ejs', import.meta.url));
const SSR_PAGE_LIMIT = 20;
const UI_FILES = new Map([
  ['/assets/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/assets/styles.css', ['styles.css', 'text/css; charset=utf-8']]
]);

/**
 * 返回服务端渲染的控制平面页面或静态增强资源。
 *
 * @param {object} input 页面输入
 * @param {string} input.pathname 请求路径
 * @param {import('node:http').ServerResponse} input.response HTTP 响应
 * @param {import('./knowledge-governance.mjs').KnowledgeStore} input.store 知识库
 * @param {object} input.globalCatalog 全局知识目录
 * @returns {Promise<boolean>} 是否找到资源
 * @author lvdaxianer@yeah.net
 */
export async function serveControlPlaneUi({ pathname, response, store, globalCatalog }) {
  if (pathname === '/') {
    await serveRenderedPage(response, globalCatalog ?? store, store);
    return true;
  }
  const file = UI_FILES.get(pathname);
  if (!file) {
    return false;
  }
  await serveAsset(response, file);
  return true;
}

/**
 * 使用 EJS 风格模板渲染当前知识状态。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {object} catalog 全局知识目录或兼容的知识库
 * @param {object} fallbackCatalog 迁移期间的旧知识库
 * @returns {Promise<void>} 页面响应完成
 * @author lvdaxianer@yeah.net
 */
async function serveRenderedPage(response, catalog, fallbackCatalog) {
  const [template, firstPage, sync] = await Promise.all([
    readFile(TEMPLATE_PATH, 'utf8'),
    catalog.queryProblems
      ? catalog.queryProblems({ limit: SSR_PAGE_LIMIT, offset: 0 })
      : Promise.resolve(null),
    catalog.getSyncStatus ? catalog.getSyncStatus() : Promise.resolve({ status: 'synced' })
  ]);
  const primaryItems = firstPage?.items
    ?? (catalog.listProblems ? await catalog.listProblems() : await catalog.listKnowledge());
  const fallbackItems = fallbackCatalog && fallbackCatalog !== catalog
    ? await fallbackCatalog.listKnowledge()
    : [];
  const items = primaryItems.length > 0 || fallbackItems.length === 0
    ? primaryItems
    : fallbackItems;
  const html = renderTemplate(template, {
    pageTitle: '全局知识治理控制台 · 知识归属管理',
    initialStatus: firstPage && items === primaryItems
      ? `已加载 ${items.length} 条，共 ${firstPage.total} 条记录`
      : `已加载 ${items.length} 条记录`,
    initialSyncStatus: sync.status,
    knowledgeCards: renderKnowledgeCards(items)
  });
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
}

/**
 * 渲染首屏知识卡片，浏览器脚本再负责筛选和更新。
 *
 * @param {object[]} items 知识状态
 * @returns {string} HTML 片段
 * @author lvdaxianer@yeah.net
 */
function renderKnowledgeCards(items) {
  if (items.length === 0) {
    return '<p class="empty-state">当前没有问题；可以在上方直接新增。</p>';
  }
  return items.map((item) => `<article class="knowledge-card" data-item-id="${
    escapeAttribute(item.itemId ?? item.eventId)
  }">
    <div class="card-header"><div><span class="badge scope-badge">${escapeHtml(item.scope)}</span>
      <h3 class="knowledge-title">${escapeHtml(item.title ?? item.itemId ?? item.eventId)}</h3></div>
      <span class="badge lifecycle-badge">${escapeHtml(item.lifecycle ?? 'active')}</span></div>
    <p class="knowledge-meta">${escapeHtml(item.itemId ?? item.eventId)} · 来源 ${escapeHtml(
      item.sourceProjectId ?? '公共'
    )}</p>
  </article>`).join('');
}

/**
 * 返回静态控制台增强资源。
 *
 * @param {import('node:http').ServerResponse} response HTTP 响应
 * @param {[string, string[]]} file 静态文件描述
 * @returns {Promise<void>} 资源响应完成
 * @author lvdaxianer@yeah.net
 */
async function serveAsset(response, file) {
  const [fileName, contentType] = file;
  const content = await readFile(fileURLToPath(new URL(fileName, `file://${UI_ROOT}/`)));
  response.writeHead(200, { 'content-type': contentType });
  response.end(content);
}

/**
 * 转义首屏属性值。
 *
 * @param {unknown} value 属性值
 * @returns {string} 安全属性值
 * @author lvdaxianer@yeah.net
 */
function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

/**
 * 转义首屏文本。
 *
 * @param {unknown} value 文本
 * @returns {string} 安全文本
 * @author lvdaxianer@yeah.net
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
