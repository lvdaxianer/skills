import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const templatePath = new URL('../ui/index.ejs', import.meta.url);
const appPath = new URL('../ui/app.js', import.meta.url);
const stylesPath = new URL('../ui/styles.css', import.meta.url);

test('EJS 全局控制台包含问题、项目规则、差异和同步状态区域', async () => {
  const template = await readFile(templatePath, 'utf8');
  assert.match(template, /id="global-problem-list"/);
  assert.match(template, /id="project-rules-panel"/);
  assert.match(template, /id="rules-diff-panel"/);
  assert.match(template, /id="sync-status"/);
  assert.match(template, /id="create-problem-form"/);
  assert.match(template, /id="action-dialog"/);
  assert.match(template, /id="action-dialog-error"[^>]*role="alert"/);
  assert.match(template, /id="retry-button"/);
});

test('全局控制台脚本使用全局 API 并具备操作忙碌状态', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.match(app, /\/api\/global\/problems/);
  assert.match(app, /\/api\/global\/projects\/.*\/rules/);
  assert.match(app, /\/api\/global\/rules\/diff/);
  assert.match(app, /disabled/);
  assert.match(app, /const formElement = event\.currentTarget/);
  assert.match(app, /formElement\.reset\(\)/);
  assert.match(app, /areProblemsEqual/);
});

test('确认对话框替代原生弹窗且请求期间禁止关闭', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.doesNotMatch(app, /window\.(confirm|prompt|alert)/);
  assert.match(app, /openActionDialog/);
  assert.match(app, /showModal/);
  assert.match(app, /actionDialog\.__pending/);
  assert.match(app, /event\.preventDefault\(\);\s*\n\s*if \(!actionDialogForm\.reportValidity\(\)\) return;/);
  assert.match(app, /dataset\.label/);
});

test('列表刷新保留未保存修改并提供陈旧恢复路径', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.match(app, /__dirty/);
  assert.match(app, /showStaleNotice/);
  assert.match(app, /放弃修改并应用最新/);
  assert.match(app, /aria-busy/);
  assert.match(app, /listRequestId/);
});

test('加载失败提供重试且错误使用可感知语义状态', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.match(app, /retryButton\.hidden = false/);
  assert.match(app, /isError/);
  assert.match(app, /role', isError \? 'alert' : 'status'/);
  assert.match(app, /网络请求失败，请检查连接后重试/);
});

test('项目筛选输入防抖并在 Enter 时立即加载', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.match(app, /filterDebounceTimer/);
  assert.match(app, /setTimeout/);
  assert.match(app, /event\.key === 'Enter'/);
});

test('写操作成功反馈携带 operationId', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.match(app, /operationId: \$\{result\.operationId\}/);
  assert.match(app, /已保存修改/);
  assert.match(app, /已排除问题/);
  assert.match(app, /已创建问题/);
});

test('问题列表使用显式分页参数并渲染分页器', async () => {
  const template = await readFile(templatePath, 'utf8');
  const app = await readFile(appPath, 'utf8');
  assert.match(template, /id="problem-pagination"/);
  assert.match(template, /id="prev-page"/);
  assert.match(template, /id="next-page"/);
  assert.match(app, /PAGE_SIZE = 20/);
  assert.match(app, /params\.set\('limit'/);
  assert.match(app, /params\.set\('offset'/);
  assert.match(app, /updatePagination/);
  assert.match(app, /reloadFromFirstPage/);
  assert.match(app, /共 \$\{totalItems\} 条/);
});

test('全局控制台样式覆盖移动端、错误、同步状态、对话框和陈旧提示', async () => {
  const styles = await readFile(stylesPath, 'utf8');
  assert.match(styles, /@media/);
  assert.match(styles, /\.error/);
  assert.match(styles, /\.sync/);
  assert.match(styles, /\.action-dialog/);
  assert.match(styles, /::backdrop/);
  assert.match(styles, /\.stale-notice/);
  assert.match(styles, /\.pagination/);
});
