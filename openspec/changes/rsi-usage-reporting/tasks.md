# Tasks

## 1. 使用事实与统计投影

- [x] 1.1 新增 `RsiUsageStore`，定义使用事件、身份校验、阶段校验、证据引用上限、JSONL 追加和稳定幂等键；先为合法回报、非法快照条目、重复回报和运行结算编写失败测试，再实现并运行对应单测。
- [x] 1.2 新增可重建的 SQLite 使用统计投影，记录按 `itemId` 聚合的 injected、loaded、consulted、applied、unknown 次数和投影状态；通过删除数据库后从 JSONL 重建的测试验证文件事实优先。

## 2. MCP 与 Worker 结果回传

- [x] 2.1 扩展 RSI MCP 工具清单，新增 `rsi_report_usage` 和 `rsi_finalize_run`；先写 MCP JSON-RPC 失败测试，再实现身份校验、幂等响应和 unknown 结算。
- [x] 2.2 增加 `worker-result.json` 导入和对应 HTTP 入口，复用 `RsiUsageStore`，并用测试验证 MCP 与文件入口生成相同事实和统计。
- [x] 2.3 扩展独立 MCP 启动参数和集成测试，验证 MCP 进程能够加载项目运行事实、接收回报并保持 stdout 只有 JSON-RPC 响应。

## 3. 注入与读取事件闭环

- [ ] 3.1 让 Provider Adapter 在成功注入时记录每个选中条目的 `injected` 事件，让 `rsi_get_context` 成功返回时记录 `loaded` 事件；用已有 Adapter/MCP 测试补充阶段计数断言。
- [ ] 3.2 让快照和 MCP 返回内容带有 Worker 使用协议所需的 `runId`、`snapshotId`、`itemId` 和结算提示，并验证截断、文件、Prompt、MCP 三种入口保持身份一致。

## 4. 文档与集成验证

- [ ] 4.1 更新中文 RSI Adapter 文档、`prodflow/README.md` 和控制平面 README，说明直接聊天的 MCP/文件/人工回传边界、统计含义和 unknown 规则；运行文档命令与链接检查。
- [ ] 4.2 运行控制平面全量测试、prodflow 专项测试和 `openspec validate --all --strict`，完成计划一致性审计后记录本变更的最终验证结果。

## Workflow follow-up

- 任务通过逐项审计后，按项目提交规范提交并合并回 `master`。
- 完成最终审计后归档 `rsi-usage-reporting`，再验证 `master` 包含全部变更。
