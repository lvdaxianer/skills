---
name: development-workflow
description: Use when starting or executing development tasks that must follow a mandatory brainstorming-first, OpenSpec-plan-first, TDD-first, implementation-audited, code-review-gated, commit-per-task workflow before moving to the next task.
---

# Development Workflow

The workflow is mandatory. Do not treat it as optional guidance. Any deviation from the workflow is noncompliant.

Use this skill to enforce a strict development loop. It applies to every code, test,
documentation, configuration, and refactoring task unless the user explicitly provides a
stricter workflow.

## Required Sources

Load and follow these skills before work begins:

- `superpowers:brainstorming` for requirement discussion, alternatives, and approved design.
- `openspec` for durable written change specs, implementation plans, task lists, validation, and archival.
- `superpowers:subagent-driven-development` for bounded multi-agent task execution when tasks can be safely delegated.
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
- Implementation first defines a task boundary and agent dispatch plan after the
  OpenSpec planning asset has been created and validated, then uses
  `superpowers:test-driven-development`.
- After all planned tasks finish, emit a final audit report that lists completed
  tasks, lists unfinished tasks, and includes a final review summary before the
  workflow is considered fully closed.

## OpenSpec Planning Requirements

- Use `superpowers:brainstorming` before writing the plan so the plan captures the intended behavior, constraints, trade-offs, and acceptance criteria.
- Use `openspec` to create or update the written change asset under `openspec/changes/<change-name>/`.
- Before creating or updating the written change asset, verify that the project
  root contains a non-hidden `openspec/` directory. If it is missing,
  initialize the OpenSpec scaffold first and select Codex and Claude instruction targets.
  Hidden `.openspec` paths do not satisfy the project OpenSpec root requirement.
- Future persisted changes and approved specs must be based on the project OpenSpec workflow.
  Keep changes under `openspec/changes/` and approved specs under `openspec/specs/`.
  Non-OpenSpec documents do not replace OpenSpec change/spec assets as the
  authoritative source.
- Use the local OpenSpec `spec-driven` layout:
  - `openspec/changes/<change-name>/.openspec.yaml`
  - `openspec/changes/<change-name>/proposal.md`
  - `openspec/changes/<change-name>/design.md`
  - `openspec/changes/<change-name>/tasks.md`
  - `openspec/changes/<change-name>/specs/<capability>/spec.md`
- Validate the OpenSpec change with `openspec validate <change-name> --strict`.
- The OpenSpec plan is a required project asset. Validate it before implementing
  production code. The workflow does not require a standalone planning commit by
  default.
  OpenSpec planning files are committed with the first atomic task commit that
  carries a complete business module.
- A standalone OpenSpec or documentation commit is allowed only when the change
  is documentation-only or when no business implementation remains to carry the
  document update.
- Every planned task must have one durable checkbox or equivalent status marker. Mark exactly one completed task immediately after its gate passes. Do not batch-complete tasks at the end.
- If a session resumes mid-change, read the OpenSpec task list first, continue from the first unchecked task, and preserve already completed task markers.
- After every OpenSpec change is fully executed and verified, archive the completed OpenSpec change according to the repository's OpenSpec archive process.
- After the final audit and archive flow completes, produce a final audit report
  that lists completed tasks and lists unfinished tasks for the completed change.
  The report must include a final review summary with these exact topics:
  what this modification did well, why it was good,
  what was poor in the original code or workflow, why it was poor, and
  how to correct or improve it.

## Commit Message Requirements

- Apply `commit --style=full` for every workflow-created task, archive,
  or documentation commit unless the user explicitly requests `--style=simple`.
- Every workflow-created commit MUST be a Chinese Conventional Commit with a
  mapped emoji subject, a non-empty body, and a non-empty footer.
- The commit body MUST explain what changed and why, including relevant
  verification evidence when useful.
- The commit footer MUST include traceability metadata. Use `Refs:` when no
  breaking change, issue, co-author, or review reference applies.
- For OpenSpec-driven task commits, prefer footer values such as
  `Refs: OpenSpec <change-name> task <task-id>`.

## code-review-spec 执行要求

- 当任务涉及代码审查、格式化或代码修改时，必须严格执行 `code-review-spec`，不得用“差不多”“大致符合”或选择性覆盖代替。
- 执行 `code-review-spec` 时，必须逐项对照 canonical 的 `SKILL.md`、`spec.md` 以及相关 `references/*` 检查；未覆盖的项必须明确说明原因，不能默认合格。
- 如果 canonical `code-review-spec` 的任一要求不满足，必须视为未通过，直到修复并重新验证通过为止。
- 任何 `code-review-spec` 结论都必须基于实际对照结果，而不是摘要、印象判断或部分规则检查。

## Task Boundary And Agent Dispatch Requirements

- Before RED, the selected OpenSpec task must define a task boundary and agent
  dispatch plan.
- The task boundary and agent dispatch plan must include:
  - module-oriented agent name
  - owned responsibility
  - allowed files or modules
  - out-of-scope work
  - dependencies
  - focused and broader verification commands
  - handoff evidence
- Use `superpowers:subagent-driven-development` as the default multi-agent
  orchestration principle for safely delegable tasks.
- multi-agent orchestration is the default execution principle when task
  boundaries are clear and delegation is safe.
- The main agent remains responsible for planning, context curation, dispatch,
  verification evidence, plan-implementation consistency audit,
  `code-review-spec`, task mark-complete, commits, final audit, OpenSpec
  archive, and final reporting.
- The main agent verifies the returned evidence before advancing gates.
- Direct main-agent execution is allowed only when delegation is unavailable, unsafe, or not useful. The workflow must record the fallback reason before RED.
- Parallel implementation is allowed only with disjoint write scopes or isolated worktrees.
- The workflow does not dispatch multiple implementation agents to edit overlapping files or modules in the same working tree.
- Analysis, review, and verification agents may run in parallel when they do not
  mutate overlapping files.
- The default maximum parallel implementer subagents is 3.
- The default maximum total parallel agents is 5 across implementer, analysis,
  review, and verification agents.
- The concurrency limit is a safety ceiling, not a target. Do not start agents
  only to fill capacity.
- When the limit is reached, queue additional agent work until a running agent
  completes or is closed.
- If a delegated task enters a repair loop, reuse the same subagent for that repair loop instead of starting a new implementer agent.
- For shared files, shared modules, or high-risk changes, reduce implementation concurrency to 1 even when the default limit would allow more agents.
- The subagent merge-review loop is mandatory for delegated implementation:
  merge or apply the subagent result into the main worktree, run main agent
  review, send the findings back to the same subagent when issues exist, and
  repeat merge, review, and fix until the main agent review passes.
- Do not mark delegated work complete from a subagent report alone. The main
  worktree must contain the merged or applied result before review gates can pass.

## Mandatory Task Loop

For each development task, execute this exact order:

1. Use `superpowers:brainstorming` to clarify the requirement and approve the design.
2. Use `OpenSpec` to create or update the written change, including the OpenSpec plan and task checklist.
3. Validate the OpenSpec change and keep those planning files available for the first related task commit.
4. Select the next unchecked task from the OpenSpec plan. Do not start later tasks early.
5. Define the task boundary and agent dispatch plan for the selected task before writing the failing test.
6. Dispatch a bounded module-oriented implementer agent when delegation is safe; otherwise record the direct-execution fallback reason before writing the failing test.
7. For delegated implementation, merge or apply the subagent result into the main worktree before accepting the task result.
8. Run main agent review on the merged or applied result.
9. If main agent review finds issues, send the findings back to the same subagent and repeat merge, review, and fix until the main agent review passes.
10. Use `superpowers:test-driven-development` and write the smallest useful TDD test for the selected task.
11. Run the focused test and confirm the RED failure is caused by missing behavior.
12. Implement the minimal GREEN change required by the failing test.
13. Run the focused test again and confirm it passes.
14. Run the relevant broader test, lint, build, or documentation check for the touched area.
15. Run a plan-implementation consistency audit using Superpowers audit capability. Confirm the implementation matches the OpenSpec plan, acceptance criteria, and current task scope.
16. Apply `code-review-spec` to the full diff for this task, strictly and item-by-item against the canonical sources.
17. Fix every issue that should be fixed under `code-review-spec`. Do not ask for confirmation
   before making clear quality, correctness, maintainability, performance, or security fixes.
18. Re-run the focused and broader verification commands after fixes.
19. Mark exactly one completed task immediately after its gate passes in the OpenSpec checklist.
20. Create one atomic Chinese Conventional Commit for this task by applying
    `commit --style=full`; the message must include a non-empty body and
    non-empty footer. Include uncommitted related OpenSpec planning files in this
    commit when the task carries a complete business module.
21. Only after the commit succeeds, move to the next task.
22. After all tasks are complete, run a final audit to ensure all planned tasks are complete, all acceptance criteria are satisfied, and no implementation drift remains.
23. Archive the completed OpenSpec change, then commit the archive/update if the archive modifies repository files.

## Gate Rules

- Do not ask for confirmation when the next action is mandated by this workflow.
- Do not skip validation, even for small or documentation-only changes.
- Do not implement production code before the OpenSpec plan has been written and validated.
- Do not write the RED test before the task boundary and agent dispatch plan has
  been defined.
- Do not use direct main-agent execution without recording why delegation is
  unavailable, unsafe, or not useful.
- Do not run overlapping implementation agents in the same working tree.
- Do not exceed 3 parallel implementer subagents or 5 total parallel agents by
  default; queue extra work instead.
- Do not treat the concurrency limit as a target.
- Do not start a new subagent for a repair loop when the original subagent can
  receive the findings and continue.
- Do not advance delegated work from subagent report alone; first merge or apply
  the subagent result into the main worktree, run main agent review, and send
  findings back to the same subagent until the review passes.
- Do not create standalone planning commits by default; carry OpenSpec planning
  files with the first atomic task commit for a complete business module.
- Do not create a standalone OpenSpec or documentation commit unless the change
  is documentation-only or no business implementation remains to carry it.
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
Gate: <brainstorming | OpenSpec plan | OpenSpec validation | task boundary and agent dispatch | RED | GREEN | broader verification | plan-implementation consistency audit | code-review-spec | task mark-complete | commit | final audit | OpenSpec archive | next task>
Evidence: <command or file checked>
```

Keep reports concise. Problems or risks come before summaries.
