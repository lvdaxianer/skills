# Workflow Documentation Synchronization Design

## Goal

Align the Chinese and English repository entry points and the Chinese workflow
guide with the current `development-workflow` and
`git-branch-worktree-convention` rules.

## Scope

- Update `README.md`, `README.en.md`, and `DEVELOPMENT_WORKFLOW_GUIDE.md`.
- Preserve the workflow's 25-step task loop while documenting its current
  task-branch integration model.
- Keep the skill files unchanged.
- The user explicitly opted out of OpenSpec for this documentation-only
  change; no `openspec/` assets will be created.

## Documentation Model

The documents will treat `development-workflow/SKILL.md` as the authority for
gate order and `git-branch-worktree-convention/SKILL.md` as the authority for
branch/worktree lifecycle. They will state that a change confirms one
integration branch, every independently verifiable task runs on an emoji-named
task branch in an isolated worktree, and each verified task is merged back into
the recorded integration branch before the next task begins. There is no parent
or aggregate feature branch.

## Planned Changes

- Replace stale workflow summaries in both READMEs with the complete lifecycle:
  brainstorm, integration-branch confirmation and task worktree, OpenSpec,
  task boundary/dispatch, TDD, verification and reviews, per-task commit and
  merge, final audit/archive, and integration-branch verification.
- Correct local/external dependency counts and descriptions where the old text
  treats `commit` as external or omits workflow stages.
- Rebuild the guide's Mermaid flow and surrounding narrative around the actual
  25 ordered steps, including the delegated-agent review loop and per-task
  integration before the next task.
- Correct related usage instructions, FAQs, responsibility boundaries, and
  maintenance guidance so they no longer refer to a final parent branch merge
  or to obsolete dependency counts.

## Verification

- Check that no old "merge back to main" or parent-branch model remains in the
  workflow descriptions.
- Confirm all internal Markdown links and heading anchors resolve to tracked
  files and headings.
- Compare every stated workflow stage against the two authoritative skill files
  above, including the 25-step count, `SOURCE_BRANCH`, and cleanup semantics.
