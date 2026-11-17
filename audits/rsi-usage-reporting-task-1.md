# T1 任务级证据：RSI 使用事实与统计投影

## Gate

PASS：RSI 使用回传已建立文件事实、幂等写入、运行结算和 SQLite 可重建统计投影。

## Evidence

- `node --test test/rsi-usage-store.test.mjs`：3/3 通过。
- `npm test --prefix prodflow/references/control-plane`：82/82 通过。
- `node --check src/rsi-usage-store.mjs`：通过。
- `node --check src/rsi-usage-catalog.mjs`：通过。
- `openspec validate rsi-usage-reporting --strict`：通过。
- `git diff --check`：通过。
- 使用事实追加到 `.product/runs/<runId>/rsi-usage.jsonl`，SQLite 投影删除后可通过 `rebuild()` 重建。

## Code review

### 必须修复 (CRITICAL)

- 无。

### 应该修复 (HIGH/MEDIUM)

- 无。重复回报使用稳定事件键去重；同一运行写入通过串行队列保护；运行 ID 经过安全格式校验；文件事实写入失败不会被静默吞掉。

### 可优化 (LOW)

- 后续 MCP/API 任务可补充按项目和运行维度的统计查询接口；本任务只提供条目统计和重建边界，符合任务范围。

## Backend reliability review

- 幂等：JSONL 事件键和 SQLite 主键共同防止重复计数。
- 一致性：先写文件事实，再更新投影；投影失败可通过重建恢复。
- 并发：同一 `runId` 的异步写入串行化，SQLite 批量操作在事务内完成。
- 校验：快照、Worker、条目、阶段、来源、置信度和证据引用均有边界校验。
- 恢复：数据库删除后可从运行事实重建，损坏 JSONL 不会被静默忽略。

## Result

T1.1、T1.2 完成，允许进入 MCP 与 Worker 结果回传任务。
