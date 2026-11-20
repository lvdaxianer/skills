# Tasks

- [x] T1. 将 worktree 关闭清理白名单与合并后删除顺序同步到源 skill、workflow guide、`.claude` canonical 副本和 `.agents` 副本，并同步修改对应的门禁流程、禁止项与状态格式。
- [ ] T2. 运行 OpenSpec 严格校验、Markdown/差异一致性检查和最终审计，确认只允许清理 `features/*` / `fixes/*` 本地分支且不触及其他命名空间或远端分支。

## Task Boundary and Dispatch

### T1 — Workflow source and installed-copy synchronization

- **Module-oriented agent name:** workflow documentation maintainer
- **Owned responsibility:** update the closure gate, task-loop steps, flowchart, prohibitions, and status gate list so all maintained representations state the same allowlist and merge-before-cleanup order.
- **Allowed files/modules:** `development-workflow/SKILL.md`, `DEVELOPMENT_WORKFLOW_GUIDE.md`, `/Users/lvdaxianer/.claude/skills/development-workflow/SKILL.md`, `/Users/lvdaxianer/.agents/skills/development-workflow/SKILL.md`.
- **Out of scope:** other skills, branch-creation conventions, remote branch deletion, application code, and unrelated local branches.
- **Dependencies:** approved proposal/design, modified `worktree-closure-gate` delta spec, and the existing worktree convention.
- **Focused verification:** `rg -n 'features/\\*|fixes/\\*|worktree remove|branch -d|branch -D|worktree remove --force'` across all four maintained files.
- **Broader verification:** `openspec validate enforce-task-branch-allowlist-cleanup --strict`, `git diff --check`, and relevant-section `diff` comparisons.
- **Handoff evidence:** clean focused diff, matching normative wording in all four files, and command output proving the allowlist and forbidden operations are present.
- **Dispatch decision:** direct main-agent execution. Delegation is not useful because the task is a synchronized four-file documentation change with overlapping wording and external installed-copy paths; one owner must preserve exact consistency.

### T2 — Verification and final audit

- **Module-oriented agent name:** workflow verification auditor
- **Owned responsibility:** validate the OpenSpec artifacts, inspect the full diff, and confirm allowlist, merge ordering, non-forced cleanup, and no remote/unrelated-branch deletion drift.
- **Allowed files/modules:** read-only inspection of the T1 diff, OpenSpec artifacts, and the four maintained workflow representations.
- **Out of scope:** implementation changes, remote branch operations, and cleanup of any existing worktree.
- **Dependencies:** T1 implementation and review complete.
- **Focused verification:** `openspec validate enforce-task-branch-allowlist-cleanup --strict` and exact-section comparison.
- **Broader verification:** `git diff --check`, `git status --short`, and final requirement-by-requirement audit.
- **Handoff evidence:** verification output and recorded audit result before task markers are changed.
