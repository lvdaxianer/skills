# Tasks

## 1. 后端导入批处理规范

- [x] 1.1 在 `backend-reliability-guidelines/SKILL.md` 增加导入解析、有限批处理窗口、batch size 触发、批次事务、幂等、背压、失败恢复和断点续传规则；通过定向文本检查确认禁止逐条直写、无界缓存和固定阻塞 sleep。

## 2. 批次日志规范

- [x] 2.1 在 `logging-boundaries/SKILL.md` 增加导入批次的 traceId/batchId、数量、耗时、结果汇总和有限失败样本规则；通过定向文本检查确认禁止循环内逐条日志。

## 3. 统一验证

- [x] 3.1 运行 `openspec validate standardize-import-batch-ingestion --strict`、Markdown/diff 检查，并确认变更只涉及两个技能正文与 OpenSpec 规划文件，无业务代码或 API 实现变更。

## Workflow follow-up

- 完成 per-task audit、文档 review 和提交后，归档本次 OpenSpec change。
- 将任务分支合并回 `SOURCE_BRANCH=master`，同步两个更新后的 skill 到 Codex、Claude、Kimi 和 `.agents` 本地目录并验证哈希一致。
