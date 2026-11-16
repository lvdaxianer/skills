# T3 per-task audit：控制平面 API、反馈与时机

## 任务边界

- 模块：`product-delivery-workflow/references/control-plane/src/rsi-api.mjs`
- 接入：`product-delivery-workflow/references/control-plane/src/server.mjs`
- 测试：`test/rsi-api.test.mjs`、`test/rsi-e2e.test.mjs`
- 文档：`apis/rsi-context.md`、控制平面 README、启动说明、产品交付 Skill 和 README。
- 不包含：真实外部部署、AI 厂商认证、公共知识自动晋升和 SQLite 事实写入。

## 执行与审查

- 执行方式：主 Worker 直接实现；API 与现有本地控制平面共用 KnowledgeStore、GlobalKnowledgeCatalog 和 RSI Builder，避免第二套事实源。
- RED：新增路由尚不存在时，4 个 API focused tests 均返回 404/错误路由。
- GREEN：快照准备/恢复、反馈幂等、sourceHash 冲突、无效快照错误和多项目 Provider 一致性已实现。
- code-review-spec：路由参数、请求体、预算、证据引用和错误输出均有边界；内部异常不直接返回；无新增日志或远程调用。
- backend-reliability：反馈使用 `eventId` 幂等，sourceHash 不一致返回 409 和新快照引用；反馈先确认 snapshotId，再写项目文件事实源；SQLite 仍为投影。
- REST API 文档：`apis/rsi-context.md` 覆盖 `rsi-api.mjs` 全部三条路由，包含方法、路径、headers、Cookie、body、状态码、错误码、示例和处理建议。

## 验证证据

```text
node --check src/rsi-api.mjs                         PASS
node --check src/server.mjs                          PASS
node --test test/rsi-api.test.mjs                    PASS（4/4）
node --test test/rsi-e2e.test.mjs                    PASS（1/1）
node --test                                          PASS（75/75）
openspec validate rsi-context-injection --strict     PASS
```

## 结论

T3 范围内的 OpenSpec 要求、REST 文档与实现一致，未发现阻塞问题，审计结果：PASS。
