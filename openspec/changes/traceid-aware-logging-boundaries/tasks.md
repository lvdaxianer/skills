# Tasks

## 1. 更新日志治理总则

- [x] 1.1 修改 `logging-boundaries/SKILL.md`，明确业务日志先建立 trace context、跨服务传播同一 traceId、定时任务默认静默和诊断前置条件，并用文档检索确认旧规则无冲突

## 2. 更新定时任务与速查规则

- [x] 2.1 修改 `logging-boundaries/scenarios/scheduled-job.md`，补充正常成功静默、异常/阈值/状态变化/人工诊断触发、traceId 生成与下游传播示例，并检查 checklist 覆盖这些场景
- [x] 2.2 修改 `logging-boundaries/references/decision-matrix.md`，同步定时任务级别、频次和 traceId 查询边界，并用关键词检索确认决策矩阵与场景文档一致
- [ ] 2.3 修改 `logging-boundaries/references/anti-patterns.md`，增加固定成功任务日志、无上下文业务日志和事后补日志反模式，并检查正反例可执行

## 3. 规范验证与审查

- [ ] 3.1 运行 `openspec validate traceid-aware-logging-boundaries --strict`、文档链接/关键词一致性检查和完整 diff 审查，确认所有新增要求有对应文档证据

## Workflow follow-up

- 通过 OpenSpec 验证、领域审查、任务审计和提交后，将 change 归档。
- 将任务分支合并回 `master`，验证集成分支包含变更后推送 `origin/master`。
