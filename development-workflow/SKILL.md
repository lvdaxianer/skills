---
name: development-workflow
description: Use when starting or executing development tasks that must follow a mandatory brainstorming-first, OpenSpec-plan-first, TDD-first, implementation-audited, code-review-gated, commit-per-task workflow before moving to the next task.
---

# Development Workflow

Use this skill to enforce a strict development loop. It applies to every code, test,
documentation, configuration, and refactoring task unless the user explicitly provides a
stricter workflow.

## Required Sources

Load and follow these skills before work begins:

- `superpowers:brainstorming` for requirement discussion, alternatives, and approved design.
- `openspec` for durable written change specs, implementation plans, task lists, validation, and archival.
- `superpowers:test-driven-development` for RED/GREEN/REFACTOR discipline before production code.
- `superpowers:verification-before-completion` or the closest available Superpowers audit skill for plan-implementation consistency audit.
- `code-review-spec` from `/Users/lvdaxianer/.agents/skills/code-review-spec/SKILL.md`.
- `commit` from `/Users/lvdaxianer/.codex/skills/commit/SKILL.md`.

Canonical rule sources used through those pointer skills:

- `/Users/lvdaxianer/.claude/skills/code-review-spec/SKILL.md`
- `/Users/lvdaxianer/.claude/skills/code-review-spec/spec.md`
- `/Users/lvdaxianer/.claude/skills/code-review-spec/references/*`
- `/Users/lvdaxianer/.claude/commands/commit.md`

If any required source cannot be read, stop and report the missing source.

## Stage Boundaries

- Requirement discussion uses `superpowers:brainstorming`. While the user is still
  clarifying requirements, alternatives, trade-offs, or acceptance criteria, do not
  require OpenSpec files.
- Requirement persistence uses OpenSpec. Once the user chooses to write the
  requirement into files, create or update exactly one OpenSpec change for the
  independent change.
- Implementation uses `superpowers:test-driven-development` after the OpenSpec
  planning asset has been validated and committed.

## OpenSpec Planning Requirements

- Use `superpowers:brainstorming` before writing the plan so the plan captures the intended behavior, constraints, trade-offs, and acceptance criteria.
- Use `openspec` to create or update the written change asset under `openspec/changes/<change-name>/`.
- Use the local OpenSpec `spec-driven` layout:
  - `openspec/changes/<change-name>/.openspec.yaml`
  - `openspec/changes/<change-name>/proposal.md`
  - `openspec/changes/<change-name>/design.md`
  - `openspec/changes/<change-name>/tasks.md`
  - `openspec/changes/<change-name>/specs/<capability>/spec.md`
- Validate the OpenSpec change with `openspec validate <change-name> --strict`.
- The OpenSpec plan is a required project asset. Commit the OpenSpec plan as an
  independent planning commit before implementing production code.
- Every planned task must have one durable checkbox or equivalent status marker. Mark exactly one completed task immediately after its gate passes. Do not batch-complete tasks at the end.
- If a session resumes mid-change, read the OpenSpec task list first, continue from the first unchecked task, and preserve already completed task markers.
- After every OpenSpec change is fully executed and verified, archive the completed OpenSpec change according to the repository's OpenSpec archive process.

## code-review-spec 执行要求

- 当任务涉及代码审查、格式化或代码修改时，必须严格执行 `code-review-spec`，不得用“差不多”“大致符合”或选择性覆盖代替。
- 执行 `code-review-spec` 时，必须逐项对照 canonical 的 `SKILL.md`、`spec.md` 以及相关 `references/*` 检查；未覆盖的项必须明确说明原因，不能默认合格。
- 如果 canonical `code-review-spec` 的任一要求不满足，必须视为未通过，直到修复并重新验证通过为止。
- 任何 `code-review-spec` 结论都必须基于实际对照结果，而不是摘要、印象判断或部分规则检查。

## Mandatory Task Loop

For each development task, execute this exact order:

1. Use `superpowers:brainstorming` to clarify the requirement and approve the design.
2. Use `OpenSpec` to create or update the written change, including the OpenSpec plan and task checklist.
3. Commit the OpenSpec plan as its own required planning commit before production code changes.
4. Select the next unchecked task from the OpenSpec plan. Do not start later tasks early.
5. Use `superpowers:test-driven-development` and write the smallest useful TDD test for the selected task.
6. Run the focused test and confirm the RED failure is caused by missing behavior.
7. Implement the minimal GREEN change required by the failing test.
8. Run the focused test again and confirm it passes.
9. Run the relevant broader test, lint, build, or documentation check for the touched area.
10. Run a plan-implementation consistency audit using Superpowers audit capability. Confirm the implementation matches the OpenSpec plan, acceptance criteria, and current task scope.
11. Apply `code-review-spec` to the full diff for this task, strictly and item-by-item against the canonical sources.
12. Fix every issue that should be fixed under `code-review-spec`. Do not ask for confirmation
   before making clear quality, correctness, maintainability, performance, or security fixes.
13. Re-run the focused and broader verification commands after fixes.
14. Mark exactly one completed task immediately after its gate passes in the OpenSpec checklist.
15. Apply `commit` and create one atomic Chinese Conventional Commit for this task.
16. Only after the commit succeeds, move to the next task.
17. After all tasks are complete, run a final audit to ensure all planned tasks are complete, all acceptance criteria are satisfied, and no implementation drift remains.
18. Archive the completed OpenSpec change, then commit the archive/update if the archive modifies repository files.

## Gate Rules

- Do not ask for confirmation when the next action is mandated by this workflow.
- Do not skip validation, even for small or documentation-only changes.
- Do not implement production code before the OpenSpec plan has been written and committed.
- Do not keep implementation code that was written before a failing test unless the user
  explicitly exempted the task from TDD.
- Do not mark a task complete before RED, GREEN, broader verification, plan-implementation consistency audit, `code-review-spec`, fixes, re-verification, and commit gates all pass.
- Do not batch-complete tasks at the end. Progress must be durable after every finished task.
- Do not combine unrelated plan tasks into one commit.
- Do not commit unrelated user changes. Preserve existing dirty work that is outside the task.
- If a gate fails, fix the failure and re-run the same gate before continuing.
- If a clear fix is available during review, make it immediately and verify again.
- If the same blocker prevents progress after repeated attempts, report the blocker with
  exact command output and the affected file path.
- For `code-review-spec`, a gate only passes after every applicable rule has been checked and any uncovered rule has been explicitly accounted for.
- The final audit gate only passes when the OpenSpec checklist, implementation diff, tests, and review evidence agree that the planned change is complete.

## Required Status Format

When reporting progress, include the current task and gate:

```markdown
Current task: <task name>
Gate: <brainstorming | OpenSpec plan | planning commit | RED | GREEN | broader verification | plan-implementation consistency audit | code-review-spec | task mark-complete | commit | final audit | OpenSpec archive | next task>
Evidence: <command or file checked>
```

Keep reports concise. Problems or risks come before summaries.
