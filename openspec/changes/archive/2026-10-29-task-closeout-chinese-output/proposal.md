# Proposal

## Why

任务收尾审计的当前报告使用英文表头和状态，和用户的中文工作流不一致，阅读时还需要额外翻译。需要把 Skill 的最终回答统一为中文，同时保留脚本内部稳定的机器记录格式。

## What Changes

- 要求 `/task-closeout-audit` 的最终用户可见回答全部使用中文。
- 将表头、合并状态、分支/worktree 状态、清理状态、告警、汇总和限制说明翻译为中文。
- 保留 `TASK|...`、`ORPHAN_WORKTREE|...`、`SUMMARY|...` 等内部机器记录键，避免破坏脚本解析和回归测试。
- 增加评测提示，验证回答不再直接展示英文报告字段。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `task-closeout-audit`: 增加中文用户可见报告要求。

## Impact

- 修改 `task-closeout-audit/SKILL.md`、评测提示和任务收尾规范。
- 不改变自动清理的 Git 行为、机器记录格式或运行时依赖。
