const listElement = document.querySelector('#knowledge-list');
const statusElement = document.querySelector('#status-message');
const scopeFilter = document.querySelector('#scope-filter');
const lifecycleFilter = document.querySelector('#lifecycle-filter');
const template = document.querySelector('#knowledge-card-template');

const SCOPE_LABELS = {
  unknown: '待判断',
  project: '项目',
  common: '公共候选',
  hybrid: '混合'
};

/**
 * 加载当前筛选下的知识列表。
 *
 * @returns {Promise<void>} 加载完成
 * @author lvdaxianer@yeah.net
 */
async function loadKnowledge() {
  setStatus('正在加载…');
  const params = new URLSearchParams();
  if (scopeFilter.value) params.set('scope', scopeFilter.value);
  if (lifecycleFilter.value) params.set('lifecycle', lifecycleFilter.value);
  const response = await fetch(`/api/knowledge?${params}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? '加载失败');
  renderKnowledge(body.items);
  setStatus(`已加载 ${body.items.length} 条记录`);
}

/**
 * 渲染知识卡片和可操作字段。
 *
 * @param {Array<object>} items 知识状态
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function renderKnowledge(items) {
  listElement.replaceChildren();
  items.forEach((item) => listElement.appendChild(createCard(item)));
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '当前筛选没有知识记录。';
    listElement.appendChild(empty);
  }
}

/**
 * 创建一张可编辑知识卡片。
 *
 * @param {object} item 知识状态
 * @returns {HTMLElement} 卡片
 * @author lvdaxianer@yeah.net
 */
function createCard(item) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.eventId = item.eventId;
  card.querySelector('.scope-badge').textContent = SCOPE_LABELS[item.scope] ?? item.scope;
  card.querySelector('.lifecycle-badge').textContent = item.lifecycle ?? 'active';
  card.querySelector('.knowledge-title').textContent = item.title ?? item.eventId;
  card.querySelector('.knowledge-description').textContent = item.description ?? '暂无描述';
  card.querySelector('[name="scope"]').value = item.scope ?? 'unknown';
  card.querySelector('[name="severity"]').value = item.severity ?? 'medium';
  card.querySelector('[name="solution"]').value = item.solution ?? '';
  const publishButton = card.querySelector('.publish-button');
  publishButton.hidden = item.scope !== 'common' || item.lifecycle === 'excluded';
  card.querySelector('.knowledge-form')
    .addEventListener('submit', (event) => saveKnowledge(event, card).catch(showError));
  card.querySelector('.exclude-button')
    .addEventListener('click', () => excludeKnowledge(card).catch(showError));
  publishButton.addEventListener('click', () => publishKnowledge(card).catch(showError));
  return card;
}

/**
 * 保存人工编辑结果。
 *
 * @param {SubmitEvent} event 表单事件
 * @param {HTMLElement} card 知识卡片
 * @returns {Promise<void>} 保存完成
 * @author lvdaxianer@yeah.net
 */
async function saveKnowledge(event, card) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await sendDecision(card.dataset.eventId, {
    scope: form.get('scope'),
    severity: form.get('severity'),
    solution: form.get('solution'),
    operator: form.get('operator'),
    reason: form.get('reason')
  });
}

/**
 * 将知识标记为排除并保留原始证据。
 *
 * @param {HTMLElement} card 知识卡片
 * @returns {Promise<void>} 排除完成
 * @author lvdaxianer@yeah.net
 */
async function excludeKnowledge(card) {
  const operator = window.prompt('请输入操作者');
  const reason = window.prompt('请输入排除原因');
  if (!operator || !reason) return;
  await sendRequest(`/api/knowledge/${encodeURIComponent(card.dataset.eventId)}/exclude`, {
    method: 'POST',
    body: { operator, reason }
  });
  await loadKnowledge();
}

/**
 * 收集人工公共复检信息并发布 Guardrail。
 *
 * @param {HTMLElement} card 知识卡片
 * @returns {Promise<void>} 发布完成
 * @author lvdaxianer@yeah.net
 */
async function publishKnowledge(card) {
  const operator = window.prompt('请输入操作者');
  const reason = window.prompt('请输入公共发布原因');
  const reviewers = window.prompt('请输入两名以上独立复检人，用逗号分隔');
  const reproductions = Number(window.prompt('请输入独立复现次数') ?? 0);
  if (!operator || !reason || !reviewers || reproductions < 2) {
    throw new Error('公共发布需要操作者、原因、两名复检人和至少两次复现');
  }
  await sendRequest(`/api/knowledge/${encodeURIComponent(card.dataset.eventId)}/publish`, {
    method: 'POST',
    body: {
      operator,
      reason,
      sanitized: window.confirm('确认已完成脱敏？'),
      portable: window.confirm('确认脱离项目仍可复用？'),
      independentReproductions: reproductions,
      reviewedBy: reviewers.split(',').map((item) => item.trim()).filter(Boolean)
    }
  });
  await loadKnowledge();
}

/**
 * 发送人工编辑请求。
 *
 * @param {string} eventId 事件 ID
 * @param {object} body 编辑内容
 * @returns {Promise<void>} 保存完成
 * @author lvdaxianer@yeah.net
 */
async function sendDecision(eventId, body) {
  await sendRequest(`/api/knowledge/${encodeURIComponent(eventId)}`, { method: 'PATCH', body });
  await loadKnowledge();
}

/**
 * 发送 JSON API 请求并统一处理错误。
 *
 * @param {string} path API 路径
 * @param {object} options 请求配置
 * @returns {Promise<object>} API 响应
 * @author lvdaxianer@yeah.net
 */
async function sendRequest(path, options) {
  const response = await fetch(path, {
    method: options.method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(options.body)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? '操作失败');
  return body;
}

/**
 * 更新页面状态提示。
 *
 * @param {string} message 状态文本
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function setStatus(message) {
  statusElement.textContent = message;
}

document.querySelector('#refresh-button').addEventListener('click', () => loadKnowledge().catch(showError));
scopeFilter.addEventListener('change', () => loadKnowledge().catch(showError));
lifecycleFilter.addEventListener('change', () => loadKnowledge().catch(showError));
loadKnowledge().catch(showError);

/**
 * 显示可理解的操作错误。
 *
 * @param {Error} error 操作错误
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function showError(error) {
  setStatus(`操作失败：${error.message}`);
}
