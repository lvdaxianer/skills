# Proposal

## Why

任务 worktree 和临时 task branch 如果没有明确的关闭条件，容易在未验证、未合并或仍有未提交改动时被删除，也容易在任务完成后长期遗留。现在需要把“提交、合并、验证、清理”变成可审计的强制门禁，确保 `features/✅...` 与 `fixes/✅...` 任务 worktree 只有在安全完成后才能移除。

## What Changes

- 为 development workflow 增加任务提交前的硬门禁，要求完成测试、审计、review、OpenSpec 任务标记和泄密检查。
- 为 source-branch integration 增加合并后验证门禁，要求目标集成分支 clean、任务提交已合并且 ancestry 校验通过。
- 为 worktree/branch 清理增加统一关闭检查：只有任务 worktree clean、任务分支已合并、验证证据完整时，才允许执行 `git worktree remove` 与 `git branch -d`。
- 明确门禁失败时必须保留 worktree 和 branch，禁止使用强制删除绕过未完成状态。
- 同步更新 canonical skill 与仓库内镜像指南，避免两处流程说明漂移。

## Capabilities

### New Capabilities

- `worktree-closure-gate`: 约束任务 worktree、task branch 的提交、合并、验证与安全清理生命周期。

### Modified Capabilities

- 无。

## Impact

- 影响 `/Users/lvdaxianer/.agents/skills/development-workflow/SKILL.md` 与仓库内 `development-workflow/SKILL.md`、`DEVELOPMENT_WORKFLOW_GUIDE.md` 的流程规则和示例。
- 不修改业务代码、公共 API 或运行时依赖；验证范围为文档一致性、OpenSpec 严格校验和门禁条款覆盖检查。
