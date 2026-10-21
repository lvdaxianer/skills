# Tasks

## 1. Workflow gate and repository hygiene

- [x] 1.1 Update `development-workflow/SKILL.md` with the explicit user plan-approval gate, synchronized stage/loop/gate/status rules, and Mermaid flowchart; remove current-project `.claude/` and `.codex/` from Git tracking, add the managed ignore rules, and verify the new gate phrases, flowchart nodes, and ignore behavior with focused text checks plus `git status --short`.

### Task boundary and dispatch plan

- Agent: `workflow-gate-maintainer` (main-agent direct execution)
- Owned responsibility: update the workflow document and repository ignore/tracking rules, then run focused and broader verification.
- Allowed files/modules: `development-workflow/SKILL.md`, root `.gitignore`, current-project `.claude/`, current-project `.codex/`, and this OpenSpec change.
- Out of scope: existing frontend guideline changes, external `~/.claude` or `~/.agents` installations, product source code, and unrelated repository cleanup.
- Dependencies: approved design, validated OpenSpec plan, and preserved user-change backup/stash.
- Focused verification: `rg` checks for the plan-approval gate and Mermaid nodes; `git check-ignore -v` for `.agents/`, `.claude/`, and `.codex/`.
- Broader verification: `openspec validate add-plan-approval-gate --strict`, `git status --short`, `git ls-files`, and secret/artifact checks.
- Handoff evidence: changed-file diff, command output for focused/broader checks, and an explicit audit of preserved unrelated changes.
- Direct-execution fallback: delegation is unavailable and unsafe for this shared documentation/baseline task because the workflow file and repository hygiene rules must be kept atomically consistent.

### Per-task audit

- Result: PASS.
- Evidence: approved scope matches staged files; OpenSpec strict validation passes; plan-approval ordering and Mermaid flowchart checks pass; `.agents/`, `.claude/`, and `.codex/` ignore checks pass; no staged secret or build-artifact paths; unrelated frontend changes remain outside the task worktree.

## Workflow follow-up

- Run `openspec validate add-plan-approval-gate --strict` after implementation.
- Run the final plan-implementation consistency audit, code-review-spec review, and broader repository checks.
- Mark task 1.1 complete only after all gates pass, commit with full Chinese Conventional Commit format, merge into `master`, restore preserved user changes, and archive this OpenSpec change.
