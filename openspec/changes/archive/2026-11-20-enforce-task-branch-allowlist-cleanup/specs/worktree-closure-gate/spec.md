# Spec Delta

## MODIFIED Requirements

### Requirement: 任务清理必须以合并和状态校验为前提

任务 worktree 和 task branch MUST 只有在 worktree clean、任务提交已合并到记录的集成分支且 ancestry 校验通过后才能删除。可删除的 task branch 仅限名称匹配 `features/*` 或 `fixes/*` 的本地分支；其他命名空间的分支 MUST NOT 被本流程删除。

#### Scenario: 任务尚未合并或 worktree 不干净
- **WHEN** 任务 branch 未被集成分支包含，或任务 worktree 存在未提交改动
- **THEN** 工作流 MUST 拒绝清理并保留 worktree 与 branch

#### Scenario: 任务已完成并安全合并
- **WHEN** 任务 worktree clean、集成分支 clean、任务 branch 是集成分支的 ancestry，且任务 branch 名称匹配 `features/*` 或 `fixes/*`
- **THEN** 工作流 MUST 先执行非强制 `git worktree remove`，再执行非强制 `git branch -d`，并确认本地 worktree 目录与 Git worktree 注册信息均已移除

#### Scenario: 任务 branch 不在清理白名单内
- **WHEN** 任务 branch 名称不匹配 `features/*` 或 `fixes/*`
- **THEN** 工作流 MUST 拒绝删除该 branch 或其 worktree，并报告分支命名空间不符合关闭清理白名单

### Requirement: 清理门禁失败不得被强制删除绕过

工作流 MUST 将门禁失败视为阻断条件，禁止以 `git worktree remove --force`、`git branch -D` 或等价操作绕过未完成的任务状态。

#### Scenario: 关闭检查失败
- **WHEN** 任一清理前条件无法证明
- **THEN** 工作流 MUST 报告失败条件、保留现场并要求先完成修复或验证
