const listElement = document.querySelector('#global-problem-list');
const statusElement = document.querySelector('#status-message');
const syncElement = document.querySelector('#sync-status');
const projectFilter = document.querySelector('#project-filter');
const scopeFilter = document.querySelector('#scope-filter');
const lifecycleFilter = document.querySelector('#lifecycle-filter');
const template = document.querySelector('#problem-card-template');
const refreshButton = document.querySelector('#refresh-button');
let listRequestId = 0;

const SCOPE_LABELS = {
  unknown: '待判断', project: '项目', common: '公共', hybrid: 'Hybrid'
};

/**
 * 加载全局问题列表，保留旧列表直到新结果成功返回。
 *
 * @returns {Promise<void>} 加载完成
 * @author lvdaxianer@yeah.net
 */
async function loadProblems() {
  const requestId = ++listRequestId;
  setStatus('正在同步目录…');
  const params = new URLSearchParams();
  if (projectFilter.value.trim()) params.set('projectId', projectFilter.value.trim());
  if (scopeFilter.value) params.set('scope', scopeFilter.value);
  if (lifecycleFilter.value) params.set('lifecycle', lifecycleFilter.value);
  const body = await requestJson(`/api/global/problems?${params}`);
  if (requestId !== listRequestId) return;
  renderProblems(body.items);
  setSyncStatus(body);
  setStatus(`已加载 ${body.items.length} 条问题`);
}

/**
 * 渲染问题列表。
 *
 * @param {object[]} items 问题集合
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function renderProblems(items) {
  if (items.length === 0) {
    listElement.replaceChildren();
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '当前筛选没有问题；可以在上方直接新增。';
    listElement.appendChild(empty);
    return;
  }
  const existing = new Map([...listElement.children]
    .filter((card) => card.dataset.itemId)
    .map((card) => [card.dataset.itemId, card]));
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const previous = existing.get(item.itemId);
    const card = previous && areProblemsEqual(previous.__problem, item)
      ? previous
      : createProblemCard(item);
    fragment.appendChild(card);
  });
  listElement.replaceChildren(fragment);
}

/**
 * 创建问题编辑卡片和动作绑定。
 *
 * @param {object} item 问题
 * @returns {HTMLElement} 卡片
 * @author lvdaxianer@yeah.net
 */
function createProblemCard(item) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.itemId = item.itemId;
  populateProblemCard(card, item);
  bindCardActions(card);
  return card;
}

/**
 * 将问题数据填充到已有卡片，保留卡片节点和用户当前上下文。
 *
 * @param {HTMLElement} card 问题卡片
 * @param {object} item 问题
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function populateProblemCard(card, item) {
  card.__problem = item;
  card.querySelector('.scope-badge').textContent = SCOPE_LABELS[item.scope] ?? item.scope;
  card.querySelector('.lifecycle-badge').textContent = item.lifecycle ?? 'active';
  card.querySelector('.knowledge-title').textContent = item.title ?? item.itemId;
  card.querySelector('.knowledge-meta').textContent = `${item.itemId} · 来源 ${item.sourceProjectId ?? '公共'}`;
  card.querySelector('[name="title"]').value = item.title ?? '';
  card.querySelector('[name="scope"]').value = item.scope ?? 'unknown';
  card.querySelector('[name="owningProjectId"]').value = item.owningProjectId ?? '';
  card.querySelector('[name="severity"]').value = item.severity ?? 'medium';
  card.querySelector('[name="solution"]').value = item.solution ?? '';
}

/**
 * 判断问题是否真正发生变化，避免刷新时重建无变化卡片。
 *
 * @param {object|undefined} previous 旧问题
 * @param {object} current 新问题
 * @returns {boolean} 是否相同
 * @author lvdaxianer@yeah.net
 */
function areProblemsEqual(previous, current) {
  return Boolean(previous) && JSON.stringify(previous) === JSON.stringify(current);
}

/**
 * 绑定问题卡片上的保存、排除、恢复和发布动作。
 *
 * @param {HTMLElement} card 问题卡片
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function bindCardActions(card) {
  card.querySelector('.problem-form').addEventListener('submit', (event) => {
    saveProblem(event, card).catch(showError);
  });
  card.querySelector('.exclude-button').addEventListener('click', () => {
    excludeProblem(card).catch(showError);
  });
  card.querySelector('.restore-button').addEventListener('click', () => {
    changeLifecycle(card, 'restore').catch(showError);
  });
  card.querySelector('.publish-button').addEventListener('click', () => {
    publishProblem(card).catch(showError);
  });
}

/**
 * 保存问题编辑，成功后只刷新列表结构。
 *
 * @param {SubmitEvent} event 表单事件
 * @param {HTMLElement} card 问题卡片
 * @returns {Promise<void>} 保存完成
 * @author lvdaxianer@yeah.net
 */
async function saveProblem(event, card) {
  event.preventDefault();
  const button = event.submitter;
  await runBusy(button, async () => {
    const form = new FormData(event.currentTarget);
    const result = await requestJson(`/api/global/problems/${encodeURIComponent(card.dataset.itemId)}`, {
      method: 'PATCH',
      body: {
        title: form.get('title'), scope: form.get('scope'),
        owningProjectId: form.get('owningProjectId') || null,
        severity: form.get('severity'), solution: form.get('solution'),
        operator: form.get('operator'), reason: form.get('reason')
      }
    });
    if (result.item && problemMatchesFilters(result.item)) {
      populateProblemCard(card, result.item);
      return;
    }
    await loadProblems();
  });
}

/**
 * 排除问题前要求显式确认。
 *
 * @param {HTMLElement} card 问题卡片
 * @returns {Promise<void>} 排除完成
 * @author lvdaxianer@yeah.net
 */
async function excludeProblem(card) {
  if (!window.confirm('排除只改变生命周期并保留证据，确认继续吗？')) return;
  const operator = window.prompt('请输入操作者');
  const reason = window.prompt('请输入排除原因');
  if (!operator || !reason) return;
  const result = await runBusy(card.querySelector('.exclude-button'), () => requestJson(
    `/api/global/problems/${encodeURIComponent(card.dataset.itemId)}/exclude`,
    { method: 'POST', body: { operator, reason } }
  ));
  if (result.item && problemMatchesFilters(result.item)) {
    populateProblemCard(card, result.item);
    return;
  }
  await loadProblems();
}

/**
 * 恢复已排除问题。
 *
 * @param {HTMLElement} card 问题卡片
 * @param {string} action 动作名称
 * @returns {Promise<void>} 恢复完成
 * @author lvdaxianer@yeah.net
 */
async function changeLifecycle(card, action) {
  const operator = window.prompt('请输入操作者');
  const reason = window.prompt('请输入恢复原因');
  if (!operator || !reason) return;
  const result = await runBusy(card.querySelector('.restore-button'), () => requestJson(
    `/api/global/problems/${encodeURIComponent(card.dataset.itemId)}/${action}`,
    { method: 'POST', body: { operator, reason } }
  ));
  if (result.item && problemMatchesFilters(result.item)) {
    populateProblemCard(card, result.item);
    return;
  }
  await loadProblems();
}

/**
 * 提交公共发布复检信息。
 *
 * @param {HTMLElement} card 问题卡片
 * @returns {Promise<void>} 发布完成
 * @author lvdaxianer@yeah.net
 */
async function publishProblem(card) {
  const operator = window.prompt('请输入操作者');
  const reason = window.prompt('请输入公共发布原因');
  if (!operator || !reason) return;
  const review = {
    sanitized: window.confirm('确认已完成脱敏？'),
    portable: window.confirm('确认脱离项目仍可复用？'),
    independentReproductions: Number(window.prompt('请输入独立复现次数') ?? 0),
    reviewedBy: window.prompt('请输入复检人，用逗号分隔')?.split(',')
      .map((value) => value.trim()).filter(Boolean)
  };
  await runBusy(card.querySelector('.publish-button'), () => requestJson(
    `/api/global/problems/${encodeURIComponent(card.dataset.itemId)}/publish`,
    { method: 'POST', body: { review, operator, reason } }
  ));
  await loadProblems();
}

/**
 * 创建问题。
 *
 * @param {SubmitEvent} event 表单事件
 * @returns {Promise<void>} 创建完成
 * @author lvdaxianer@yeah.net
 */
async function createProblem(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  await runBusy(event.submitter, async () => {
    await requestJson('/api/global/problems', {
      method: 'POST',
      body: {
        projectId: form.get('projectId'),
        problem: { title: form.get('title'), solution: form.get('solution') },
        operator: form.get('operator'), reason: form.get('reason')
      }
    });
    formElement.reset();
  });
  await loadProblems();
}

/**
 * 加载一个项目的有效规则。
 *
 * @returns {Promise<void>} 加载完成
 * @author lvdaxianer@yeah.net
 */
async function loadProjectRules() {
  const projectId = document.querySelector('#project-rules-select').value.trim();
  if (!projectId) return setPanelStatus('rules-status', '请先填写项目 ID。', true);
  setPanelStatus('rules-status', '正在加载规则…');
  const body = await requestJson(`/api/global/projects/${encodeURIComponent(projectId)}/rules`);
  renderRules(body.items, document.querySelector('#project-rules-list'));
  setPanelStatus('rules-status', `同步状态：${body.syncStatus.status}`);
}

/**
 * 加载两个项目的规则差异。
 *
 * @returns {Promise<void>} 加载完成
 * @author lvdaxianer@yeah.net
 */
async function compareRules() {
  const first = document.querySelector('#diff-project-a').value.trim();
  const second = document.querySelector('#diff-project-b').value.trim();
  if (!first || !second) return setPanelStatus('diff-status', '请填写两个项目 ID。', true);
  setPanelStatus('diff-status', '正在比较…');
  const body = await requestJson(`/api/global/rules/diff?projects=${encodeURIComponent(`${first},${second}`)}`);
  renderDifferences(body.differences);
  setPanelStatus('diff-status', `找到 ${body.differences.length} 个差异`);
}

/**
 * 渲染有效规则。
 *
 * @param {object[]} items 规则
 * @param {HTMLElement} target 容器
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function renderRules(items, target) {
  target.replaceChildren();
  items.forEach((item) => {
    const element = document.createElement('article');
    element.className = 'rule-item';
    element.innerHTML = [
      `<strong>${escapeHtml(item.title ?? item.ruleKey)}</strong>`,
      `<span>${escapeHtml(item.relation)}</span>`,
      `<p>${escapeHtml(item.solution ?? '暂无方案')}</p>`
    ].join('');
    target.appendChild(element);
  });
  if (items.length === 0) target.textContent = '当前项目没有有效规则。';
}

/**
 * 渲染跨项目差异。
 *
 * @param {object[]} differences 差异
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function renderDifferences(differences) {
  const target = document.querySelector('#rules-diff-list');
  target.replaceChildren();
  differences.forEach((difference) => {
    const item = document.createElement('article');
    item.className = 'rule-item diff-item';
    const projects = difference.projects.map((project) => (
      `<p>${escapeHtml(project.projectId)}：${escapeHtml(project.item?.solution ?? '缺失')}</p>`
    )).join('');
    item.innerHTML = `<strong>${escapeHtml(difference.ruleKey)}</strong>${projects}`;
    target.appendChild(item);
  });
  if (differences.length === 0) target.textContent = '两个项目没有可见差异。';
}

/**
 * 发送 JSON 请求并返回稳定错误。
 *
 * @param {string} path 请求路径
 * @param {object} options 请求配置
 * @returns {Promise<object>} JSON 响应
 * @author lvdaxianer@yeah.net
 */
async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? body.errorCode ?? '操作失败，请重试');
  return body;
}

/**
 * 执行带 busy 状态的操作，防止重复提交。
 *
 * @param {HTMLButtonElement} button 操作按钮
 * @param {Function} action 异步操作
 * @returns {Promise<unknown>} 操作完成结果
 * @author lvdaxianer@yeah.net
 */
async function runBusy(button, action) {
  const original = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = '处理中…';
  }
  try {
    return await action();
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = original;
    }
  }
}

/**
 * 更新同步状态徽标。
 *
 * @param {object} body 全局问题列表响应
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function setSyncStatus(body) {
  const status = body.syncStatus?.status ?? body.syncStatus ?? 'unknown';
  syncElement.textContent = body.isComplete === false ? `${status} · 结果可能滞后` : status;
  syncElement.className = `badge sync ${status}`;
}

/**
 * 更新侧栏区域状态，并保留错误可见性。
 *
 * @param {string} id 状态元素 ID
 * @param {string} message 状态消息
 * @param {boolean} isError 是否为错误
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function setPanelStatus(id, message, isError = false) {
  const element = document.querySelector(`#${id}`);
  element.textContent = message;
  element.classList.toggle('error', isError);
}

/**
 * 更新全局操作状态。
 *
 * @param {string} message 状态消息
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function setStatus(message) {
  statusElement.textContent = message;
}

/**
 * 转义规则展示文本。
 *
 * @param {unknown} value 原始文本
 * @returns {string} 安全文本
 * @author lvdaxianer@yeah.net
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/**
 * 展示操作错误并保留当前页面数据。
 *
 * @param {Error} error 操作错误
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function showError(error) {
  setStatus(`操作失败：${error.message}`);
}

/**
 * 判断问题是否仍然满足当前筛选条件。
 *
 * @param {object} item 问题
 * @returns {boolean} 是否保留在当前列表
 * @author lvdaxianer@yeah.net
 */
function problemMatchesFilters(item) {
  const projectId = projectFilter.value.trim();
  return (!projectId || item.owningProjectId === projectId || item.sourceProjectId === projectId)
    && (!scopeFilter.value || item.scope === scopeFilter.value)
    && (!lifecycleFilter.value || item.lifecycle === lifecycleFilter.value);
}

/**
 * 刷新全局问题目录并锁定刷新按钮。
 *
 * @returns {Promise<void>} 刷新完成
 * @author lvdaxianer@yeah.net
 */
async function refreshProblems() {
  await runBusy(refreshButton, loadProblems);
}

document.querySelector('#create-problem-form').addEventListener(
  'submit',
  (event) => createProblem(event).catch(showError)
);
refreshButton.addEventListener('click', () => refreshProblems().catch(showError));
projectFilter.addEventListener('change', () => loadProblems().catch(showError));
scopeFilter.addEventListener('change', () => loadProblems().catch(showError));
lifecycleFilter.addEventListener('change', () => loadProblems().catch(showError));
document.querySelector('#load-rules-button').addEventListener('click', () => loadProjectRules().catch(showError));
document.querySelector('#compare-rules-button').addEventListener('click', () => compareRules().catch(showError));
loadProblems().catch(showError);
