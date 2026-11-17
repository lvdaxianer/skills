# T3 任务级证据：注入与读取事件闭环

## Gate

PASS：Provider Adapter、MCP 默认 Worker 身份和 `rsi_get_context` 已接入同一 RSI 使用事实存储，形成注入到读取的可追踪链路。

## Evidence

- `node --test test/rsi-usage-injection.test.mjs test/rsi-runtime-integration.test.mjs`：4/4 通过。
- `npm test --prefix prodflow/references/control-plane`：88/88 通过。
- `node --check`：Provider Adapter、MCP Server、MCP 启动器、RSI API 和控制平面 Server 均通过。
- `openspec validate rsi-usage-reporting --strict`：通过。
- `git diff --check`：通过。
- Provider 文件/Prompt 注入结果的 manifest 和审计包含 `workerId`；MCP 配置携带该身份。
- `rsi_get_context` 成功返回时为每个返回条目记录 `loaded`，并返回 `usageProtocol`、`runId` 和 `snapshotId`。

## Code review

### 必须修复 (CRITICAL)

- 无。

### 应该修复 (HIGH/MEDIUM)

- 无。注入状态 `available` 的 MCP 配置不会伪造 `injected`，只有真实文件/Prompt 注入才增加注入计数；MCP 读取单独增加 `loaded`。

### 可优化 (LOW)

- 后续文档任务需把 `workerId` 的默认规则和 Skill 结束时的 MCP 结算指令写入总 README，避免直接聊天用户漏掉终结调用。

## Result

T3.1、T3.2 完成，允许进入中文文档与集成最终验证任务。
