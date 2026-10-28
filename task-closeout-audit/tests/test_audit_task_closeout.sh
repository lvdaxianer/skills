#!/usr/bin/env bash
# 测试脚本使用临时仓库，避免触碰当前项目的 Git 状态。
set -euo pipefail

# 解析测试目录，定位待验证的 bundled audit script。
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
AUDIT_SCRIPT="$SCRIPT_DIR/../scripts/audit_task_closeout.sh"
# 所有 fixture 资源都位于 mktemp 创建的隔离目录。
fixture="$(mktemp -d "${TMPDIR:-/tmp}/task-closeout-audit.XXXXXX")"
# 测试结束后只删除本次创建的临时目录。
trap 'rm -rf "$fixture"' EXIT

# 创建带 master 集成分支的最小 Git 仓库。
repo="$fixture/repo"
mkdir -p "$repo"
git init -q -b master "$repo"
git -C "$repo" config user.name 'Task Closeout Test'
git -C "$repo" config user.email 'task-closeout@example.invalid'
git -C "$repo" commit --allow-empty -q -m '初始化测试仓库'
mkdir -p "$repo/.claude/worktrees"
printf '.claude/worktrees/\n' > "$repo/.gitignore"
git -C "$repo" add .gitignore
git -C "$repo" commit -q -m '忽略测试 worktree'

# 建立已合并但资源仍存在的 canonical task。
merged_branch='features/✅TEST-001-T1--已合并任务'
merged_path="$repo/.claude/worktrees/$merged_branch"
git -C "$repo" worktree add -q -b "$merged_branch" "$merged_path" master
printf 'SOURCE_BRANCH=master\n' > "$merged_path/.source_branch"
mkdir -p "$(git -C "$merged_path" rev-parse --git-dir)/info"
printf '.source_branch\n' >> "$(git -C "$merged_path" rev-parse --git-dir)/info/exclude"
git -C "$merged_path" commit --allow-empty -q -m '完成已合并任务'
git -C "$repo" merge --no-ff -q "$merged_branch" -m '合并已合并任务'

# 建立未合并且资源仍存在的 canonical task。
unmerged_branch='fixes/✅TEST-002-T1--未合并任务'
unmerged_path="$repo/.claude/worktrees/$unmerged_branch"
git -C "$repo" worktree add -q -b "$unmerged_branch" "$unmerged_path" master
printf 'SOURCE_BRANCH=master\n' > "$unmerged_path/.source_branch"
mkdir -p "$(git -C "$unmerged_path" rev-parse --git-dir)/info"
printf '.source_branch\n' >> "$(git -C "$unmerged_path" rev-parse --git-dir)/info/exclude"
git -C "$unmerged_path" commit --allow-empty -q -m '完成未合并任务'

# 建立 source branch 不存在的任务，验证不可证明时保持 UNKNOWN。
missing_source_branch='features/✅TEST-003-T1--源分支缺失'
missing_source_path="$repo/.claude/worktrees/$missing_source_branch"
git -C "$repo" worktree add -q -b "$missing_source_branch" "$missing_source_path" master
printf 'SOURCE_BRANCH=missing-source\n' > "$missing_source_path/.source_branch"
mkdir -p "$(git -C "$missing_source_path" rev-parse --git-dir)/info"
printf '.source_branch\n' >> "$(git -C "$missing_source_path" rev-parse --git-dir)/info/exclude"

# 建立历史命名且没有 source metadata 的本地分支。
legacy_branch='features/legacy-task-without-metadata'
git -C "$repo" branch "$legacy_branch"

# 建立没有 branch ref 的 detached worktree，验证孤立资源识别。
orphan_path="$repo/.claude/worktrees/orphan-detached"
git -C "$repo" worktree add --detach -q "$orphan_path" master

# 保存 Git 状态，验证审计脚本严格只读。
before_branches="$(git -C "$repo" for-each-ref --format='%(refname:short)' refs/heads)"
before_worktrees="$(git -C "$repo" worktree list --porcelain)"
# 从 linked worktree 调用，覆盖 common-dir 根目录解析场景。
report="$(cd "$merged_path" && "$AUDIT_SCRIPT")"

# 每个关键状态都必须出现在同一份审计报告中。
case "$report" in
  *"MERGED"*) ;;
  *) echo "expected merged status in report" >&2; exit 1 ;;
esac
case "$report" in
  *"NOT_MERGED"*) ;;
  *) echo "expected not-merged status in report" >&2; exit 1 ;;
esac
case "$report" in
  *"UNKNOWN"*) ;;
  *) echo "expected unknown status in report" >&2; exit 1 ;;
esac
case "$report" in
  *"ORPHAN_WORKTREE"*) ;;
  *) echo "expected orphan worktree status in report" >&2; exit 1 ;;
esac
case "$report" in
  *"legacy-task-without-metadata"*) ;;
  *) echo "expected historical branch in report" >&2; exit 1 ;;
esac

# 运行前后 Git refs、worktree 注册表和状态必须完全一致。
test "$before_branches" = "$(git -C "$repo" for-each-ref --format='%(refname:short)' refs/heads)"
test "$before_worktrees" = "$(git -C "$repo" worktree list --porcelain)"
test -z "$(git -C "$repo" status --porcelain)"

# 单独验证没有任何任务记录时不会声称历史任务已完成。
empty_repo="$fixture/empty-repo"
git init -q -b master "$empty_repo"
git -C "$empty_repo" config user.name 'Task Closeout Test'
git -C "$empty_repo" config user.email 'task-closeout@example.invalid'
git -C "$empty_repo" commit --allow-empty -q -m '初始化空测试仓库'
empty_report="$(cd "$empty_repo" && "$AUDIT_SCRIPT")"
case "$empty_report" in
  *"NO_TASK_RECORDS"*) ;;
  *) echo "expected no-task-records status in empty repository" >&2; exit 1 ;;
esac

printf '%s\n' 'PASS: audit reports mixed task states without mutating the repository'
