# T2 per-task audit：Provider Adapter 与 MCP 查询

## 任务边界

- 模块：`product-delivery-workflow/references/control-plane/src/rsi-provider-adapter.mjs`
- 模块：`product-delivery-workflow/references/control-plane/src/rsi-mcp-server.mjs`
- 测试：`product-delivery-workflow/references/control-plane/test/rsi-provider-adapter.test.mjs`
- 文档：`product-delivery-workflow/SKILL.md`、`README.md`、`references/rsi-provider-adapters.md` 和控制平面 README。
- 不包含：HTTP 快照 API、反馈写回、SQLite 写入、部署和 Worker 调度时机实现。

## 执行与审查

- 执行方式：主 Worker 直接实现；T2 共享同一快照协议，未拆出会造成 Adapter 与 MCP schema 重复定义。
- RED：缺少 Adapter 模块时，focused test 以 `ERR_MODULE_NOT_FOUND` 失败。
- GREEN：文件、Prompt、fallback 和只读 stdio MCP 已实现。
- code-review-spec：新增注释使用中文，Provider 路径受白名单约束，Prompt/文件均有边界，临时文件原子替换，规则文件不会被覆盖。
- backend-reliability：无外部 HTTP/数据库写入；输入、快照 ID、层名称和 Prompt 字节预算均有服务端校验；MCP 失败返回稳定错误，不伪装成功。
- REST API 文档门禁：本任务没有新增或修改 HTTP Controller/Route，不适用。

## 验证证据

```text
node --check src/rsi-context.mjs                         PASS
node --check src/rsi-provider-adapter.mjs                PASS
node --check src/rsi-mcp-server.mjs                     PASS
node --test test/rsi-provider-adapter.test.mjs           PASS（4/4）
npm test                                                 PASS（70/70）
git diff --check                                         PASS
openspec validate rsi-context-injection --strict        PASS
```

## 结论

T2 范围内的 OpenSpec 要求与实现一致，未发现阻塞问题，审计结果：PASS。
