# development-workflow 交接协议

## 交接前提

产品总控只有在运行状态为 `DEVELOPMENT_READY` 时才允许交接。交接适配器必须重新读取项目事实源并确认：

- `prd/prd-verified.json` 结构完整，版本与运行记录和 `handoff.json` 一致。
- `tasks.json` 非空，每条任务都有稳定 ID、验收关联和验证计划。
- 每条 PRD 验收标准都有任务覆盖，并且 `handoff.json` 的验收引用完整。
- 产品复检和研发复检均已引用，不能存在 `blocked` 假设。

任何一项不满足都返回 `DEVELOPMENT_HANDOFF_BLOCKED`，不写入开发执行消息，不伪造 `DEVELOPMENT_RUNNING`。

## 自动交接

门禁通过后，适配器生成项目事实源中的 `handoff.md`，并向 `development-workflow` 追加一条：

```yaml
kind: request
action: execute
status: pending
from: prodflow
to: development-workflow
input_refs:
  - .product/runs/<runId>/handoff.md
  - .product/runs/<runId>/prd/prd-verified.json
  - .product/runs/<runId>/tasks.json
```

只有目标为 `development-workflow`、动作是 `execute` 且状态为 `pending/processing` 的消息才进入工程 Skill 的执行队列。适配器同时把运行状态更新为 `DEVELOPMENT_RUNNING`，并追加审计事件；重复调用只返回已存在请求，不重复发送。

## 工程 Skill 权威边界

交接适配器不复制或替代 `development-workflow` 的规则。工程 Skill 继续负责用户计划确认、任务 worktree、OpenSpec、TDD RED/GREEN、领域 review、逐任务提交、合并和最终审计。产品总控只提供冻结输入和可回放引用。

开发完成后，工程侧必须回写测试、验收和审计证据，产品总控再进入 `TASK_VERIFIED` 和最终部署决策；部署始终由用户最后明确授权后交给 `service-deployment`。
