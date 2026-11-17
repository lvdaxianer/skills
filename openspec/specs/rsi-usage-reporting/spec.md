# RSI 使用回传

## Purpose

为直接使用 Claude、Codex、Kimi 等 AI 工具的任务提供可回放的 RSI 使用回传能力，使系统能够按 `itemId` 区分注入、参考、实际应用和未知状态，并在没有回报时避免错误地判定知识未被使用。

## Requirements

### Requirement: Worker 使用回报必须绑定运行身份

系统 MUST 接收包含 `runId`、`workerId`、`snapshotId` 和使用条目的 Worker 回报，并拒绝缺少身份或身份不匹配的回报。

#### Scenario: 接收合法使用回报
- **WHEN** Worker 回报的运行、Worker 和快照身份与已落盘快照一致
- **THEN** 系统 MUST 接收回报并保留每个条目的 `itemId`、使用阶段、置信度和证据引用

#### Scenario: 拒绝跨运行回报
- **WHEN** 回报引用不存在或不属于当前运行的 `snapshotId`、`runId` 或 `itemId`
- **THEN** 系统 MUST 返回稳定错误码，不得写入有效使用事件

### Requirement: 系统必须区分 RSI 使用阶段

系统 MUST 将条目状态区分为 `injected`、`loaded`、`consulted`、`applied` 和 `unknown`，并禁止把没有回报的条目直接视为未使用。

#### Scenario: 没有 Worker 回报
- **WHEN** 条目已注入但当前运行没有收到该条目的使用声明或证据
- **THEN** 系统 MUST 将其保持为 `unknown`，不得增加参考或应用次数

#### Scenario: Worker 声明实际应用
- **WHEN** Worker 回报条目为 `applied` 并提供代码、测试、文档或决策证据引用
- **THEN** 系统 MUST 保存该应用声明，并将其交给证据校验流程

### Requirement: 使用回报必须幂等且可重放

系统 MUST 以运行、Worker、条目和阶段组成的稳定身份去重使用事件，并将原始事件追加到项目运行事实文件，使统计结果可以从文件事实重建。

#### Scenario: 重复提交同一回报
- **WHEN** 同一 `runId`、`workerId`、`itemId` 和阶段的回报被提交多次
- **THEN** 系统 MUST 只保留一条有效计数，并返回幂等结果

#### Scenario: 重建统计投影
- **WHEN** SQLite 统计投影缺失或损坏
- **THEN** 系统 MUST 能根据 `.product/runs/<runId>/rsi-usage.jsonl` 重建注入、参考、应用和未知统计

### Requirement: 运行结束必须显式结算未知条目

系统 MUST 提供运行结束回报；只有运行被显式结算后，已注入但没有参考或应用回报的条目才可以落为 `unknown`。

#### Scenario: 结算存在未回报条目的运行
- **WHEN** Worker 结束运行并提交合法的终结回报，且某些已注入条目没有其他使用事件
- **THEN** 系统 MUST 为这些条目追加 `unknown` 事实，并保留运行终结状态

#### Scenario: 未终结的运行不提前判定
- **WHEN** Worker 尚未提交运行终结回报
- **THEN** 系统 MUST 不把缺少回报的条目计入 `unknown`，并将运行标记为未结算

### Requirement: MCP 和文件回传必须提供相同语义

系统 MUST 同时支持 MCP 工具和 Worker 结果文件回传，两种入口必须使用相同的身份校验、去重规则、事实格式和统计语义。

#### Scenario: 通过 MCP 回传
- **WHEN** 已连接 MCP 的 Worker 调用 RSI 使用回报工具
- **THEN** 系统 MUST 返回成功或稳定错误，并追加对应运行事实

#### Scenario: 通过结果文件回传
- **WHEN** Worker 在运行目录写入合法的 `worker-result.json`
- **THEN** 系统 MUST 解析其中的 `rsiUsage`，并按 MCP 回传的相同规则处理

### Requirement: 统计必须分离曝光和有效使用

系统 MUST 分别提供注入次数、加载次数、参考次数、应用次数和未知次数，不得用注入次数替代使用次数。

#### Scenario: 汇总单条知识的运行记录
- **WHEN** 一条知识在多个运行中分别被注入、参考和应用
- **THEN** 统计结果 MUST 能分别返回各阶段去重后的运行次数

#### Scenario: 应用声明等待证据确认
- **WHEN** Worker 声明 `applied` 但证据校验尚未完成
- **THEN** 系统 MUST 保留声明和待校验状态，不得伪造为已验证应用
