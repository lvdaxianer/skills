# Proposal

## Why

现有前端交互规范只明确要求进度等中间状态按数据 ID 增量更新，容易让实现者对启用、停止、发布、归档或普通字段更新等已有列表项操作重新刷新整页列表。扩大该约束可以减少无谓的网络与渲染开销，并保留用户当前的分页、排序、选择和交互上下文。

## What Changes

- 将按稳定 ID 增量更新的要求扩展到列表已有项的独立状态和字段更新。
- 明确启用/停用、启动/停止、暂停/恢复、发布/下线、归档/恢复、审批/拒绝、置顶/取消置顶、已读/未读等属于独立状态变更。
- 明确新增和删除不属于该局部更新规则，因为它们会改变列表结构。
- 允许状态变化成功后，因当前筛选、分页或排序条件改变而重新获取列表进行结构校正。
- 在主 skill 与交互 checklist 中同步新增规则，确保实现模式和 Review 模式采用同一判断标准。

## Capabilities

### New Capabilities

### Modified Capabilities

- `frontend-interaction-reliability`: 将列表项增量更新要求从进度等中间状态扩展到所有已有项的独立状态或字段更新，并定义结构校正例外。

## Impact

- 修改 `frontend-interaction-guidelines/SKILL.md` 与其 `references/interaction-checklist.md`。
- 修改 `openspec/specs/frontend-interaction-reliability/spec.md` 的对应行为契约。
- 不修改业务代码、API 接口或运行时依赖；仅更新前端交互规范及其可验证要求。
