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
