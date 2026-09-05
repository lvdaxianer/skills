---
name: git-branch-worktree-convention
description: Project-level task branch and worktree convention. Use whenever creating or validating task branches, selecting a change integration branch, recording SOURCE_BRANCH, merging a completed task, or protecting the original checkout.
---

# Git Branch and Worktree Convention

Use one confirmed integration branch for a change, then create every task
branch from that branch and merge every completed task back into it. `dev` is
only an example: the integration branch is the branch the user confirms when
the first task begins.

This skill defines branch names, source-branch traceability, and integration
rules. `using-git-worktrees` owns safe worktree creation mechanics;
`development-workflow` owns when each gate occurs; and `commit` owns commit
message format.

## Model

```text
confirmed integration branch (for example: dev)
  ├─ task 1 branch -> verify -> merge back into dev
  ├─ task 2 branch -> verify -> merge back into dev
  └─ task N branch -> verify -> merge back into dev

end state: remain on dev, which contains every merged task
```

There is no parent/change branch. Do not create a branch merely to aggregate
task branches. The integration branch is the only aggregation point.

## Authority and Conflicts

| Concern | Authoritative source |
| --- | --- |
| Task branch name, integration source, `SOURCE_BRANCH`, merge target, original-checkout protection | This skill |
| Worktree creation safety and baseline verification | `using-git-worktrees` |
| Workflow timing, task gates, and final integration | `development-workflow` |
| Commit message format | `commit` |
| Force-push, reset, hook skipping, and destructive Git operations | Project/global Git rules |

Follow the more specific authority when instructions overlap. Do not duplicate
or weaken another skill's safety rules.

## Integration Branch

### Select it once

At the first task of a change:

1. Read the checked-out branch with `git branch --show-current`.
2. Stop if Git reports a detached `HEAD`.
3. Ask the user: `当前分支 <branch>，是否以它作为本次 change 的集成分支？`
4. After confirmation, record that exact branch name as `INTEGRATION_BRANCH`
   in the current change/task context.

The confirmed branch can be `dev`, `release/*`, `main`, or another valid
working branch. Never assume that a branch literally named `dev` exists.

### Keep it fixed for the change

- Every task branch for the change starts from `INTEGRATION_BRANCH`.
- Every completed task merges back into that same branch.
- Before starting the next task, switch to `INTEGRATION_BRANCH`; it now
  includes the preceding task's merge.
- Do not replace the integration branch because the operator happens to switch
  branches mid-change. Ask before changing it; changing it starts a new
  integration boundary.

## Task Branch Naming

Use one task branch per OpenSpec task or other independently verifiable task.

```text
features/✅<change-id>-T<task-num>--<task中文名>
fixes/✅<change-id>-T<task-num>--<子问题中文名>
```

Examples:

```text
features/✅CHG-001-T1--支付模块改造
features/✅CHG-001-T2--库存扣减逻辑
fixes/✅BUG-055-T1--添加乐观锁
```

Rules:

- `✅` (U+2705) identifies a task branch.
- `<change-id>` is uppercase letters, a hyphen, then digits, such as
  `CHG-001` or `BUG-055`.
- `-T<task-num>` identifies the task number.
- The Chinese task description contains at least three Chinese characters and
  has no spaces or shell-special characters.
- All tasks belonging to the same change use the same `<change-id>` and the
  same `INTEGRATION_BRANCH`.
- Do not use `📦` parent branches.

Validation regex:

```regex
^(features|fixes)/✅[A-Z]+-[0-9]+-T[0-9]+--[一-龥]{3,}$
```

Before creating a task branch, confirm it matches the regex and that no local
branch or worktree already uses the name.

## Worktree and Source Recording

All task worktrees live under:

```text
.claude/worktrees/<full-task-branch-name>/
```

The worktree root must be ignored by Git before creation. Use the safety and
directory checks from `using-git-worktrees` before running the commands below.

Record the merge target before any task-owned work begins. In the task
worktree, create `.source_branch` containing exactly:

```text
SOURCE_BRANCH=<INTEGRATION_BRANCH>
```

For example, a task created from `dev` contains:

```text
SOURCE_BRANCH=dev
```

`.source_branch` is local worktree metadata. It tells the completion step the
only branch that may receive this task's merge.

## Create a Task Branch and Worktree

`git worktree add -b` creates and checks out the branch in one operation. It
is the worktree-safe equivalent of `git checkout -b <task-branch>`.

Run these commands from the clean checkout of the confirmed integration branch:

```bash
INTEGRATION_BRANCH=$(git branch --show-current)
TASK_BRANCH='features/✅CHG-001-T1--支付模块改造'
TASK_WORKTREE=".claude/worktrees/$TASK_BRANCH"

# Confirm INTEGRATION_BRANCH with the user before the first task.
test -n "$INTEGRATION_BRANCH" || { echo 'detached HEAD'; exit 1; }
test -z "$(git status --porcelain)" || { echo 'integration checkout is dirty'; exit 1; }
git show-ref --verify "refs/heads/$INTEGRATION_BRANCH"
if git show-ref --verify --quiet "refs/heads/$TASK_BRANCH"; then
  echo "task branch already exists: $TASK_BRANCH"
  exit 1
fi
test ! -e "$TASK_WORKTREE" || exit 1

git worktree add "$TASK_WORKTREE" -b "$TASK_BRANCH" "$INTEGRATION_BRANCH"
```

Then, before the first edit or commit, write the source record in the new
worktree:

```bash
TASK_GIT_DIR=$(git -C "$TASK_WORKTREE" rev-parse --git-dir)
mkdir -p "$TASK_GIT_DIR/info"
printf '.source_branch\n' >> "$TASK_GIT_DIR/info/exclude"
printf 'SOURCE_BRANCH=%s\n' "$INTEGRATION_BRANCH" > "$TASK_WORKTREE/.source_branch"
```

Verify the setup:

```bash
git worktree list --porcelain
git -C "$TASK_WORKTREE" branch --show-current
git -C "$TASK_WORKTREE" status --short
cat "$TASK_WORKTREE/.source_branch"
```

All task edits, tests, and commits occur inside `TASK_WORKTREE`.

## Merge a Completed Task

Merge only after the task's required tests, review, and workflow gates pass.
Read `.source_branch` from the task worktree instead of guessing the target.

```bash
TASK_WORKTREE='.claude/worktrees/features/✅CHG-001-T1--支付模块改造'
TASK_BRANCH=$(git -C "$TASK_WORKTREE" branch --show-current)
INTEGRATION_BRANCH=$(cut -d= -f2 "$TASK_WORKTREE/.source_branch")

# Use the clean checkout/worktree where the integration branch is checked out.
git switch "$INTEGRATION_BRANCH"
test -z "$(git status --porcelain)" || { echo 'integration checkout is dirty'; exit 1; }
git show-ref --verify "refs/heads/$INTEGRATION_BRANCH"
git merge --no-ff "$TASK_BRANCH"
git merge-base --is-ancestor "$TASK_BRANCH" "$INTEGRATION_BRANCH"
```

If the integration checkout has unrelated uncommitted changes or the merge
conflicts, stop. Preserve those changes and resolve the issue before claiming
the task integrated.

Only after the ancestry check succeeds and the task worktree is clean:

```bash
test -z "$(git -C "$TASK_WORKTREE" status --porcelain)" || {
  echo 'task worktree is dirty'
  exit 1
}
git worktree remove "$TASK_WORKTREE"
git branch -d "$TASK_BRANCH"
git switch "$INTEGRATION_BRANCH"
```

The final `git switch` is intentional: after every task, and after the last
task, remain on the confirmed integration branch.

## Start the Next Task

Before creating task `T2`:

1. Return to `INTEGRATION_BRANCH`.
2. Verify it is clean and contains the previous task merge.
3. Create `T2` from `INTEGRATION_BRANCH`, not from `T1` and not from an older
   commit.
4. Record the same `SOURCE_BRANCH=<INTEGRATION_BRANCH>` in `T2`'s worktree.
5. Repeat the normal test, review, merge, and cleanup gates.

This makes the dependency chain explicit:

```text
integration branch at start
  -> task T1 -> merge into integration branch
  -> task T2 starts from updated integration branch
  -> merge into integration branch
```

## Original Checkout Protection

Once a task worktree exists, the checkout where the integration branch is
checked out is read-only for that task.

Allowed there:

- Read code and Git history.
- Inspect status, logs, diffs, and blame.
- Switch to the integration branch for the verified merge and cleanup.

Forbidden there:

- Edit task-owned files.
- Create task commits.
- Run task tests that write build, coverage, or log artifacts.
- Change task-related dependencies or configuration.

All task implementation and verification runs in the task worktree. Confirm
the current directory before task work:

```bash
git rev-parse --path-format=relative --git-common-dir 2>/dev/null | grep -q worktrees
```

An exit code of `0` means the command runs from a linked worktree.

## Validation Checklists

### Before the first task

- [ ] The current checkout is on a named branch, not detached `HEAD`.
- [ ] The user confirmed the current branch as `INTEGRATION_BRANCH`.
- [ ] The integration checkout is clean.
- [ ] The task branch name matches the task regex.
- [ ] No existing branch or worktree has the task name.
- [ ] `.claude/worktrees/` is ignored.

### Before each task

- [ ] Current branch is the confirmed `INTEGRATION_BRANCH`.
- [ ] The integration checkout is clean.
- [ ] The task branch is created from the current `INTEGRATION_BRANCH` tip.
- [ ] The task worktree records `SOURCE_BRANCH=<INTEGRATION_BRANCH>`.
- [ ] Edits, tests, and commits run only in the task worktree.

### Before task cleanup

- [ ] The task's focused and broader verification gates passed.
- [ ] The task worktree is clean.
- [ ] `.source_branch` identifies an existing integration branch.
- [ ] The integration checkout is clean before merging.
- [ ] `git merge --no-ff <task-branch>` completed successfully.
- [ ] `git merge-base --is-ancestor <task-branch> <integration-branch>` succeeds.
- [ ] The task worktree and branch are removed only after the successful merge.
- [ ] The final checkout is `INTEGRATION_BRANCH`.

## Non-Negotiable Rules

- Use a task branch and dedicated worktree for every independently verifiable
  implementation task.
- Confirm the integration branch once at the beginning of a change; do not
  silently change it later.
- Create every task branch from the confirmed integration branch.
- Merge every task only into the `SOURCE_BRANCH` recorded in its worktree.
- Start each later task from the integration branch after prior task merges.
- Do not create or use parent aggregation branches.
- Do not edit task files or create task commits from the original checkout.
- Do not delete a task worktree or branch until its merge is verified by the
  ancestry check.
