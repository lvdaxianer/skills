# Design

## Context

See `proposal.md` for the motivation. The existing repository skill already
models merge and worktree cleanup as separate gates, but its examples and
normative wording are narrower than the requested local branch policy. The
repository also maintains an English-facing skill copy and a Chinese workflow
guide, while installed `.claude` and `.agents` copies must remain consistent.

## Goals / Non-Goals

**Goals:**

- Express one allowlist for task-branch cleanup: `features/*` and `fixes/*`.
- Keep merge, clean-state, ancestry, and non-forced cleanup ordering explicit.
- Make the same rule discoverable in the source skill, workflow guide, and both
  installed skill copies.

**Non-Goals:**

- Changing task-branch creation rules or requiring ordinary branches to be
  created in future work.
- Deleting remote branches or unrelated local branches.
- Changing application code or runtime behavior.

## Decisions

1. **Use an explicit namespace allowlist.** The closure gate will test the
   resolved `TASK_BRANCH` against `features/*` or `fixes/*`, rather than
   relying on the presence of `✅`. This covers existing ordinary local task
   branches while preventing broad cleanup of unrelated branch namespaces.
2. **Keep cleanup non-forced and ordered after merge.** The integration checkout
   must be clean, the task checkout must be clean, and
   `git merge-base --is-ancestor` must pass before `git worktree remove` and
   `git branch -d` are permitted. This preserves Git's own refusal behavior for
   unmerged branches and removes both the checkout directory and its worktree
   registration.
3. **Synchronize all maintained representations.** The repository source skill
   is authoritative for the committed change; the guide and installed copies
   receive the same wording and examples so operators do not encounter
   contradictory gates.

## Risks / Trade-offs

- [Risk] A legitimately completed task uses a branch outside the allowlist and
  cannot be auto-cleaned. → Mitigation: preserve it and report the exact
  namespace failure instead of deleting an ambiguous branch.
- [Risk] Installed copies may drift again after this change. → Mitigation:
  verify exact relevant sections with `diff` and include the synchronization in
  the task acceptance criteria.

## Migration Plan

No runtime migration is required. Update the source and installed skill copies,
validate the OpenSpec change, then merge the documentation commit into the
confirmed integration branch. Existing worktrees are not deleted by this
change; the new gate applies when each task reaches closeout.
