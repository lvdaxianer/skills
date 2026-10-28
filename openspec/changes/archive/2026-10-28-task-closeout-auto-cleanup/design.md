# Design

## Approach

保留现有审计脚本的证据收集流程，在每个任务完成 `MERGED` 判定后立即进入一个受约束的清理阶段。清理只接受本地 task branch、可读的 `.source_branch`、通过 `git merge-base --is-ancestor` 的合并证据，以及位于 `.claude/worktrees/` 下的干净非当前 worktree。

## Cleanup protocol

1. 先记录任务的合并证据、路径和 dirty 状态。
2. 对已合并且有干净安全路径的任务，先执行一次 `git worktree remove --force`，仅用于移除已确认没有用户改动的 worktree 和本地 `.source_branch` metadata，成功后再执行 `git branch -d`。
3. 任一步失败都保留剩余资源并输出明确状态；锁定 worktree 需要更强覆盖而会被保留，不执行 `git worktree prune`，不清理 detached 或无法证明来源的 orphan worktree。
5. 当前调用所在的 worktree 不自动删除，避免让正在运行的 shell 落入已删除目录；报告给出可复现的跳过原因。

## Report contract

沿用现有 `TASK|...`、`ORPHAN_WORKTREE|...` 和 `SUMMARY|...` 记录，在 TASK 记录末尾增加 `cleanup_state`，并将最终提示改为说明哪些资源已自动清理、哪些因安全条件被跳过。所有 Git 删除命令都通过仓库 common dir 执行，以支持从 linked worktree 调用。

## Verification

测试使用隔离临时仓库覆盖：合并且干净的任务会删除 worktree 与分支；合并但脏的任务保留；未合并和未知任务保留；worktree 删除失败时不删除分支；脚本不使用 force 删除并保持非任务 orphan worktree 不变。最后运行 Bash 语法检查、全量回归测试、OpenSpec 严格校验、文档一致性检查和 `git diff --check`。
