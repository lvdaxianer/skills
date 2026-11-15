const listElement = document.querySelector('#global-problem-list');
const statusElement = document.querySelector('#status-message');
const syncElement = document.querySelector('#sync-status');
const projectFilter = document.querySelector('#project-filter');
const scopeFilter = document.querySelector('#scope-filter');
const lifecycleFilter = document.querySelector('#lifecycle-filter');
const template = document.querySelector('#problem-card-template');
const refreshButton = document.querySelector('#refresh-button');
const retryButton = document.querySelector('#retry-button');
const actionDialog = document.querySelector('#action-dialog');
const actionDialogForm = document.querySelector('#action-dialog-form');
const actionDialogTitle = document.querySelector('#action-dialog-title');
const actionDialogDescription = document.querySelector('#action-dialog-description');
const actionDialogFields = document.querySelector('#action-dialog-fields');
const actionDialogError = document.querySelector('#action-dialog-error');
const actionDialogCancel = document.querySelector('#action-dialog-cancel');
const actionDialogConfirm = document.querySelector('#action-dialog-confirm');
let listRequestId = 0;
let filterDebounceTimer = 0;
let actionDialogHandler = null;
let currentPage = 1;
let totalItems = 0;
const PAGE_SIZE = 20;
const paginationElement = document.querySelector('#problem-pagination');
const prevPageButton = document.querySelector('#prev-page');
const nextPageButton = document.querySelector('#next-page');
const pageIndicator = document.querySelector('#page-indicator');

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
  retryButton.hidden = true;
  listElement.setAttribute('aria-busy', 'true');
  const params = new URLSearchParams();
  if (projectFilter.value.trim()) params.set('projectId', projectFilter.value.trim());
  if (scopeFilter.value) params.set('scope', scopeFilter.value);
  if (lifecycleFilter.value) params.set('lifecycle', lifecycleFilter.value);
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String((currentPage - 1) * PAGE_SIZE));
  prevPageButton.disabled = true;
  nextPageButton.disabled = true;
  try {
    const body = await requestJson(`/api/global/problems?${params}`);
    if (requestId !== listRequestId) return;
    if (body.items.length === 0 && body.total > 0 && currentPage > 1) {
      currentPage = Math.ceil(body.total / PAGE_SIZE);
      void loadProblems();
      return;
    }
    totalItems = typeof body.total === 'number' ? body.total : body.items.length;
    renderProblems(body.items);
    updatePagination();
    setSyncStatus(body);
    setStatus(`已加载 ${body.items.length} 条问题，共 ${totalItems} 条`);
  } catch (error) {
    if (requestId !== listRequestId) return;
    setStatus(`加载失败：${error.message}`, { isError: true });
    retryButton.hidden = false;
    updatePagination();
  } finally {
    if (requestId === listRequestId) listElement.removeAttribute('aria-busy');
  }
}

/**
 * 根据当前页码和总数刷新分页器可用状态。
 *
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  paginationElement.hidden = totalItems === 0;
  pageIndicator.textContent = `第 ${currentPage} / ${totalPages} 页`;
  prevPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
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
    let card;
    if (previous && areProblemsEqual(previous.__problem, item)) {
      card = previous;
    } else if (previous && previous.__dirty) {
      previous.__stale = item;
      showStaleNotice(previous);
      card = previous;
    } else {
      card = createProblemCard(item);
    }
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
 * 卡片存在未保存修改时跳过覆盖，改为记录最新数据并提示用户。
 *
 * @param {HTMLElement} card 问题卡片
 * @param {object} item 问题
 * @param {object} [options] 填充选项
 * @param {boolean} [options.force] 为 true 时无视未保存修改直接覆盖
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function populateProblemCard(card, item, { force = false } = {}) {
  if (card.__dirty && !force) {
    card.__stale = item;
    showStaleNotice(card);
    return;
  }
  card.__problem = item;
  delete card.__stale;
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
 * 在卡片上提示目录已更新但本地修改未保存，并提供放弃修改的恢复路径。
 *
 * @param {HTMLElement} card 问题卡片
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function showStaleNotice(card) {
  if (card.querySelector('.stale-notice')) return;
  const notice = document.createElement('p');
  notice.className = 'stale-notice';
  notice.textContent = '目录已更新；此卡片有未保存修改，未自动刷新。';
  const discard = document.createElement('button');
  discard.type = 'button';
  discard.className = 'button secondary discard-button';
  discard.textContent = '放弃修改并应用最新';
  discard.addEventListener('click', () => {
    card.__dirty = false;
    if (card.__stale) {
      populateProblemCard(card, card.__stale, { force: true });
    }
    notice.remove();
  });
  notice.appendChild(discard);
  card.insertBefore(notice, card.querySelector('.problem-form'));
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
  card.querySelector('.problem-form').addEventListener('input', () => {
    card.__dirty = true;
    card.querySelector('.stale-notice')?.remove();
  });
  card.querySelector('.problem-form').addEventListener('submit', (event) => {
    saveProblem(event, card).catch(showError);
  });
  card.querySelector('.exclude-button').addEventListener('click', () => {
    excludeProblem(card);
  });
  card.querySelector('.restore-button').addEventListener('click', () => {
    changeLifecycle(card, 'restore');
  });
  card.querySelector('.publish-button').addEventListener('click', () => {
    publishProblem(card);
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
    card.__dirty = false;
    if (result.item && problemMatchesFilters(result.item)) {
      populateProblemCard(card, result.item, { force: true });
      setStatus(`已保存修改（operationId: ${result.operationId}）`);
      return;
    }
    setStatus(`已保存修改（operationId: ${result.operationId}）`);
    await loadProblems();
  });
}

/**
 * 排除问题前要求显式确认，并在对话框内收集操作者和原因。
 *
 * @param {HTMLElement} card 问题卡片
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function excludeProblem(card) {
  openActionDialog({
    title: '排除问题',
    description: `排除「${card.querySelector('.knowledge-title').textContent}」只会把生命周期改为 excluded，原始事实和审计证据都会保留。`,
    fields: [
      { name: 'operator', label: '操作者', required: true, placeholder: '姓名或账号' },
      { name: 'reason', label: '排除原因', required: true }
    ],
    confirmLabel: '确认排除',
    danger: true,
    onConfirm: async (data) => {
      const result = await requestJson(
        `/api/global/problems/${encodeURIComponent(card.dataset.itemId)}/exclude`,
        { method: 'POST', body: data }
      );
      await afterMutation(card, result, '已排除问题');
    }
  });
}

/**
 * 恢复已排除问题，并在对话框内收集操作者和原因。
 *
 * @param {HTMLElement} card 问题卡片
 * @param {string} action 动作名称
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function changeLifecycle(card, action) {
  openActionDialog({
    title: action === 'restore' ? '恢复问题' : '生命周期操作',
    description: '恢复会把生命周期改回 active，问题重新进入当前目录。',
    fields: [
      { name: 'operator', label: '操作者', required: true, placeholder: '姓名或账号' },
      { name: 'reason', label: '恢复原因', required: true }
    ],
    confirmLabel: '确认恢复',
    onConfirm: async (data) => {
      const result = await requestJson(
        `/api/global/problems/${encodeURIComponent(card.dataset.itemId)}/${action}`,
        { method: 'POST', body: data }
      );
      await afterMutation(card, result, '已恢复问题');
    }
  });
}

/**
 * 提交公共发布复检信息，全部复检字段在同一对话框内收集。
 *
 * @param {HTMLElement} card 问题卡片
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function publishProblem(card) {
  openActionDialog({
    title: '发布公共规则',
    description: '发布后该方案会进入公共 Guardrail，需要通过脱敏、可移植和独立复检门禁。',
    fields: [
      { name: 'sanitized', label: '已完成脱敏', type: 'checkbox' },
      { name: 'portable', label: '脱离项目仍可复用', type: 'checkbox' },
      { name: 'independentReproductions', label: '独立复现次数', type: 'number', min: 0, value: 0 },
      { name: 'reviewedBy', label: '复检人', placeholder: '用逗号分隔多名复检人' },
      { name: 'operator', label: '操作者', required: true, placeholder: '姓名或账号' },
      { name: 'reason', label: '公共发布原因', required: true }
    ],
    confirmLabel: '确认发布',
    onConfirm: async (data) => {
      const result = await requestJson(
        `/api/global/problems/${encodeURIComponent(card.dataset.itemId)}/publish`,
        {
          method: 'POST',
          body: {
            review: {
              sanitized: Boolean(data.sanitized),
              portable: Boolean(data.portable),
              independentReproductions: Number(data.independentReproductions ?? 0),
              reviewedBy: String(data.reviewedBy ?? '').split(',')
                .map((value) => value.trim()).filter(Boolean)
            },
            operator: data.operator,
            reason: data.reason
          }
        }
      );
      await afterMutation(card, result, '已提交公共发布');
    }
  });
}

/**
 * 写操作成功后的统一处理：提示 operationId，尽量只更新受影响卡片。
 *
 * @param {HTMLElement} card 问题卡片
 * @param {object} result 写操作响应
 * @param {string} message 成功消息
 * @returns {Promise<void>} 后续刷新完成
 * @author lvdaxianer@yeah.net
 */
async function afterMutation(card, result, message) {
  setStatus(`${message}（operationId: ${result.operationId}）`);
  if (result.item && problemMatchesFilters(result.item)) {
    card.__dirty = false;
    populateProblemCard(card, result.item, { force: true });
    card.querySelector('.stale-notice')?.remove();
    return;
  }
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
    const result = await requestJson('/api/global/problems', {
      method: 'POST',
      body: {
        projectId: form.get('projectId'),
        problem: { title: form.get('title'), solution: form.get('solution') },
        operator: form.get('operator'), reason: form.get('reason')
      }
    });
    formElement.reset();
    setStatus(`已创建问题（operationId: ${result.operationId}）`);
  });
  await loadProblems();
}

/**
 * 打开通用动作对话框，确认按钮保持 busy 直到请求到达终态。
 *
 * @param {object} config 对话框配置
 * @param {string} config.title 标题
 * @param {string} config.description 后果说明
 * @param {object[]} [config.fields] 输入字段描述
 * @param {string} config.confirmLabel 确认按钮文案
 * @param {boolean} [config.danger] 是否破坏性动作
 * @param {Function} config.onConfirm 确认回调，接收表单数据
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function openActionDialog({ title, description, fields = [], confirmLabel, danger = false, onConfirm }) {
  actionDialogTitle.textContent = title;
  actionDialogDescription.textContent = description;
  actionDialogError.hidden = true;
  actionDialogFields.replaceChildren(...fields.map(createDialogField));
  actionDialogConfirm.dataset.label = confirmLabel;
  actionDialogConfirm.textContent = confirmLabel;
  actionDialogConfirm.className = `button ${danger ? 'danger' : 'primary'}`;
  actionDialogHandler = onConfirm;
  setDialogPending(false);
  actionDialog.showModal();
  const firstField = actionDialogFields.querySelector('input');
  (firstField ?? actionDialogConfirm).focus();
}

/**
 * 根据字段描述创建带标签的对话框输入。
 *
 * @param {object} field 字段描述
 * @returns {HTMLElement} 标签包裹的输入
 * @author lvdaxianer@yeah.net
 */
function createDialogField(field) {
  const label = document.createElement('label');
  label.textContent = field.label;
  const input = document.createElement('input');
  input.name = field.name;
  input.type = field.type ?? 'text';
  if (field.required) input.required = true;
  if (field.placeholder) input.placeholder = field.placeholder;
  if (field.min !== undefined) input.min = String(field.min);
  if (field.type === 'checkbox') input.checked = Boolean(field.value);
  else input.value = field.value ?? '';
  label.appendChild(input);
  return label;
}

/**
 * 切换对话框忙碌状态；忙碌期间禁止关闭对话框。
 *
 * @param {boolean} isPending 是否有请求进行中
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function setDialogPending(isPending) {
  actionDialog.__pending = isPending;
  actionDialogConfirm.disabled = isPending;
  actionDialogCancel.disabled = isPending;
  actionDialogConfirm.textContent = isPending
    ? '处理中…'
    : actionDialogConfirm.dataset.label;
}

actionDialogForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!actionDialogForm.reportValidity()) return;
  setDialogPending(true);
  try {
    await actionDialogHandler(new FormData(actionDialogForm));
    actionDialog.close();
  } catch (error) {
    actionDialogError.textContent = `操作失败：${error.message}。可修正后重试，或取消返回。`;
    actionDialogError.hidden = false;
  } finally {
    setDialogPending(false);
  }
});
actionDialogCancel.addEventListener('click', () => {
  if (!actionDialog.__pending) actionDialog.close();
});
actionDialog.addEventListener('cancel', (event) => {
  if (actionDialog.__pending) event.preventDefault();
});
actionDialog.addEventListener('click', (event) => {
  if (event.target === actionDialog && !actionDialog.__pending) actionDialog.close();
});

/**
 * 加载一个项目的有效规则。
 *
 * @returns {Promise<void>} 加载完成
 * @author lvdaxianer@yeah.net
 */
async function loadProjectRules() {
  const projectId = document.querySelector('#project-rules-select').value.trim();
  if (!projectId) return setPanelStatus('rules-status', '请先填写项目 ID。', true);
  const button = document.querySelector('#load-rules-button');
  await runBusy(button, async () => {
    setPanelStatus('rules-status', '正在加载规则…');
    try {
      const body = await requestJson(`/api/global/projects/${encodeURIComponent(projectId)}/rules`);
      renderRules(body.items, document.querySelector('#project-rules-list'));
      setPanelStatus('rules-status', `同步状态：${body.syncStatus.status}`);
    } catch (error) {
      setPanelStatus('rules-status', `加载失败：${error.message}`, true);
    }
  });
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
  const button = document.querySelector('#compare-rules-button');
  await runBusy(button, async () => {
    setPanelStatus('diff-status', '正在比较…');
    try {
      const body = await requestJson(`/api/global/rules/diff?projects=${encodeURIComponent(`${first},${second}`)}`);
      renderDifferences(body.differences);
      setPanelStatus('diff-status', `找到 ${body.differences.length} 个差异`);
    } catch (error) {
      setPanelStatus('diff-status', `比较失败：${error.message}`, true);
    }
  });
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
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new Error('网络请求失败，请检查连接后重试');
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(body?.message ?? body?.errorCode ?? `请求失败（HTTP ${response.status}），请重试`);
  }
  return body ?? {};
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
 * 更新全局操作状态，错误状态用视觉和语义方式区分。
 *
 * @param {string} message 状态消息
 * @param {object} [options] 状态选项
 * @param {boolean} [options.isError] 是否为错误状态
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function setStatus(message, { isError = false } = {}) {
  statusElement.textContent = message;
  statusElement.classList.toggle('error', isError);
  statusElement.setAttribute('role', isError ? 'alert' : 'status');
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
  setStatus(`操作失败：${error.message}`, { isError: true });
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

/**
 * 项目筛选输入防抖触发，Enter 立即触发。
 *
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function scheduleFilterLoad() {
  clearTimeout(filterDebounceTimer);
  filterDebounceTimer = setTimeout(() => {
    currentPage = 1;
    loadProblems().catch(showError);
  }, 350);
}

/**
 * 回到第一页并重新加载列表。
 *
 * @returns {void}
 * @author lvdaxianer@yeah.net
 */
function reloadFromFirstPage() {
  currentPage = 1;
  loadProblems().catch(showError);
}

document.querySelector('#create-problem-form').addEventListener(
  'submit',
  (event) => createProblem(event).catch(showError)
);
refreshButton.addEventListener('click', () => refreshProblems().catch(showError));
retryButton.addEventListener('click', () => loadProblems().catch(showError));
projectFilter.addEventListener('input', scheduleFilterLoad);
projectFilter.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    clearTimeout(filterDebounceTimer);
    reloadFromFirstPage();
  }
});
scopeFilter.addEventListener('change', reloadFromFirstPage);
lifecycleFilter.addEventListener('change', reloadFromFirstPage);
prevPageButton.addEventListener('click', () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  loadProblems().catch(showError);
});
nextPageButton.addEventListener('click', () => {
  if (currentPage >= Math.max(1, Math.ceil(totalItems / PAGE_SIZE))) return;
  currentPage += 1;
  loadProblems().catch(showError);
});
document.querySelector('#load-rules-button').addEventListener('click', () => loadProjectRules().catch(showError));
document.querySelector('#compare-rules-button').addEventListener('click', () => compareRules().catch(showError));
loadProblems().catch(showError);
