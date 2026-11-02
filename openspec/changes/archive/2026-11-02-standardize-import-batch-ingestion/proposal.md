# Proposal

## Why

导入解析后逐条写数据库会放大连接、事务和索引开销，在大文件或并发导入时还容易造成数据库压力、重复写入和失败难以恢复。需要把解析、缓冲、批处理窗口和批量入库明确成后端可靠性规则，让导入吞吐和失败恢复可控。

## What Changes

- 在后端可靠性技能中新增导入解析到批量入库的标准流程。
- 要求解析结果先进入有界缓冲区、队列或 staging 区，不得逐条直接落库。
- 要求使用可配置的批处理窗口和批量大小阈值，窗口到期或达到阈值时批量提交，禁止用无界缓存或固定阻塞 sleep 代替调度。
- 要求每批使用明确事务边界、幂等键/去重策略、失败记录、重试和断点恢复能力。
- 在日志边界技能中补充导入批次的 traceId、batchId、数量、耗时和结果汇总要求，禁止循环逐条刷日志。

## Capabilities

### New Capabilities

无。本次只更新技能规范，不引入项目运行时能力。

### Modified Capabilities

无。本次不修改项目 OpenSpec 的运行时需求；`skip_specs: true`。

## Impact

- Affected files: `backend-reliability-guidelines/SKILL.md` and `logging-boundaries/SKILL.md`。
- No application code, API implementation, dependency, or deployment change.
- Future import, parsing, batch, queue, and database-ingestion implementations will use the new rules.
