# T1 任务级证据：控制平面 Provider 注入

## Gate

PASS：Provider Adapter 已由控制平面实例化并通过显式 HTTP 路由调用。

## Evidence

- `node --test test/rsi-runtime-integration.test.mjs test/rsi-provider-adapter.test.mjs test/rsi-api.test.mjs`：11/11 通过。
- `npm test`：78/78 通过。
- 文件注入只写 `.product/rsi/providers/<provider>/`，`CLAUDE.md` 和 `AGENTS.md` 原内容保持不变。
- `.product/rsi/audit.jsonl` 已验证 `injected`、`available`、`fallback`、`failed` 四种状态，并记录 projectId、runId、provider、snapshotId 和错误码。

## Review notes

- 注入入口为 `POST /api/rsi/snapshots/:snapshotId/inject/:provider`。
- `mcp` 模式只返回启动配置，不声称替第三方客户端完成注册。
- 快照解析由 Adapter 执行，失败也会进入审计链。

## Result

T1.1、T1.2、T1.3 完成，允许进入下一任务。
