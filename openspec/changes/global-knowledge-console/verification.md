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
