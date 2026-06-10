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
- `code-review-spec` from `/Users/lvdaxianer/.claude/skills/code-review-spec/SKILL.md`.
- `commit` from `/Users/lvdaxianer/.claude/skills/commit/SKILL.md`.

Canonical rule sources used through those pointer skills:

- `/Users/lvdaxianer/.claude/skills/code-review-spec`
- `/Users/lvdaxianer/.claude/commands/commit.md`

If any required source cannot be read, stop and report the missing source.

## code-review-spec 执行要求

- 当任务涉及代码审查、格式化或代码修改时，必须严格执行 `code-review-spec`，不得用“差不多”“大致符合”或选择性覆盖代替。
- 执行 `code-review-spec` 时，必须逐项对照 canonical 的 `SKILL.md`、`spec.md` 以及相关 `references/*` 检查；未覆盖的项必须明确说明原因，不能默认合格。
- 如果 canonical `code-review-spec` 的任一要求不满足，必须视为未通过，直到修复并重新验证通过为止。
- 任何 `code-review-spec` 结论都必须基于实际对照结果，而不是摘要、印象判断或部分规则检查。

## Mandatory Task Loop

For each development task, execute this exact order:

1. Use `superpowers:writing-plans` to create or update the implementation plan.
2. Select the next unchecked task from the plan. Do not start later tasks early.
3. Write the smallest useful TDD test for the selected task.
4. Run the focused test and confirm the RED failure is caused by missing behavior.
5. Implement the minimal GREEN change required by the failing test.
6. Run the focused test again and confirm it passes.
7. Run the relevant broader test, lint, build, or documentation check for the touched area.
8. Apply `code-review-spec` to the full diff for this task, strictly and item-by-item against the canonical sources.
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
- For `code-review-spec`, a gate only passes after every applicable rule has been checked and any uncovered rule has been explicitly accounted for.

## Required Status Format

When reporting progress, include the current task and gate:

```markdown
Current task: <task name>
Gate: <plan | RED | GREEN | broader verification | code-review-spec | commit | next task>
Evidence: <command or file checked>
```

Keep reports concise. Problems or risks come before summaries.
