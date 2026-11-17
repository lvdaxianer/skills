# Proposal

## Why

RSI 当前可以证明某条知识已经被注入，但不能接收 Worker 对具体 `itemId` 的使用回报，因此无法区分“被注入”“被参考”和“实际应用”。直接在 Claude、Codex 或其他支持 MCP 的工具中使用 Skill 时，也缺少一个统一、可回放的结果回传边界。

## What Changes

- 新增带 `runId`、`workerId`、`snapshotId` 的 RSI 使用回报协议。
- 新增 MCP `rsi_report_usage` 和 `rsi_finalize_run` 工具，接收 Worker 对 `consulted`、`applied` 和运行结束状态的结构化回报。
- 新增项目运行目录中的 Worker 结果文件回传格式，作为没有 MCP 回传能力时的兜底通道。
- 对回报进行条目身份校验、运行身份校验、重复去重和稳定错误处理。
- 将原始使用事件追加到 `.product/runs/<runId>/rsi-usage.jsonl`，并提供可从文件事实重建的 SQLite 统计投影。
- 分开统计注入次数、参考次数、实际应用次数和未知次数；没有回报不得判定为未使用。
- 更新 MCP、RSI Adapter、控制平面和 `prodflow` 中文文档，并补充端到端测试。

## Capabilities

### New Capabilities

- `rsi-usage-reporting`: 接收、校验、持久化和统计 Worker 对 RSI 条目的使用回报。

### Modified Capabilities

无。原有 RSI 注入和控制平面要求保持不变，本变更通过新增能力补充使用回传闭环。

## Impact

- 影响 `prodflow/references/control-plane/src` 下的 MCP、RSI API、运行事实与 SQLite 投影模块。
- 增加 `.product/runs/<runId>/rsi-usage.jsonl` 和 `worker-result.json` 两类项目事实文件。
- 不新增第三方依赖，不覆盖用户维护的 `CLAUDE.md`、`AGENTS.md` 或其他宿主规则文件。
- MCP 客户端需要主动调用回报工具；没有 MCP 或文件回传能力的直接聊天仍显示为 `unknown`，不能伪造为已使用。
