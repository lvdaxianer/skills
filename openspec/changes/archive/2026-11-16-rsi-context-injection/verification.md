# RSI 上下文注入最终验证

## 变更范围

本 change 完成了从知识事实到工具上下文的闭环：

1. 三层 RSI 快照：global、project、current；有来源、冲突、预算、稳定哈希和原子恢复文件。
2. Provider Adapter：Claude、Codex、Kimi、Cursor 和 generic 文件/Prompt 输出；不覆盖 `CLAUDE.md` 或 `AGENTS.md`。
3. MCP：stdio JSON-RPC 的 initialize、tools/list、tools/call 和只读上下文/证据/manifest 工具。
4. 控制平面：快照准备、按 ID 恢复、反馈幂等写回、sourceHash 冲突恢复和注入时机说明。
5. 文档与证据：Provider 接入、知识目录、REST API、验证证据和任务审计均已落地。

## 完整性

| 检查项 | 结果 |
| --- | --- |
| OpenSpec tasks | 11/11 子任务完成 |
| OpenSpec artifacts | proposal、design、specs、tasks 全部存在 |
| T1 per-task audit | PASS |
| T2 per-task audit | PASS |
| T3 per-task audit | PASS |
| REST 路由文档 | 3/3 RSI 路由覆盖 |

## 正确性与证据

```text
node --check product-delivery-workflow/references/control-plane/src/rsi-context.mjs       PASS
node --check product-delivery-workflow/references/control-plane/src/rsi-provider-adapter.mjs PASS
node --check product-delivery-workflow/references/control-plane/src/rsi-mcp-server.mjs     PASS
node --check product-delivery-workflow/references/control-plane/src/rsi-api.mjs            PASS
node --check product-delivery-workflow/references/control-plane/src/server.mjs             PASS
node --test test/rsi-context.test.mjs                                                       PASS（3/3）
node --test test/rsi-provider-adapter.test.mjs                                               PASS（4/4）
node --test test/rsi-api.test.mjs                                                            PASS（4/4）
node --test test/rsi-e2e.test.mjs                                                            PASS（1/1）
npm test                                                                                     PASS（75/75）
openspec validate rsi-context-injection --strict                                             PASS
```

覆盖的关键场景：未知/待确认/排除事实不进入默认上下文；项目规则保留公共冲突来源；条目和 Markdown 字节预算截断；snapshotId 恢复；Provider 文件不覆盖用户规则；Prompt 预算；MCP 稳定失败；反馈 eventId 幂等；sourceHash 变化返回新快照；多项目共享全局且项目覆盖；三种 Provider 使用相同 snapshotId/contentHash。

## 一致性与风险结论

- 文件事实源仍是唯一来源，SQLite 没有被改成事实源。
- MCP 是只读查询边界；反馈写回必须通过显式控制平面接口。
- 所有新增 HTTP 路由仅接入本地 loopback 控制平面，没有新增外部认证面。
- 未实现真实外部部署，也没有自动调用 `service-deployment`；部署仍等待用户最后授权。
- 未发现阻塞问题。最终审计结论：PASS，具备归档条件。
