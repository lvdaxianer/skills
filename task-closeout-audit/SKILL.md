---
name: task-closeout-audit
description: "Use when the user explicitly invokes /task-closeout-audit to audit every task branch and worktree in the current Git repository. Check merge evidence, branch existence, worktree existence, dirty state, source metadata, historical naming, and orphan worktrees. This skill is read-only: never merge, delete branches, remove worktrees, switch branches, reset files, or claim an unprovable cleanup as complete."
compatibility: Requires Git and a Bash-compatible shell; no network or external package is needed.
---

# Task Closeout Audit

Use this skill only for an explicit `/task-closeout-audit` invocation. It answers
the three recurring closeout questions—whether task code is merged, whether the
task branch remains, and whether the task worktree remains—by collecting local
Git evidence in one report.

## Safety boundary

This skill is strictly read-only. Run the bundled audit script and inspect its
output, but never run `git merge`, `git branch -d`, `git branch -D`, `git
worktree remove`, `git switch`, `git reset`, or any other mutating command as
part of this audit. Do not edit `.source_branch`, repository configuration, or
the worktree contents.

If the user later asks for cleanup, stop treating that as this audit and ask for
a separate, explicit cleanup workflow. The audit itself must remain read-only.

## Procedure

1. Confirm that the current directory is inside the intended Git repository.
2. Run the bundled script from this skill directory:

   ```bash
   bash <skill-root>/scripts/audit_task_closeout.sh
   ```

3. Read every `TASK|...` and `ORPHAN_WORKTREE|...` record. Do not summarize
   only the first or current task.
4. Use the `evidence:` lines and `SUMMARY|...` record to produce the report.
5. If the script reports an error, show the error and stop; do not improvise a
   destructive fallback.

## Evidence rules

- Report `MERGED` only when a readable `.source_branch` names an existing local
  source branch and `git merge-base --is-ancestor <task-branch> <source-branch>`
  succeeds.
- Report `NOT_MERGED` when the source branch exists but the ancestry check fails.
- Report `UNKNOWN` when `.source_branch` is missing/unreadable, the source branch
  is missing, or the relevant history cannot be proven. Never substitute the
  current branch silently.
- Treat `branch_state=PRESENT` and `worktree_state=PRESENT` as independently
  actionable facts. A merged task with either resource present is still pending
  cleanup; the audit does not perform that cleanup.
- Treat `WARNING_HISTORICAL_NAME` as a warning only. Historical names under
  `features/` and `fixes/` remain in scope.
- Treat `ORPHAN_WORKTREE` as a resource finding requiring attention.
- Treat `NO_TASK_RECORDS` as “no records are discoverable now,” not proof that
  every historical task was merged and cleaned up.

## Report format

Always provide a concise table or equivalent summary with these fields:

| Task branch | Merge evidence | Branch | Worktree | Dirty | Source | Warning |
|---|---|---|---|---|---|---|
| branch name | `MERGED`, `NOT_MERGED`, or `UNKNOWN` | present/absent | present/absent | clean/uncommitted | source branch or unavailable | naming/orphan/metadata warning |

End with:

- counts from the script summary;
- the exact unresolved or unknown items;
- a clear statement that no cleanup action was executed;
- the limitation that deleted branch and worktree records cannot be proven from
  the current repository when no local evidence remains.

Do not say “已删除且已合并” merely because a branch/worktree is absent. Say
“当前不可发现；是否曾成功合并无法由本地证据确认” unless ancestry evidence
still exists through another durable record.

## Bundled resources

- `scripts/audit_task_closeout.sh`: deterministic, read-only Git inspection.
- `tests/test_audit_task_closeout.sh`: temporary-repository regression test for
  mixed task states and mutation safety.
- `evals/evals.json`: realistic prompts for evaluating explicit invocation and
  safety behavior.
