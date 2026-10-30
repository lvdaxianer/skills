# Tasks

## 1. Canonical interaction rules

- [ ] 1.1 Update `frontend-interaction-guidelines/SKILL.md` with the common async-operation lifecycle, immediate pending/busy feedback, request-surface continuity, terminal-state handling, retry/recovery, long-running work, cancellation/navigation behavior, stale-response protection, and accessible status requirements; verify all five delta requirements are represented and Markdown structure remains valid.
- [ ] 1.2 Update `frontend-interaction-guidelines/references/interaction-checklist.md` with matching review checks for pending controls, dialog/drawer continuity, success/error/cancelled outcomes, long-running/background work, and accessible cross-page feedback; verify every new checklist dimension maps to the delta spec.

## 2. Installation synchronization

- [ ] 2.1 Synchronize the canonical `SKILL.md` and `interaction-checklist.md` into `/Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines/`; verify both installed files are byte-identical to their repository counterparts with `cmp`.

## 3. Verification and audit

- [ ] 3.1 Run `openspec validate async-operation-feedback --strict`, the existing baseline test, keyword/structure checks, and the full diff scope review; verify the change contains only the planned skill, checklist, installation copy, design assets, and OpenSpec files.

## Workflow follow-up

- Complete the per-task audit, commit the documentation change with the required full Chinese Conventional Commit format, and merge the task branch into `master`.
- Run the final audit, archive the completed OpenSpec change, and verify `master` contains the archived result.
