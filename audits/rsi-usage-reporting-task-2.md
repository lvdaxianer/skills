# T2 任务级证据：MCP 与 Worker 结果回传

## Gate

PASS：MCP、独立 stdio 进程、Worker 结果文件和本地 HTTP 入口已经统一接入 RSI 使用事实存储。

## Evidence

- `node --test test/rsi-usage-mcp.test.mjs test/rsi-mcp-start.test.mjs test/rsi-api.test.mjs test/rsi-provider-adapter.test.mjs`：14/14 通过。
- `npm test --prefix prodflow/references/control-plane`：87/87 通过。
- `node --check`：MCP Server、MCP 启动器、RSI API 和控制平面 Server 均通过。
- `openspec validate rsi-usage-reporting --strict`：通过。
- `git diff --check`：通过。
- `apis/rsi-context.md` 已覆盖 `POST /api/rsi/runs/{runId}/worker-result` 的请求、响应、错误和 curl 示例。
- 独立 MCP 进程 stdout 仅包含 JSON-RPC 响应，使用回报和运行结算均可完成。

## Code review

### 必须修复 (CRITICAL)

- 无。

### 应该修复 (HIGH/MEDIUM)

- 无。MCP/HTTP/文件入口均校验 `runId`、`workerId`、`snapshotId` 和条目身份；重复提交按稳定事件键幂等；文件事实优先于 SQLite。

### 可优化 (LOW)

- 后续文档任务可把 Worker 回报协议补充到 `prodflow` 总 README 和 Skill 的运行指令中；本任务已完成 API 级文档覆盖。

## Backend reliability review

- API：新增路由使用稳定错误码和明确 HTTP 状态，请求体有限制且服务只监听本机。
- 幂等：MCP、HTTP 和文件导入最终调用同一 Store，重复结果不会重复计数。
- 并发：Store 对同一运行串行写入，SQLite 写入使用事务。
- 恢复：结果文件可以在控制平面恢复后重新导入；SQLite 可由 JSONL 重建。
- 兼容：旧的三个只读 MCP 工具保留，新增工具不改变既有查询响应的核心字段。

## REST API documentation review

- Controller/route 映射已更新到 `apis/rsi-context.md`。
- 请求体、路径参数、Content-Type、成功/失败状态、错误码、幂等规则和 curl 示例与实现一致。

## Result

T2.1、T2.2、T2.3 完成，允许进入注入与读取事件闭环任务。
