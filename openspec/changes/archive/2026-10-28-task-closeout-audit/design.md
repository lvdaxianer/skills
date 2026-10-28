# Design

## Context

See `proposal.md` for the motivation and user-facing scope. The repository uses
task branches under `features/` or `fixes/`, task worktrees under
`.claude/worktrees/`, and `.source_branch` to record the integration branch.
Historical branches may omit the emoji or use older task naming, so discovery
must not depend on the latest naming regex alone.

## Goals / Non-Goals

**Goals:**

- Make the closeout check repeatable from any directory inside the repository.
- Use Git's registered worktree inventory and ancestry checks as primary evidence.
- Preserve an explicit unknown state whenever the repository cannot prove history.
- Keep the invocation safe by making the audit path read-only.
- Keep the Skill usable without installing a runtime dependency.

**Non-Goals:**

- Automatically merging branches or deleting branches/worktrees.
- Reconstructing deleted branch history from reflogs or remote hosting services.
- Replacing the development workflow's merge and cleanup gates.

## Decisions

### Use a bundled POSIX shell audit script

The Skill will provide a small Bash-compatible script for deterministic Git
inspection, while `SKILL.md` explains when to invoke it and how to interpret the
report. This is preferred over model-only command generation because parsing
worktree records and preserving unknown states should be repeatable. No external
package or network service is required.

### Treat `.source_branch` as authoritative merge context

For a task with a worktree, the script reads `.source_branch` and verifies that
the named source branch exists. A merged result is reported only when
`git merge-base --is-ancestor <task> <source>` succeeds. If metadata is missing
or the source branch is unavailable, the result is unknown; the current branch
is never silently substituted as a source.

### Separate discovery from lifecycle claims

The report distinguishes what is currently discoverable from what happened in
the past. A branch or worktree that is still registered can be reported as
present. If both records are gone, the audit reports that no record is
discoverable and does not claim that the task was successfully merged and
cleaned up.

### Support canonical and historical task names

Discovery includes local branches below `features/` and `fixes/`, then marks
non-canonical names as warnings. Registered worktrees under the project task
root are also inspected for detached or otherwise orphaned entries, so a naming
warning cannot hide a resource leak.

### Keep output human-readable and safe

The primary output is a table and summary counts. Suggested follow-up commands
may be printed as text, but the script will not invoke mutating Git commands
such as `merge`, `branch -d`, `worktree remove`, `switch`, or `reset`.

## Risks / Trade-offs

- [Deleted history cannot be proven locally] → Report unknown instead of
  guessing; keep the limitation visible in the summary.
- [Historical worktrees may not contain `.source_branch`] → Include them in
  discovery and mark merge status unknown with the missing evidence.
- [Shell parsing differs across environments] → Use porcelain Git output,
  quote paths, avoid non-portable dependencies, and test with temporary Git
  repositories on the supported macOS/Linux shell baseline.
- [The repository may contain unrelated feature branches] → Report the branch
  namespace and evidence columns clearly so users can distinguish task cleanup
  from ordinary long-lived branches.

## Migration Plan

No data migration is required. Add the Skill directory and README references,
then invoke `/task-closeout-audit` from an existing repository. Existing tasks
remain untouched; the first report may classify historical records as unknown
when their source metadata is unavailable.
