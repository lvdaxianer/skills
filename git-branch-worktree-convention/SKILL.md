---
name: git-branch-worktree-convention
description: Project-level git branch naming and worktree path conventions - enforces emoji-prefixed parent/task branch hierarchy (📦 for parent change branches, ✅ for task branches), Chinese descriptions, SOURCE_BRANCH recording, and original-checkout write protection
---

# Git Branch and Worktree Convention

Project-local git conventions for branch naming, worktree placement, and
workspace isolation. This skill complements `using-git-worktrees` (worktree
creation mechanism) and `development-workflow` (process gates): it defines
**what branch names and paths** this project requires, not how to create
worktrees or when to branch.

## Skill Conflict Resolution (Meta-Rule)

This skill must not contradict `using-git-worktrees`, `development-workflow`,
`commit`, or git-workflow global rules. If a literal conflict appears:

| Domain | Authoritative skill |
|--------|---------------------|
| Branch naming format, worktree paths, SOURCE_BRANCH recording, original-checkout write protection | **this skill** |
| Worktree creation mechanism, directory selection, safety verification | `using-git-worktrees` |
| When to create worktree/branch (workflow gates) | `development-workflow` |
| Commit message format | `commit` |
| Git safety (force-push, reset, hook-skip, destructive ops) | git-workflow global rules |

When this skill's rules touch another domain, cite the authoritative skill
rather than duplicating its detail.

## Branch Naming Rules

### Parent branch (OpenSpec change level)

**Format**:
```
features/📦<change-id>--<change中文名>
fixes/📦<change-id>--<问题中文描述>
```

**Examples**:
```
features/📦CHG-001--订单系统重构
features/📦CHG-002--用户权限管理优化
fixes/📦BUG-055--库存扣减并发问题
```

**Rules**:
- Emoji prefix `📦` (U+1F4E6, "package") marks parent branch, making it
  visually distinct in `git branch` output
- `<change-id>` format: uppercase letters + hyphen + digits (e.g., `CHG-001`,
  `BUG-055`, `REFACTOR-012`)
- `--` (double hyphen) separates change-id from Chinese description
- Chinese description: ≥4 Chinese characters, meaningful, no spaces or shell
  special chars (`$`, `` ` ``, `|`, `;`, `&`, `(`, `)`)
- Parent branch is created from `main`/`master` when OpenSpec change starts

### Task branch (OpenSpec task level)

**Format**:
```
features/✅<change-id>-T<task-num>--<task中文名>
fixes/✅<change-id>-T<task-num>--<子问题中文名>
```

**Examples**:
```
features/✅CHG-001-T1--支付模块改造
features/✅CHG-001-T2--库存扣减逻辑
features/✅CHG-001-T3--订单状态机重构
fixes/✅BUG-055-T1--添加乐观锁
fixes/✅BUG-055-T2--补充并发测试
```

**Rules**:
- Emoji prefix `✅` (U+2705, "check mark button") marks task branch
- `<change-id>` matches parent branch's change-id
- `-T<task-num>`: single hyphen + `T` + task number (e.g., `-T1`, `-T2`, `-T10`)
- `--` (double hyphen) separates task-id from Chinese description
- Chinese description: ≥3 Chinese characters, meaningful
- Task branch is created from parent branch (not from `main`)

### Main/master branch

- Protected. Direct commits forbidden unless explicitly authorized by project lead.
- All work goes through feature/fix parent branches → code review → merge.

### Branch name validation regex

**Parent branch**:
```regex
^(features|fixes)/📦[A-Z]+-[0-9]+--[一-龥]{4,}$
```

**Task branch**:
```regex
^(features|fixes)/✅[A-Z]+-[0-9]+-T[0-9]+--[一-龥]{3,}$
```

Before creating a branch or worktree, validate:
1. Matches one of the two patterns above
2. No spaces, tabs, or shell special characters in any part
3. Emoji is the correct Unicode character (`📦` U+1F4E6 for parent, `✅` U+2705 for task)
4. Change-id matches existing parent branch when creating task branch

## Worktree Path Convention

### Worktree root directory

All task worktrees live under `.claude/worktrees/`:

```
.claude/worktrees/<full-branch-name>/
```

**Examples**:
```
.claude/worktrees/features/✅CHG-001-T1--支付模块改造/
.claude/worktrees/features/✅CHG-001-T2--库存扣减逻辑/
.claude/worktrees/fixes/✅BUG-055-T1--添加乐观锁/
```

**Rules**:
- Parent branches typically do NOT get worktrees (they exist only to collect
  merged task branches)
- Task branches MUST use worktrees (development-workflow enforces this at
  worktree-setup gate)
- Worktree directory name = full branch name (including emoji prefix)
- Worktree paths are never committed to git (`.claude/worktrees/` is in
  `.gitignore`)

### SOURCE_BRANCH recording

Before starting work in a task worktree, record the parent branch:

```bash
SOURCE_BRANCH=features/📦CHG-001--订单系统重构
echo "SOURCE_BRANCH=$SOURCE_BRANCH" > \
  .claude/worktrees/features/✅CHG-001-T1--支付模块改造/.source_branch
```

**Rules**:
- `.source_branch` file is written before first commit in worktree
- File format: single line `SOURCE_BRANCH=<parent-branch-name>`
- On task completion (before worktree removal), verify all worktree commits
  are reachable from SOURCE_BRANCH (via merge or rebase)
- If not reachable, block worktree removal and warn user

### Worktree lifecycle

**Creation** (handled by `using-git-worktrees` + this skill):
```bash
# 1. Validate parent branch exists
git show-ref --verify refs/heads/features/📦CHG-001--订单系统重构

# 2. Create task branch + worktree from parent
git worktree add \
  .claude/worktrees/features/✅CHG-001-T1--支付模块改造 \
  -b features/✅CHG-001-T1--支付模块改造 \
  features/📦CHG-001--订单系统重构

# 3. Record SOURCE_BRANCH
echo "SOURCE_BRANCH=features/📦CHG-001--订单系统重构" > \
  .claude/worktrees/features/✅CHG-001-T1--支付模块改造/.source_branch
```

**Removal** (development-workflow OpenSpec-archive gate):
```bash
# 1. Verify task branch merged to SOURCE_BRANCH
SOURCE_BRANCH=$(cat .claude/worktrees/features/✅CHG-001-T1--支付模块改造/.source_branch | cut -d= -f2)
git checkout "$SOURCE_BRANCH"
git merge --no-ff features/✅CHG-001-T1--支付模块改造

# 2. Remove worktree
git worktree remove .claude/worktrees/features/✅CHG-001-T1--支付模块改造

# 3. Delete task branch
git branch -d features/✅CHG-001-T1--支付模块改造

# 4. Clean up .source_branch file (already removed with worktree dir)
```

**Cleanup** (monthly maintenance):
```bash
# Prune stale worktree references
git worktree prune

# List unmerged branches
git branch --no-merged main | grep -E '✅|📦'
```

## Original Checkout Write Protection

When a task worktree is active:

### Original checkout (the directory where you ran `git worktree add`) is READ-ONLY for task files

**Allowed**:
- Read code: `cat`, `grep`, `find`, IDE file preview
- Git operations: `git log`, `git status`, `git diff`, `git blame`
- Non-task work: editing files unrelated to current task, checking out other branches for reference

**Forbidden**:
- Edit any file related to the current task
- Create commits for the current task
- Run tests that write task-related artifacts (build outputs, coverage reports, logs)
- Modify task-related configuration or dependencies

### Worktree is the WRITE zone

- All edits, commits, test runs, build artifacts for the current task go in
  the worktree
- Original checkout stays stable for:
  - Reference while working (read-only view of main or parent branch)
  - Parallel work on other tasks (different worktrees)
  - Code review and comparison

### Enforcement mechanisms

**development-workflow checks**:
- At worktree-setup gate: block if task-related files have uncommitted changes
  in original checkout
- At focused-test gate: require test commands to run inside worktree path
- At commit gate: verify commit author-date shows commits were created in
  worktree, not original checkout

**IDE/editor configuration** (recommended):
- Configure IDE to open worktree path when task starts
- Use IDE workspace files (`.vscode/`, `.idea/`) stored in worktree, not
  original checkout
- Set file watchers and formatters to target worktree paths

**Manual verification**:
```bash
# Check if current directory is inside a worktree
git rev-parse --path-format=relative --git-common-dir 2>/dev/null | grep -q worktrees
# Exit code 0 = inside worktree, 1 = original checkout
```

## Integration Points

### with `using-git-worktrees`

- `using-git-worktrees` provides: directory selection algorithm, safety
  verification (no uncommitted changes, no conflicting worktrees), `git worktree add` execution
- **this skill** provides: branch name format validation, worktree root path
  (`.claude/worktrees/`), SOURCE_BRANCH recording, task branch creation from
  parent branch

**Call sequence**:
1. `development-workflow` worktree-setup gate triggers worktree creation
2. `using-git-worktrees` selects directory and verifies safety
3. **this skill** validates branch name format, creates task branch from
   parent, records SOURCE_BRANCH
4. `using-git-worktrees` executes `git worktree add`

### with `development-workflow`

- `development-workflow` enforces: when to create parent branch (OpenSpec
  change start), when to create task worktree (RED gate), when to merge task
  branch back to parent (OpenSpec-archive gate), when to merge parent branch
  to main (source-branch integration gate)
- **this skill** enforces: branch naming format, worktree paths, SOURCE_BRANCH
  traceability

**Parent branch lifecycle**:
1. OpenSpec-new-change: user creates change → development-workflow prompts to
   create parent branch → this skill validates name format
2. Task loop: each task gets worktree + task branch from parent
3. OpenSpec-archive: task branch merges back to parent → this skill verifies
   SOURCE_BRANCH match
4. Source-branch integration: parent branch merges to main → development-workflow checks all tasks merged

**Task branch lifecycle**:
1. Worktree-setup gate: development-workflow requires isolated workspace →
   this skill creates task branch + worktree from parent
2. RED/GREEN/commit gates: all work happens in worktree
3. OpenSpec-archive gate: this skill merges task branch to parent, removes
   worktree, deletes task branch

### with `commit` skill

- This skill does NOT govern commit message format (delegated to `commit` skill)
- This skill only governs **which branch** commits land on (task branch, not
  main or parent branch directly)
- Commit message footer SHOULD carry `Refs: OpenSpec <change-name> task <task-id>`
  for traceability (governed by `commit` skill + development-workflow)

## Validation Checklist

### Before creating parent branch
- [ ] Branch name matches `(features|fixes)/📦<change-id>--<中文>{4,}` pattern
- [ ] Change-id format is uppercase letters + hyphen + digits
- [ ] Chinese description ≥4 characters, no spaces/special chars
- [ ] Emoji is `📦` (U+1F4E6), not a similar-looking character
- [ ] Parent branch is being created from `main`/`master`, not from another feature branch

### Before creating task worktree + branch
- [ ] Parent branch exists and matches `(features|fixes)/📦<change-id>--<中文>` pattern
- [ ] Task branch name matches `(features|fixes)/✅<change-id>-T<num>--<中文>{3,}` pattern
- [ ] Task change-id matches parent branch change-id
- [ ] Emoji is `✅` (U+2705), not a similar-looking character
- [ ] Worktree path is `.claude/worktrees/<full-task-branch-name>/`
- [ ] Original checkout has no uncommitted changes in task-related files
- [ ] No existing worktree or branch with the same name

### Before removing task worktree
- [ ] Task branch has been merged to SOURCE_BRANCH parent branch
- [ ] All task commits are reachable from SOURCE_BRANCH
- [ ] No uncommitted changes in worktree
- [ ] `.source_branch` file exists and points to valid parent branch

### Before merging parent branch to main
- [ ] All task branches for this change have been merged to parent branch
- [ ] No active worktrees reference this parent branch
- [ ] Parent branch has passed code-review-spec gate
- [ ] Parent branch build and tests pass

## Non-Negotiable Rules

- Feature/fix work MUST use task branches with worktrees. Direct commits to
  parent branches or main for non-trivial tasks are noncompliant.
- Branch names MUST use emoji prefixes (`📦` for parent, `✅` for task) and
  Chinese descriptions. English branch names, abbreviation-only names, or
  issue-ID-only names are noncompliant.
- Task branches MUST be created from parent branches, not from main. Creating
  `features/✅CHG-001-T1--<task>` directly from main bypasses the parent
  branch aggregation point and is noncompliant.
- SOURCE_BRANCH MUST be recorded before worktree work starts and verified
  before worktree removal. Losing traceability to the parent branch is
  noncompliant.
- Original checkout MUST NOT be used for task implementation when a worktree
  exists for that task. Writing task code outside the worktree breaks
  isolation and is noncompliant.

## Troubleshooting

### Emoji not displaying correctly in terminal

If emoji shows as `?` or `<U+1F4E6>` in your terminal:

- Use a modern terminal emulator: iTerm2 (macOS), Windows Terminal (Windows),
  or any terminal with full Unicode support
- Install a font with emoji support: Noto Color Emoji, Apple Color Emoji, or
  Segoe UI Emoji
- If terminal emoji support is impossible, consider switching to
  `parent-`/`task-` prefix scheme (see skill revision history for alternative)

### Copy-paste branch name loses emoji

If copying branch names from terminal strips emoji:

```bash
# Use git branch output directly in scripts
BRANCH=$(git branch --show-current)

# Or store branch names in shell variables
PARENT_BRANCH="features/📦CHG-001--订单系统重构"
```

### Git commands fail with emoji in branch name

Git fully supports Unicode in branch names since 2006. If you encounter
issues:

- Verify git version: `git --version` (should be ≥2.x)
- Check locale: `echo $LANG` (should be UTF-8, e.g., `en_US.UTF-8`,
  `zh_CN.UTF-8`)
- If on Windows, ensure using Git Bash or WSL, not legacy Command Prompt

### Multiple tasks need to be worked on in parallel

Each task gets its own worktree + task branch:

```bash
# Task 1 worktree
.claude/worktrees/features/✅CHG-001-T1--支付模块/

# Task 2 worktree (parallel work)
.claude/worktrees/features/✅CHG-001-T2--库存扣减/

# Both task branches merge to same parent when complete
features/📦CHG-001--订单系统重构
```

Switch between tasks by `cd` to different worktree directories. Each worktree
is an independent workspace with its own checkout, staging area, and HEAD.
