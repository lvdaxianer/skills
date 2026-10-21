# Proposal

## Why

当前 workflow 在需求讨论后可能直接进入 worktree、OpenSpec 或实现阶段，用户没有一个明确的计划确认点。需要把“用户明确批准计划”设为不可跳过的启动门禁，避免需求理解、任务拆分或验收标准尚未达成共识时就开始改文件。

## What Changes

- 在 brainstorming 之后、worktree 创建之前增加“计划确认”阶段。
- 要求助手展示范围、任务拆分、验收标准、验证方式、风险和假设，并等待用户明确批准。
- 明确未批准时不得创建 worktree、写 OpenSpec、写测试或实现；计划发生实质变化时必须回到确认阶段。
- 更新 workflow 的文字阶段、强制任务循环、Gate Rules 和状态格式。
- 在 workflow 中加入反映新门禁的流程图。
- 将当前项目本地 `.agents/`、`.claude/`、`.codex/` 目录从远程 Git 追踪中移除，并保留本地使用方式。

## Capabilities

### New Capabilities

本变更仅修改开发流程文档和仓库基线，不引入可独立验证的产品能力。

### Modified Capabilities

无。通过 `skip_specs: true` 标记为流程文档与仓库卫生变更。

## Impact

- 修改 `development-workflow/SKILL.md`。
- 新增或更新项目根 `.gitignore`，并移除当前已跟踪的 `.claude/` 与 `.codex/` 文件。
- 不修改已有用户的 frontend guideline 改动；这些改动在任务完成后恢复并保持未提交。
