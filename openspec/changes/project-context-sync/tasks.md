# Tasks

## 1. Complete project context synchronization skill

- [x] 1.1 Implement the complete `project-context-sync` skill package, including the concise `SKILL.md`, portable `.project-context/` scaffold templates, `targets.json` handling, standard-library sync/preview/verify utility, and focused tests; verify with a RED test for the missing behavior, GREEN `python -B -m unittest discover`, CLI smoke checks for `init`, `preview`, `verify`, and `sync`, and `openspec validate project-context-sync --strict`.

### Per-task audit evidence

- Scope: implementation is limited to `project-context-sync/**`, README index/install entries, and this OpenSpec change; no unrelated skill behavior changed.
- TDD: RED observed for missing CLI, followed by GREEN implementation; final focused suite is `9 passed`.
- Acceptance: source-of-truth scaffolding, configurable targets, managed-block idempotence, preview/verify, relative-path enforcement, symlink containment, and secret-like value rejection are covered by tests and CLI smoke checks.
- Review: `code-review-spec` applied to the Python utility; function size, file size, imports, exception chaining, input validation, path traversal, sensitive output, and direct logging concerns were checked and repaired where applicable. Backend, frontend, logging-boundary, REST API, database, and thread-pool rules are not applicable.
- Verification: in-memory Python compilation, `python -B -m unittest discover -s project-context-sync/tests -p 'test_*.py'`, `openspec validate project-context-sync --strict`, `git diff --check`, documentation/file existence checks, and generated-artifact checks all passed.

### Task boundary and dispatch plan

- Module-oriented agent: `project-context-sync`.
- Owned responsibility: all files under `project-context-sync/`, the root README index/install documentation needed to expose the new skill, and this change's verification evidence.
- Allowed files: `project-context-sync/**`, `README.md`, `README.en.md`, and `openspec/changes/project-context-sync/**`.
- Out of scope: changing existing skill behavior, changing OpenSpec main specs, adding runtime dependencies, or persisting machine-specific paths.
- Dependencies: completed `proposal.md`, `specs/project-context-sync/spec.md`, and `design.md`; Python standard library only.
- Focused verification: `python -m unittest discover -s project-context-sync/tests -p 'test_*.py'` and the skill CLI smoke checks in a temporary repository.
- Broader verification: `openspec validate project-context-sync --strict`, `git diff --check`, skill line/reference/path audits, and README link checks.
- Dispatch decision: direct main-agent execution because the implementation is one tightly coupled skill package with shared parser, renderer, and documentation files; splitting it would create overlapping write scopes and add merge risk without a safe independent boundary.
- Handoff evidence: changed-file list, focused test output, smoke-test output, strict OpenSpec validation, and final audit against every requirement and task boundary.

## Workflow follow-up

- After the task audit passes, mark this task complete, create the required atomic commit, merge it into `master`, and remove the task worktree/branch.
- Run the final audit and archive the completed OpenSpec change, then verify the integration branch contains the complete skill.
