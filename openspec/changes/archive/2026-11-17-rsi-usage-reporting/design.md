# Design

## Context

See `proposal.md` for the motivation. 当前 RSI 快照已经包含稳定的 `snapshotId`、`runId` 和每条知识的 `itemId`；Provider Adapter 已经记录注入审计，MCP Server 已经提供快照读取工具。缺口是没有一个与快照身份绑定的使用事实源，也没有把文件事实转换为统计投影的边界。

## Goals / Non-Goals

**Goals:**

- 用统一协议接收 MCP 和 Worker 结果文件两种回报。
- 让注入、读取、参考、应用和未知状态可以按运行、Worker、快照和条目追踪。
- 使用追加式 JSONL 作为权威事实，SQLite 作为可删除、可重建的统计投影。
- 让运行结束前保持未决，运行显式结算后才为未回报条目生成 `unknown`。

**Non-Goals:**

- 不读取模型隐藏思维或 Provider 内部注意力。
- 不把 Worker 的 `applied` 声明自动升级为已验证应用。
- 不拦截用户直接打开的聊天窗口；没有 MCP 或文件回传时只保留注入审计和未结算状态。
- 不改变现有知识治理、注入状态或用户维护的宿主规则文件。

## Decisions

### 1. 使用独立的 RSI 使用事实模块

新增 `RsiUsageStore`，负责事件规范化、快照条目校验、JSONL 追加、幂等键和运行结算；新增 `RsiUsageCatalog` 或等价投影边界，负责 SQLite 统计。两者由控制平面组合，不把统计逻辑塞进 MCP JSON-RPC 分发器。

备选方案是直接把计数写入 SQLite。放弃该方案，因为 SQLite 不是权威事实源，直接写计数会丢失来源、难以审计，也不能在数据库损坏后重放。

### 2. 事件身份与状态

事件使用 `runId + workerId + snapshotId + itemId + stage` 作为幂等键。`stage` 取 `injected`、`loaded`、`consulted`、`applied` 或 `unknown`；`source` 标识 `provider-adapter`、`mcp-context`、`worker-report` 或 `run-finalize`；`confidence` 区分 `observed`、`declared` 和 `inferred`。

同一条目可以在同一运行中先产生 `consulted`，再产生 `applied`，两个阶段分别计数；同一阶段重复提交只返回幂等结果。`applied` 仅保存 Worker 声明和证据引用，证据验证仍由后续验证流程负责。

### 3. MCP 使用协议

保留现有只读工具，并新增：

- `rsi_report_usage`：要求 `runId`、`workerId`、`snapshotId` 和 `usages`，只接收快照中存在的条目。
- `rsi_finalize_run`：要求 `runId`、`workerId`、`snapshotId`，校验运行身份后为已注入但没有使用阶段回报的条目追加 `unknown`。

`rsi_get_context` 在成功返回时记录 `loaded`，因此工具调用能证明客户端拿到过内容，但不能单独证明模型语义上参考过内容。MCP 工具返回值只包含处理结果，不暴露内部实现日志。

### 4. 文件回传与 MCP 共享同一入口

Worker 结果文件使用 `.product/runs/<runId>/worker-result.json`，结构与 MCP 回报相同，并包含 `complete=true` 才触发运行结算。控制平面提供导入方法和 HTTP 入口；导入后仍调用 `RsiUsageStore`，不复制另一套统计逻辑。

### 5. 文件事实与 SQLite 投影的一致性

写入顺序为：先追加并 fsync 语义可见的 JSONL 事实，再更新 SQLite 投影；投影失败不回滚事实，而是返回可重试状态。重建时扫描运行目录下的 JSONL，按幂等键重放，重新生成事件索引和按条目聚合统计。控制台只读取投影，但可显示事实文件和重建状态。

### 6. 运行身份来源

MCP 回报必须同时提供 `runId` 和 `snapshotId`，并与快照中的值严格匹配。`workerId` 由 Skill 或 MCP 启动参数提供，不能由服务端根据请求内容猜测。这样主 Worker、产品复检 Worker 和研发复检 Worker 即使共享快照，也不能互相伪造回报。

## Risks / Trade-offs

- [Worker 忘记回报] → Skill 的 MCP 使用说明要求结束前调用 `rsi_finalize_run`；未调用时保持“未结算”，不伪造 unknown。
- [Worker 虚报 applied] → 保存 `confidence=declared` 和证据引用，后续验证器确认后再用于知识效果评估。
- [SQLite 与文件暂时不一致] → 文件事实优先，记录投影错误并支持重建；统计接口返回投影状态。
- [高频 MCP 调用造成重复事件] → 使用稳定幂等键和每运行串行写入队列。
- [直接网页聊天无法调用 MCP] → 允许导入 `worker-result.json` 或人工提交结构化结果；否则只能展示未结算状态。

## Migration Plan

1. 部署代码后，已有 `.product/rsi/audit.jsonl` 不迁移、不改写；新运行开始产生 `rsi-usage.jsonl`。
2. 第一次读取统计时，如果 SQLite 投影不存在，则从现有运行事实建立空投影，后续事件增量更新。
3. 回滚代码时保留 JSONL 事实；恢复新版本后重新执行重建即可，不需要数据库迁移回滚。

