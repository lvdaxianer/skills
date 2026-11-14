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
});

test('全局控制台脚本使用全局 API 并具备操作忙碌状态', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.match(app, /\/api\/global\/problems/);
  assert.match(app, /\/api\/global\/projects\/.*\/rules/);
  assert.match(app, /\/api\/global\/rules\/diff/);
  assert.match(app, /disabled/);
  assert.match(app, /confirm/);
  assert.match(app, /const formElement = event\.currentTarget/);
  assert.match(app, /formElement\.reset\(\)/);
  assert.match(app, /areProblemsEqual/);
});

test('全局控制台样式覆盖移动端、错误和同步状态', async () => {
  const styles = await readFile(stylesPath, 'utf8');
  assert.match(styles, /@media/);
  assert.match(styles, /\.error/);
  assert.match(styles, /\.sync/);
});
