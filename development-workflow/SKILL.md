---
name: development-workflow
description: Use when starting or executing development tasks that must follow a mandatory plan-first, TDD-first, code-review-gated, commit-per-task workflow before moving to the next task.
---

# Development Workflow

Use this skill to enforce a strict development loop. It applies to every code, test,
documentation, configuration, and refactoring task unless the user explicitly provides a
stricter workflow.

## Required Sources

Load and follow these skills before work begins:

- `superpowers:writing-plans` for the implementation plan.
- `superpowers:test-driven-development` for RED/GREEN/REFACTOR discipline.
- `code-review-spec` from `/Users/lvdaxianer/.agents/skills/code-review-spec/SKILL.md`.
- `commit` from `/Users/lvdaxianer/.codex/skills/commit/SKILL.md`.

Canonical rule sources used through those pointer skills:

- `/Users/lvdaxianer/.claude/skills/code-review-spec`
- `/Users/lvdaxianer/.claude/commands/commit.md`

If any required source cannot be read, stop and report the missing source.

## Mandatory Task Loop

For each development task, execute this exact order:

1. Use `superpowers:writing-plans` to create or update the implementation plan.
2. Select the next unchecked task from the plan. Do not start later tasks early.
3. Write the smallest useful TDD test for the selected task.
4. Run the focused test and confirm the RED failure is caused by missing behavior.
5. Implement the minimal GREEN change required by the failing test.
6. Run the focused test again and confirm it passes.
7. Run the relevant broader test, lint, build, or documentation check for the touched area.
8. Apply `code-review-spec` to the full diff for this task.
9. Fix every issue that should be fixed under `code-review-spec`. Do not ask for confirmation
   before making clear quality, correctness, maintainability, performance, or security fixes.
10. Re-run the focused and broader verification commands after fixes.
11. Apply `commit` and create one atomic Chinese Conventional Commit for this task.
12. Only after the commit succeeds, move to the next task.

## Gate Rules

- Do not ask for confirmation when the next action is mandated by this workflow.
- Do not skip validation, even for small or documentation-only changes.
- Do not keep implementation code that was written before a failing test unless the user
  explicitly exempted the task from TDD.
- Do not combine unrelated plan tasks into one commit.
- Do not commit unrelated user changes. Preserve existing dirty work that is outside the task.
- If a gate fails, fix the failure and re-run the same gate before continuing.
- If a clear fix is available during review, make it immediately and verify again.
- If the same blocker prevents progress after repeated attempts, report the blocker with
  exact command output and the affected file path.

## Required Status Format

When reporting progress, include the current task and gate:

```markdown
Current task: <task name>
Gate: <plan | RED | GREEN | broader verification | code-review-spec | commit | next task>
Evidence: <command or file checked>
```

Keep reports concise. Problems or risks come before summaries.
