# RSI 使用回传设计

## 背景

现有 `prodflow` 能把冻结 RSI 快照注入 Claude、Codex、Kimi 等工具，并通过 `snapshotId`、`runId` 和 `itemId` 保留注入身份。但“被注入”不等于“被模型使用”，直接聊天也没有统一的结果回传入口。本设计补齐 MCP 和文件回传通道，同时保持直接聊天无法观测隐藏推理这一边界。

## 设计结论

使用 `RsiUsageStore` 作为唯一回传入口。MCP `rsi_get_context` 记录 `loaded`，Worker 结束前调用 `rsi_report_usage` 报告 `consulted/applied`，最后调用 `rsi_finalize_run` 结算未回报条目为 `unknown`。没有结算的运行不会被自动判定为未使用。

所有事实追加到 `.product/runs/<runId>/rsi-usage.jsonl`；SQLite 只保存可重建的统计投影。MCP 回报和 `worker-result.json` 文件导入使用相同的校验、去重和统计逻辑。

## 验证边界

系统可以证明条目被注入、读取、Worker 声明参考以及下游证据引用，但不能读取模型的隐藏思维。`applied` 的首次来源是 Worker 声明，后续由代码、测试、文档或决策证据验证器确认。

## 取舍

不把统计计数直接写入 SQLite，因为 SQLite 不是事实源；不把没有回报的条目立即标记为未使用，因为任务可能仍在执行；不修改用户的 `CLAUDE.md` 或 `AGENTS.md`，避免自动注入破坏宿主规则。
