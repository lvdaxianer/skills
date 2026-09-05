# Workflow Documentation Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository's workflow documentation accurately describe the
current per-task branch, worktree, review, commit, merge, and cleanup loop.

**Architecture:** `development-workflow/SKILL.md` remains the source for the
25-step gate order, while `git-branch-worktree-convention/SKILL.md` remains
the source for branch lifecycle details. The two README files provide concise,
parallel entry-point summaries; the Chinese guide supplies the detailed flow,
dependency guidance, and FAQ.

**Tech Stack:** Markdown, Mermaid, Git.

---

### Task 1: Synchronize Workflow Documentation

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `DEVELOPMENT_WORKFLOW_GUIDE.md`
- Test: Markdown links, heading anchors, and workflow-term consistency checks

- [x] **Step 1: Record the current workflow contract before editing**

Run:

```bash
sed -n '263,390p' development-workflow/SKILL.md
sed -n '1,330p' git-branch-worktree-convention/SKILL.md
```

Expected: the sources specify 25 ordered steps, one confirmed integration
branch, a task branch/worktree per independently verifiable task, and a merge
back into recorded `SOURCE_BRANCH` before the next task.

- [x] **Step 2: Make the narrow README summaries agree with that contract**

Update the Chinese and English workflow summaries, the relationship diagram,
and contribution guidance to mention task-boundary/dispatch, main-agent review,
per-task integration and cleanup, final audit/archive, and verification on the
confirmed integration branch. Correct obsolete local/external skill counts.

- [x] **Step 3: Make the detailed guide's flow and support content agree**

Replace the condensed Mermaid diagram with the actual staged lifecycle, add
the task-integration transition after each task commit, and remove claims that
all work merges to `main` only at the end. Update dependency, usage, FAQ,
best-practice, and responsibility-boundary text that refers to stale counts or
the old final-merge model.

- [x] **Step 4: Run focused verification**

Run:

```bash
rg -n 'merge 回 main|merge back to main|本仓库 6 个|本仓库 7 个（内置）|外部 4 套|6 local skills' README.md README.en.md DEVELOPMENT_WORKFLOW_GUIDE.md
```

Expected: no outdated workflow model or dependency-count claims are returned.

- [x] **Step 5: Run broader documentation verification**

Run:

```bash
rg -n '^#{1,3} ' README.md README.en.md DEVELOPMENT_WORKFLOW_GUIDE.md
npx --yes markdown-link-check README.md README.en.md DEVELOPMENT_WORKFLOW_GUIDE.md
```

Expected: all internal links and anchors resolve; headings remain valid; the
command reports no broken links.

- [x] **Step 6: Audit and mark complete**

Compare the diff with both authoritative skill files and the approved design,
correct any drift, then mark this task complete in this plan.

- [x] **Step 7: Commit**

Commit the three documentation files and plan with a full Chinese Conventional
Commit message.
