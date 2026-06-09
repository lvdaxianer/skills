# Development Workflow Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable skill that forces plan-first, TDD-first, review-gated, commit-after-each-task development.

**Architecture:** The workflow lives in one concise `SKILL.md` so it is easy for agents to load at task start. A Python `unittest` contract test verifies the required gates and canonical source links. README files are updated so the skill is visible in installation docs.

**Tech Stack:** Markdown skill metadata, Python standard library `unittest`, Git.

---

### Task 1: Development Workflow Skill

**Files:**
- Create: `development-workflow/SKILL.md`
- Create: `tests/test_development_workflow_skill.py`
- Modify: `README.md`
- Modify: `README-zh.md`

- [x] **Step 1: Write the failing test**

```bash
python3 -m unittest tests/test_development_workflow_skill.py -v
```

Expected: fail because `development-workflow/SKILL.md` does not exist.

- [x] **Step 2: Write minimal implementation**

Create `development-workflow/SKILL.md` with frontmatter and a strict task loop:
plan with `superpowers:writing-plans`, write failing tests, verify RED, implement GREEN,
run `code-review-spec`, fix issues without confirmation, run `commit`, then continue.

- [x] **Step 3: Update installation documentation**

Add `development-workflow` to both README files and copy commands.

- [x] **Step 4: Verify tests pass**

```bash
python3 -m unittest tests/test_development_workflow_skill.py -v
```

Expected: all tests pass.

- [x] **Step 5: Review and commit**

Run the canonical `code-review-spec` checklist against changed files, fix all applicable
issues, then commit with a detailed Chinese Conventional Commit message.
