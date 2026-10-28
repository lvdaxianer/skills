#!/usr/bin/env bash
# 测试脚本使用多个临时仓库，验证自动清理行为及其安全边界。
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
AUDIT_SCRIPT="$SCRIPT_DIR/../scripts/audit_task_closeout.sh"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/task-closeout-audit.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT

configure_repo() {
  local repo="$1"
  mkdir -p "$repo/.claude/worktrees/features" "$repo/.claude/worktrees/fixes"
  git init -q -b master "$repo"
  git -C "$repo" config user.name 'Task Closeout Test'
  git -C "$repo" config user.email 'task-closeout@example.invalid'
  git -C "$repo" commit --allow-empty -q -m '初始化测试仓库'
  printf '.claude/worktrees/\n' > "$repo/.gitignore"
  git -C "$repo" add .gitignore
  git -C "$repo" commit -q -m '忽略测试 worktree'
}

record_source() {
  local path="$1"
  printf 'SOURCE_BRANCH=master\n' > "$path/.source_branch"
  local worktree_git_dir
  worktree_git_dir="$(git -C "$path" rev-parse --git-dir)"
  mkdir -p "$worktree_git_dir/info"
  printf '.source_branch\n' >> "$worktree_git_dir/info/exclude"
}

create_merged_task() {
  local repo="$1" branch="$2" path="$3"
  git -C "$repo" worktree add -q -b "$branch" "$path" master
  record_source "$path"
  git -C "$path" commit --allow-empty -q -m "完成 $branch"
  git -C "$repo" merge --no-ff -q "$branch" -m "合并 $branch"
}

create_unmerged_task() {
  local repo="$1" branch="$2" path="$3"
  git -C "$repo" worktree add -q -b "$branch" "$path" master
  record_source "$path"
  git -C "$path" commit --allow-empty -q -m "完成 $branch"
}

# 合并且干净的任务必须直接清理 worktree 和本地分支。
clean_repo="$fixture/clean-repo"
configure_repo "$clean_repo"
clean_branch='features/✅TEST-001-T1--已合并任务'
clean_path="$clean_repo/.claude/worktrees/$clean_branch"
create_merged_task "$clean_repo" "$clean_branch" "$clean_path"
clean_report="$(cd "$clean_repo" && "$AUDIT_SCRIPT")"
case "$clean_report" in
  *"CLEANED"*) ;;
  *) echo "expected merged clean task to be cleaned" >&2; exit 1 ;;
esac
test ! -e "$clean_path"
! git -C "$clean_repo" show-ref --verify --quiet "refs/heads/$clean_branch"
case "$clean_report" in
  *"SUMMARY|merged=1|not_merged=0|unknown=0|merged_pending_cleanup=0|cleaned=1"*) ;;
  *) echo "expected cleaned task summary" >&2; exit 1 ;;
esac

# 合并但脏的任务必须保留，不能丢弃未提交改动。
dirty_branch='features/✅TEST-002-T1--合并但有改动'
dirty_path="$clean_repo/.claude/worktrees/$dirty_branch"
create_merged_task "$clean_repo" "$dirty_branch" "$dirty_path"
printf '未提交内容\n' > "$dirty_path/uncommitted.txt"
printf 'ignored content\n' > "$dirty_path/ignored.txt"
printf 'ignored.txt\n' >> "$clean_repo/.git/info/exclude"
dirty_report="$(cd "$clean_repo" && "$AUDIT_SCRIPT")"
case "$dirty_report" in
  *"SKIPPED_DIRTY"*) ;;
  *) echo "expected dirty merged task to be preserved" >&2; exit 1 ;;
esac
test -d "$dirty_path"
test -e "$dirty_path/uncommitted.txt"
test -e "$dirty_path/ignored.txt"
git -C "$clean_repo" show-ref --verify --quiet "refs/heads/$dirty_branch"

# worktree 被锁定时删除失败，不得级联删除分支。
locked_branch='features/✅TEST-003-T1--合并但被锁定'
locked_path="$clean_repo/.claude/worktrees/$locked_branch"
create_merged_task "$clean_repo" "$locked_branch" "$locked_path"
git -C "$clean_repo" worktree lock "$locked_path"
locked_report="$(cd "$clean_repo" && "$AUDIT_SCRIPT")"
case "$locked_report" in
  *"WORKTREE_REMOVE_FAILED"*) ;;
  *) echo "expected locked worktree removal failure" >&2; exit 1 ;;
esac
test -d "$locked_path"
git -C "$clean_repo" show-ref --verify --quiet "refs/heads/$locked_branch"
git -C "$clean_repo" worktree unlock "$locked_path"

# 未合并任务和未知证据任务都不得清理。
unmerged_branch='fixes/✅TEST-004-T1--未合并任务'
unmerged_path="$clean_repo/.claude/worktrees/$unmerged_branch"
create_unmerged_task "$clean_repo" "$unmerged_branch" "$unmerged_path"
unknown_branch='features/✅TEST-005-T1--缺少证据任务'
unknown_path="$clean_repo/.claude/worktrees/$unknown_branch"
git -C "$clean_repo" worktree add -q -b "$unknown_branch" "$unknown_path" master
unknown_report="$(cd "$clean_repo" && "$AUDIT_SCRIPT")"
case "$unknown_report" in
  *"NOT_MERGED"*) ;;
  *) echo "expected unmerged status" >&2; exit 1 ;;
esac
case "$unknown_report" in
  *"UNKNOWN"*) ;;
  *) echo "expected unknown status" >&2; exit 1 ;;
esac
test -d "$unmerged_path"
test -d "$unknown_path"
git -C "$clean_repo" show-ref --verify --quiet "refs/heads/$unmerged_branch"
git -C "$clean_repo" show-ref --verify --quiet "refs/heads/$unknown_branch"

# detached orphan worktree 不具备合并证据，必须保留并继续报告。
orphan_path="$clean_repo/.claude/worktrees/orphan-detached"
git -C "$clean_repo" worktree add --detach -q "$orphan_path" master
orphan_report="$(cd "$clean_repo" && "$AUDIT_SCRIPT")"
case "$orphan_report" in
  *"ORPHAN_WORKTREE"*) ;;
  *) echo "expected orphan worktree status" >&2; exit 1 ;;
esac
test -d "$orphan_path"

# 从 linked task worktree 调用时，当前 worktree 不应被脚本删除。
current_repo="$fixture/current-repo"
configure_repo "$current_repo"
current_branch='features/✅TEST-006-T1--当前任务'
current_path="$current_repo/.claude/worktrees/$current_branch"
create_merged_task "$current_repo" "$current_branch" "$current_path"
current_report="$(cd "$current_path" && "$AUDIT_SCRIPT")"
case "$current_report" in
  *"SKIPPED_CURRENT_WORKTREE"*) ;;
  *) echo "expected current worktree to be preserved" >&2; exit 1 ;;
esac
test -d "$current_path"
git -C "$current_repo" show-ref --verify --quiet "refs/heads/$current_branch"

# 没有任务记录时仍不能宣称历史任务已经完成。
empty_repo="$fixture/empty-repo"
configure_repo "$empty_repo"
empty_report="$(cd "$empty_repo" && "$AUDIT_SCRIPT")"
case "$empty_report" in
  *"NO_TASK_RECORDS"*) ;;
  *) echo "expected no-task-records status in empty repository" >&2; exit 1 ;;
esac

printf '%s\n' 'PASS: merged clean tasks are cleaned and unsafe states are preserved'
