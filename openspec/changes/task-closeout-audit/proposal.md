# Proposal

## Why

任务完成后，需要反复确认代码是否已合并、临时分支是否仍存在以及
worktree 是否仍占用本地环境。手工检查容易遗漏，也容易在证据不足时
误判清理状态，因此需要一个可重复执行且默认只读的收尾审计 Skill。

## What Changes

- 新增 `task-closeout-audit` Skill，并通过 `/task-closeout-audit` 显式触发。
- 扫描当前仓库可发现的 task 分支与 `.claude/worktrees/`。
- 使用 `.source_branch` 和 Git ancestry 证据判断合并状态。
- 报告分支状态、worktree 状态、缺失元数据、孤立 worktree 和无法确认的情况。
- 默认禁止合并、删除分支和删除 worktree 等写操作。
- 为 Skill 增加可重复的验证场景，并更新中英文 README 的目录和使用说明。

## Capabilities

### New Capabilities

- `task-closeout-audit`: 只读审计任务分支合并与本地任务资源清理状态。

### Modified Capabilities

无。

## Impact

- 新增 `task-closeout-audit/` Skill 目录及其只读审计脚本、验证用例。
- 更新 `README.md` 和 `README.en.md` 的 Skill 清单、安装和使用说明。
- 不新增运行时依赖，不修改业务代码、公共 API 或 Git 历史。
