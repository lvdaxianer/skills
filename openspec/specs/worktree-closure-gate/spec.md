# worktree-closure-gate Specification

## Purpose
为任务 worktree 和 task branch 提供可审计的关闭生命周期，确保只有已验证、已提交、已合并且无未提交改动的任务才能被清理。

## Requirements

### Requirement: 任务提交必须经过完整工作流门禁

任务 branch 上的提交 MUST 仅在测试、审计、review、OpenSpec 任务状态和泄密检查全部通过后发生。

#### Scenario: 提交前仍有门禁未通过
- **WHEN** 任一必需测试、审计、review、OpenSpec 任务标记或泄密检查未通过
- **THEN** 工作流 MUST 阻止进入提交阶段，并保留任务 worktree 与 branch

#### Scenario: 所有提交前门禁通过
- **WHEN** 所有必需检查均有成功证据且任务 diff 范围符合计划
- **THEN** 工作流 MAY 创建该任务的原子提交

### Requirement: 任务清理必须以合并和状态校验为前提

任务 worktree 和 task branch MUST 只有在 worktree clean、任务提交已合并到记录的集成分支且 ancestry 校验通过后才能删除。

#### Scenario: 任务尚未合并或 worktree 不干净
- **WHEN** 任务 branch 未被集成分支包含，或任务 worktree 存在未提交改动
- **THEN** 工作流 MUST 拒绝清理并保留 worktree 与 branch

#### Scenario: 任务已完成并安全合并
- **WHEN** 任务 worktree clean、集成分支 clean、任务 branch 是集成分支的 ancestry，且验证证据完整
- **THEN** 工作流 MAY 执行 `git worktree remove` 和非强制的 `git branch -d`

### Requirement: 清理门禁失败不得被强制删除绕过

工作流 MUST 将门禁失败视为阻断条件，禁止以 `git worktree remove --force`、`git branch -D` 或等价操作绕过未完成的任务状态。

#### Scenario: 关闭检查失败
- **WHEN** 任一清理前条件无法证明
- **THEN** 工作流 MUST 报告失败条件、保留现场并要求先完成修复或验证
