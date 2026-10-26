# Tasks

## 1. 规范与清单同步

- [x] 1.1 在 `frontend-interaction-guidelines/SKILL.md` 的强制规则中加入分页列表查询与按分页数据 ID 单独请求、增量更新中间状态的规范，并在 `references/interaction-checklist.md` 的运行时性能/数据状态检查项中加入对应验收项；验证方式：关键条款检查、Markdown 结构检查和 diff 审查均通过。
- [x] 1.2 将仓库 canonical 技能文件同步到 `/Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines/`；验证方式：两份 `SKILL.md` 与两份 `interaction-checklist.md` 字节一致，且安装副本包含两条新增强制规范。

## 2. 集成验证

- [x] 2.1 对 OpenSpec change 执行 `openspec validate enforce-paginated-progress-updates --strict`，并检查工作区只包含本次规范变更及其 OpenSpec 资产；验证方式：命令退出码为 0，未发现越界文件。

## Workflow follow-up

- 完成任务级审计、提交并合并回 `master`。
- 完成最终审计后归档 OpenSpec change，并验证 `master` 包含全部变更。
