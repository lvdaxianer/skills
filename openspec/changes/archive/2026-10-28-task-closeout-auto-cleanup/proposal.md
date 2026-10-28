# Proposal

## Why

`/task-closeout-audit` 已经能够证明任务是否合并，但每次审计后仍需要手动删除已合并任务的临时 worktree 和 Git 分支。用户明确希望对有充分合并证据的任务直接完成收尾，减少重复确认和遗留资源。

## What Changes

- 将任务收尾 Skill 从只读审计扩展为“合并后自动清理”。
- 仅在 task branch 的 tip 被记录的 source branch 证明为 ancestor 时，自动移除约定目录下的干净 task worktree，并删除已合并的本地 task branch。
- 未合并、证据不足、脏 worktree、当前正在使用的 worktree、非约定目录 worktree 或 Git 清理失败时，不执行破坏性清理，并在报告中说明原因。
- 报告清晰区分已清理、跳过清理和清理失败状态。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `task-closeout-audit`: 为已确认合并的任务增加自动清理行为，并更新安全边界、报告和状态要求。

## Impact

- 修改 `task-closeout-audit/SKILL.md` 和其 Bash 审计脚本。
- 扩展临时 Git 仓库回归测试与评测提示。
- 更新 `openspec/specs/task-closeout-audit/spec.md`，使持久化规范与新的清理行为一致。
- 不增加运行时依赖，不访问网络；脚本会执行受明确规则约束的 Git worktree 和 branch 删除命令。
