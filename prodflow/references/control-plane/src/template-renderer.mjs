/**
 * 渲染有限的 EJS 风格模板表达式。
 *
 * 仅支持 `<%= key %>` 转义插值和 `<%- key %>` 安全 HTML 插值，
 * 不执行模板中的任意 JavaScript，避免控制平面模板注入。
 *
 * @param {string} template 模板文本
 * @param {Record<string, string>} data 模板数据
 * @returns {string} 渲染结果
 * @author lvdaxianer@yeah.net
 */
export function renderTemplate(template, data) {
  return template
    .replace(/<%=\s*([A-Za-z][A-Za-z0-9_]*)\s*%>/g, (_, key) => escapeHtml(data[key] ?? ''))
    .replace(/<%-\s*([A-Za-z][A-Za-z0-9_]*)\s*%>/g, (_, key) => data[key] ?? '');
}

/**
 * 转义模板中的用户可控文本。
 *
 * @param {string} value 文本
 * @returns {string} HTML 安全文本
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
