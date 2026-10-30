# Async Operation Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端异步操作从触发到终态的反馈、恢复和连续性规则统一写入 `frontend-interaction-guidelines` 及其安装副本。

**Architecture:** 规范源文件负责强制红线和实现模式，交互 checklist 负责审查落点，OpenSpec 负责需求与任务追踪；安装副本是仓库源的字节级镜像。此次不引入运行时组件或依赖。

**Tech Stack:** Markdown、OpenSpec CLI、Git；验证使用 shell、`cmp` 和现有仓库测试脚本。

---

### Task 1: Add canonical lifecycle rules

**Files:**
- Modify: `frontend-interaction-guidelines/SKILL.md`
- Modify: `frontend-interaction-guidelines/references/interaction-checklist.md`
- Test: shell keyword/structure checks and `openspec validate async-operation-feedback --strict`

- [ ] **Step 1: Write the focused failing check**

  Assert that the two canonical files contain the new lifecycle concepts: pending/busy, request-surface continuity, terminal success/error recovery, long-running/background work, cancellation/navigation, and accessible status feedback.

- [ ] **Step 2: Run the focused check to confirm RED**

  Run the check against the current canonical files. Expected: FAIL because the new lifecycle-specific wording is not yet present.

- [ ] **Step 3: Add the minimal canonical rules**

  Add the lifecycle rules to `SKILL.md` and matching review items to `references/interaction-checklist.md`, preserving the existing short-request threshold, confirmation, optimistic rollback, pagination, stale-response, and component-boundary rules.

- [ ] **Step 4: Run the focused check to confirm GREEN**

  Re-run the keyword/structure check and `openspec validate async-operation-feedback --strict`. Expected: PASS.

### Task 2: Synchronize the installed skill copy

**Files:**
- Modify: `/Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines/SKILL.md`
- Modify: `/Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines/references/interaction-checklist.md`
- Test: `cmp` against the repository source files

- [ ] **Step 1: Copy the canonical files to the installed skill directory**

  Synchronize both files without changing their content.

- [ ] **Step 2: Verify byte identity**

  Run `cmp frontend-interaction-guidelines/SKILL.md /Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines/SKILL.md` and the equivalent checklist comparison. Expected: both commands exit 0.

### Task 3: Run integrated verification and audit

**Files:**
- Verify: all files in the change diff, OpenSpec artifacts, and installed copies
- Test: `bash task-closeout-audit/tests/test_audit_task_closeout.sh`

- [ ] **Step 1: Run the existing baseline test**

  Expected: `PASS: merged clean tasks are cleaned and unsafe states are preserved`.

- [ ] **Step 2: Review the full diff against the approved plan**

  Confirm that no business frontend code, API, dependency, secret, or unrelated file is present and that each delta requirement has a matching rule and checklist item.

- [ ] **Step 3: Commit and integrate**

  Apply the repository commit skill, merge the task branch into `master`, verify ancestry and final source/install equality, then archive the completed OpenSpec change.
