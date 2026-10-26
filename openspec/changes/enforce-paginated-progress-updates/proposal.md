# Proposal

## Why

列表查询若一次性拉取全部数据，会随数据规模增长造成不必要的网络、内存和渲染开销。列表项包含进度等中间状态时，重复刷新整页列表还会覆盖用户当前视图并放大请求成本，因此需要在前端交互规范中固化分页查询和按 ID 增量更新状态的要求。

## What Changes

- 为所有列表查询新增分页要求，禁止无分页拉取完整列表。
- 为包含进度等中间状态的分页列表新增稳定数据 ID 要求。
- 要求使用数据 ID 单独请求中间状态，并仅增量更新发生变化的列表项状态。
- 将上述要求同时写入技能红线和交互检查清单，保证实现与审查使用同一标准。

## Capabilities

### New Capabilities

- `frontend-interaction-reliability`: 约束分页列表查询和分页列表中间状态的增量更新行为。

### Modified Capabilities

<!-- No existing OpenSpec capability covers frontend interaction guidelines. -->

## Impact

- 受影响文件：`frontend-interaction-guidelines/SKILL.md`、`frontend-interaction-guidelines/references/interaction-checklist.md`。
- 同步影响：当前安装副本 `/Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines/`。
- 不修改后端 API、业务组件或依赖；具体分页字段、进度接口和更新频率仍由业务/API 设计决定。
