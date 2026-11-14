# Task 1 验证记录

## 边界

- 实现项目注册事实、事实事件信封和 SQLite catalog 基础 schema。
- 未实现投影器、全局 CRUD、归属迁移、项目规则 API 或控制台页面。

## TDD 证据

- RED：新增基础测试时，项目注册和 SQLite 模块不存在，2 个目标场景失败；既有 38 个测试保持通过。
- GREEN：补齐注册、事实哈希、schema 初始化和删除重建后，全量测试通过 41 项。

## 能力核对

- [x] 项目注册写入共享 `registry/projects/`，同 ID 不允许绑定不同路径。
- [x] 事实事件信封包含 `schemaVersion`、`eventId`、`operationId`、来源项目、版本和 SHA-256 内容哈希。
- [x] SQLite catalog 包含项目、知识、归属历史、规则绑定、同步检查点、投影错误和已应用事件表。
- [x] SQLite 数据库可删除后重新初始化，测试不修改项目/公共事实文件。
- [x] package engines 调整为 `node >=22.5.0`，并为 SQLite 文件添加忽略和二进制属性。

## 验证命令

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (41 passed, 0 failed)
node --check 新增 Node 文件                                          PASS
git diff --check                                                       PASS
openspec validate global-knowledge-console --strict                   PASS
```

## 结论

Task 1.1/1.2 已完成。基础事实模型和 SQLite schema 可独立恢复，未提前引入双写逻辑。

# Task 2 验证记录

## 边界

- 实现项目事件、人工决定和公共 Guardrail 的文件扫描与 SQLite 幂等投影。
- 实现 checkpoint、稳定投影错误、漂移检测、临时库重建和失败保留旧投影。
- 未实现全局 CRUD、归属迁移、项目规则差异 API 或控制台交互页面。

## TDD 证据

- RED：投影器测试先于实现执行，4 个核心场景因 `knowledge-projector.mjs` 不存在而失败。
- GREEN：补齐事务投影、错误隔离、删除重建、失败保留和漂移检测后，focused tests 5 项通过。
- 回归：控制面全量测试 46 项通过。

## 能力核对

- [x] 项目和公共事实源可重复扫描，重复执行不会重复知识行或投影错误。
- [x] 单项目损坏文件写入项目级 `error` checkpoint，不阻塞其他项目和公共规则。
- [x] 每个事实源的删除旧投影、写入新投影、错误和 checkpoint 在同一 SQLite 事务中完成。
- [x] SQLite 删除后可从文件事实重建；临时重建失败时不替换现有投影。
- [x] 事件/决定内容哈希可检测源文件漂移，漂移状态为 `conflict`。
- [x] SQLite 查询边界统一映射为应用层 camelCase，源文件仍是唯一事实源。

## 可靠性审计

- `backend-reliability-guidelines`：通过。覆盖事务边界、重复同步幂等、部分失败隔离、可恢复错误和重建回退路径。
- `code-review-spec`：通过。新增方法已拆分职责，中文 JSDoc，查询写入使用参数绑定，未引入远程调用或敏感日志。
- `verification-before-completion`：通过。所有结论均由本任务新鲜命令输出支持。

## 验证命令

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (46 passed, 0 failed)
node --test product-delivery-workflow/references/control-plane/test/knowledge-projector.test.mjs  PASS (5 passed, 0 failed)
node --check 新增/修改 Node 文件                                          PASS
git diff --check                                                       PASS
openspec validate global-knowledge-console --strict                   PASS
```

## 结论

Task 2.1/2.2 per-task audit 通过，允许标记完成并提交。文件事实优先、SQLite 可重建和失败可恢复约束已落地。

# Task 3 验证记录

## 边界

- 实现全局目录领域服务和 loopback HTTP API，覆盖问题 CRUD、项目注册、同步状态和重建入口。
- 实现 `ownership_changed`、`rule_reused`、公共晋升事实，以及项目有效规则和跨项目差异计算。
- 未实现 EJS 控制台页面交互；页面将在 Task 4 接入这些 API。

## TDD 证据

- RED：领域服务测试 3 个场景因 `global-knowledge-catalog.mjs` 不存在而失败；HTTP 测试 2 个场景因全局路由不存在而失败。
- GREEN：领域服务 focused tests 3 项、HTTP loopback focused tests 2 项通过。
- 回归：控制面全量测试 51 项通过。

## 能力核对

- [x] 创建、编辑、软删除、恢复、项目注册和重建操作均先写 JSON 文件事实，再同步 SQLite。
- [x] 写操作返回 `operationId`、投影结果和同步状态；列表/规则/差异响应包含 `isComplete` 或同步护栏。
- [x] 归属移动追加 `ownership_changed`，公共复制追加 `rule_reused`，公共规则原文件不被修改。
- [x] 公共发布要求脱敏、可移植性和至少一次独立复检；失败返回稳定门禁错误。
- [x] 项目规则按 `project > hybrid > common` 选择，并返回继承、覆盖和 hybrid 关系。
- [x] HTTP 错误包含稳定 `errorCode`、安全中文消息和 `traceId`；单条资源不存在返回 404。
- [x] `apis/global-knowledge.md` 覆盖新增 route、请求、响应、错误和 curl 示例。

## 可靠性审计

- `backend-reliability-guidelines`：通过。覆盖输入校验、参数白名单、文件事实事务顺序、幂等 operationId、审计字段、稳定错误和回放历史。
- `code-review-spec`：通过。新增代码使用中文注释、参数化 SQLite 写入、loopback 边界和 120 列内格式检查。
- `rest-api-documentation`：通过。所有新增全局 route 统一记录在 `apis/global-knowledge.md`，未引入未记录 Controller。
- `verification-before-completion`：通过。最新命令输出支持 focused、full、syntax、diff 和 OpenSpec 结论。

## 验证命令

```text
node --test .../test/global-knowledge-api.test.mjs .../test/global-control-plane-api.test.mjs  PASS (5 passed, 0 failed)
npm test --prefix product-delivery-workflow/references/control-plane                         PASS (51 passed, 0 failed)
node --check 新增/修改 Node 文件                                                        PASS
awk 行长检查新增代码                                                                  PASS
git diff --check                                                                       PASS
openspec validate global-knowledge-console --strict                                     PASS
```

## 结论

Task 3.1/3.2/3.3 per-task audit 通过，允许标记完成并提交。API 已为 Task 4 EJS 控制台提供全局治理、项目规则和差异能力。

# Task 4 验证记录

## 边界

- 使用 EJS 服务端模板承载全局问题目录、筛选、创建、编辑、归属调整、软删除/恢复、公共发布和同步状态。
- 使用浏览器脚本消费全局 API，保留列表刷新期间的现有 DOM，按稳定问题 ID 复用未变化卡片，并对写操作展示 busy、错误和恢复状态。
- 新增项目有效规则和跨项目差异面板，覆盖 project、hybrid、common 关系和同步不完整提示；未引入独立 `index.html`。

## TDD 证据

- RED：新增 `global-console-ui.test.mjs` 时，EJS 区域、全局 API 调用和样式状态均不存在，3 个目标断言失败。
- GREEN：补齐 EJS 页面、浏览器脚本、响应式样式和全局目录渲染后，UI focused tests 3 项通过。
- 回归：控制面全量测试 54 项通过，包含旧知识库首页兼容断言。
- 浏览器回归曾捕获异步表单事件的 `currentTarget` 生命周期缺陷；修复为保存表单引用后，重新完成新增和编辑操作，页面可观察到最新标题与审计字段。

## 能力核对

- [x] EJS 首屏包含全局问题列表、创建表单、项目规则、跨项目差异和 SQLite 同步状态区域。
- [x] 写操作使用 `operationId` 对应的 API，保存/恢复/排除结果支持就地更新；删除/排除有明确确认，重复提交期间按钮 disabled。
- [x] 列表刷新按稳定 `itemId` 复用未变化卡片，旧列表在新请求成功前保持可见；请求序号忽略过期响应。
- [x] 错误状态、空状态、同步不完整状态、移动端单列布局和 reduced-motion 样式已覆盖。
- [x] 项目规则和差异面板使用已记录的全局 API，规则文本经过 HTML 转义，项目/公共/hybrid 来源可观察。
- [x] 服务端继续使用 EJS 模板，并在迁移期间兼容旧 `KnowledgeStore` 首屏数据。

## 可靠性审计

- `frontend-interaction-guidelines`：通过。覆盖 busy/disabled、错误恢复、显式排除确认、空状态、同步提示、稳定 ID 刷新复用、过期响应保护、响应式和 reduced-motion。
- `code-review-spec`：通过。新增/修改代码使用中文 JSDoc，Node 与 UI 脚本语法通过，新增代码行长和 diff 检查通过。
- `backend-reliability-guidelines`：通过。写操作仍按文件事实优先，API 结果补充最新问题快照，不改变 SQLite 可重建边界。
- `verification-before-completion`：通过。单元、回归、语法、格式和浏览器可观察证据均有本任务新鲜结果。

## 验证命令与浏览器证据

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (54 passed, 0 failed)
node --check .../ui/app.js                                              PASS
node --check .../src/ui-handler.mjs                                     PASS
awk 行长检查 UI/handler 新增代码                                         PASS
git diff --check                                                         PASS
```

浏览器证据：本地 `127.0.0.1:43827/` 可打开，标题为“全局知识治理控制台 · 知识归属管理”；截图可观察到全局问题目录、同步状态、筛选和新增表单，并滚动观察到“项目有效规则”和“跨项目差异”面板。随后在临时项目 `PROJECT-EVIDENCE` 中通过控制台完成新增与编辑，页面显示“浏览器验证问题-已编辑”、`active`、来源项目、操作者和原因；截图证明保存结果已回显。临时服务及数据位于 `/tmp/control-plane-ui.blXglX`，未触碰用户项目文件。

## 结论

Task 4.1/4.2 per-task audit 通过，允许标记完成并提交。EJS 控制台已与全局治理 API 对接，核心页面具备可观察的成功、空、错误和同步不完整状态。

# Task 5 验证记录

## 边界

- 添加一个临时服务端到端场景，覆盖两个项目注册、全局规则写入、列表查询、跨项目差异、公共归属迁移、项目有效规则、SQLite 删除重建和 EJS 首页结果一致性。
- 更新中文总 README、控制平面 README 和启动说明，明确 EJS 控制台能力、loopback 边界、SQLite 事实源原则、重建命令和故障排查。
- 完成 change 级最终审计准备；真实部署仍遵循总控流程，只有用户明确选择部署后才交给 `service-deployment`。

## TDD 证据

- RED：端到端测试首轮真实执行到公共归属迁移后，因测试把领域返回的 `relation=inherited` 错误写成 `common` 而失败；修正断言为公共规则继承语义。
- GREEN：端到端场景通过，随后控制面全量测试 55 项通过。

## 能力核对

- [x] 两个项目可注册并分别写入同一 `ruleKey` 的不同方案，差异接口返回两个项目结果。
- [x] 归属移动返回最新问题快照和 `operationId`，项目规则视图能观察公共规则的 `inherited` 关系。
- [x] 删除 `control-plane/catalog.sqlite` 后调用重建接口，返回 `replaced=true`、`status=synced`，列表仍保持 2 条且 `isComplete=true`。
- [x] EJS 首页响应与全局规则 API 使用同一事实投影，页面包含全局控制台、项目规则和跨项目差异区域。
- [x] 中文 README、控制平面 API 表、启动后的健康/就绪/同步核验和 SQLite 故障排查已更新。

## 可靠性审计

- `backend-reliability-guidelines`：通过。端到端覆盖文件事实写入、SQLite 删除重建、项目隔离和最终一致状态；测试只使用临时目录。
- `code-review-spec`：通过。测试辅助函数使用中文 JSDoc，新增 Node 文件语法通过，`git diff --check` 通过。
- `rest-api-documentation`：通过。README API 表与 `apis/global-knowledge.md` 的全局路由保持同步，未新增未记录路由。
- `verification-before-completion`：通过。focused、full、syntax、diff 和 OpenSpec strict 均在本任务完成前新鲜执行。

## 验证命令

```text
node --test .../test/global-knowledge-e2e.test.mjs                  PASS (1 passed, 0 failed)
npm test --prefix product-delivery-workflow/references/control-plane PASS (55 passed, 0 failed)
node --check 新增端到端测试和 control-plane Node 文件                 PASS
git diff --check                                                    PASS
openspec validate global-knowledge-console --strict                  PASS
```

## 结论

Task 5.1/5.2/5.3 per-task audit 通过，所有计划任务已完成；下一步进入最终审计、OpenSpec 归档和 `master` 集成复核。
