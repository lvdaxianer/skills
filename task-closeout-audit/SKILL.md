---
name: task-closeout-audit
description: "Use when the user explicitly invokes /task-closeout-audit to audit every task branch and worktree in the current Git repository. Prove merge status from source metadata, then automatically remove clean, non-current task worktrees and delete their proven-merged local branches without asking for confirmation. Preserve unmerged, unknown, dirty, locked, outside-root, and orphan resources."
compatibility: Requires Git and a Bash-compatible shell; no network or external package is needed.
---

# Task Closeout Audit

Use this skill only for an explicit `/task-closeout-audit` invocation. It answers
the recurring closeout questions—whether task code is merged, whether the task
branch remains, and whether the task worktree remains—then automatically cleans
up resources that have complete merge evidence and pass the safety checks.

## Cleanup safety boundary

- Report `MERGED` only when a readable `.source_branch` names an existing local
  source branch and `git merge-base --is-ancestor <task-branch> <source-branch>`
  succeeds.
- For a proven-merged task, do not ask for confirmation: remove its clean,
  non-current worktree under `.claude/worktrees/`, then delete the local task
  branch with `git branch -d`.
- The bundled script may use `git worktree remove --force` only after the
  worktree status contains no user changes other than the Skill's local
  `.source_branch` metadata. This removes that metadata together with the
  already-safe worktree; it does not force-remove dirty or locked worktrees.
- Preserve `NOT_MERGED`, `UNKNOWN`, dirty, locked, current, missing-path,
  outside-root, and orphan resources. If worktree removal fails, do not delete
  the associated branch.
- Never merge, switch branches, reset files, prune worktrees, delete remote
  branches, or infer historical success from an absent local record.

## Procedure

1. Confirm that the current directory is inside the intended Git repository.
2. Run the bundled script from this skill directory:

   ```bash
   bash <skill-root>/scripts/audit_task_closeout.sh
   ```

3. Read every `TASK|...` and `ORPHAN_WORKTREE|...` record. Do not summarize
   only the first or current task.
4. Use the `evidence:`, `cleanup:`, and `SUMMARY|...` records to report what was
   proven and what was actually cleaned.
5. If the script reports an error, show the error and stop; do not improvise a
   destructive fallback.

## Report rules

- `CLEANED` means both the task worktree and local task branch were removed.
- `SKIPPED_DIRTY`, `SKIPPED_CURRENT_WORKTREE`, and other `SKIPPED_*` states mean
  the resource remains and must be reported as such.
- `WORKTREE_REMOVE_FAILED` or `BRANCH_DELETE_FAILED` means cleanup is partial or
  failed; identify the remaining resource precisely.
- `ORPHAN_WORKTREE` remains a finding requiring attention. It is never cleaned
  without branch/source ancestry evidence.
- `NO_TASK_RECORDS` means no records are discoverable now, not that every
  historical task was merged and cleaned up.

Always provide a concise table or equivalent summary with these fields:

| Task branch | Merge evidence | Branch | Worktree | Dirty | Source | Cleanup | Warning |
|---|---|---|---|---|---|---|---|
| branch name | `MERGED`, `NOT_MERGED`, or `UNKNOWN` | present/absent | present/absent | clean/uncommitted | source branch or unavailable | cleanup state | naming/orphan/metadata warning |

End with counts from the script summary, the exact unresolved or skipped items,
and a clear statement of which cleanup actions were executed. Deleted branch or
worktree records cannot prove prior historical completion when no durable local
evidence remains.

## Bundled resources

- `scripts/audit_task_closeout.sh`: deterministic Git inspection plus guarded
  cleanup for proven-merged task resources.
- `tests/test_audit_task_closeout.sh`: temporary-repository regression test for
  cleaned, dirty, locked, unmerged, unknown, current, and orphan states.
- `evals/evals.json`: realistic prompts for explicit invocation and safety
  behavior.
