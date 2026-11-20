# Proposal

## Why

当前关闭门禁只用带 `✅` 的分支示例描述任务分支，无法明确约束通过 worktree 创建的普通 `features/*` / `fixes/*` 本地分支。任务代码已经合并后若仍残留 worktree、Git worktree 注册信息或本地任务分支，会让已完成任务持续污染仓库状态。

## What Changes

- 将任务关闭清理范围明确限定为 `features/*` 与 `fixes/*` 两类本地任务分支，包含带或不带 `✅` 的名称。
- 强制要求任务分支先合并到记录的 `SOURCE_BRANCH`，再验证双方 clean 与 ancestry，最后依次移除 worktree 和本地任务分支。
- 明确禁止删除其他命名空间分支、自动删除远端分支，以及使用 `--force` / `-D` 绕过门禁。
- 同步仓库源 skill、canonical 安装副本和配套 workflow guide，避免门禁文本漂移。

## Capabilities

### New Capabilities

<!-- No new capability; this change modifies the existing closure behavior. -->

### Modified Capabilities

- `worktree-closure-gate`: 明确任务分支白名单，以及合并后删除 worktree 与本地分支的强制顺序。

## Impact

- `development-workflow/SKILL.md`
- `DEVELOPMENT_WORKFLOW_GUIDE.md`
- `/Users/lvdaxianer/.claude/skills/development-workflow/SKILL.md`
- `/Users/lvdaxianer/.agents/skills/development-workflow/SKILL.md`
- `openspec/specs/worktree-closure-gate/spec.md` 的对应 delta spec
