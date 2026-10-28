#!/usr/bin/env bash
# 使用严格模式，避免未初始化变量和隐藏命令失败。
set -euo pipefail

# 通过 Git common dir 定位主仓库，确保从任意 linked worktree 调用时
# 仍然扫描同一个仓库的全部分支和 worktree。
git_common_dir="$(git rev-parse --git-common-dir 2>/dev/null)" || {
  # 当前目录不是 Git 仓库时，只输出错误并返回非零状态。
  printf '%s\n' 'ERROR|not inside a Git repository' >&2
  exit 2
}
# Git 可能返回相对的 common dir，需要先转换为绝对路径。
if [[ "$git_common_dir" != /* ]]; then
  # cd 只用于解析路径，不会改变用户当前 shell 的目录。
  git_common_dir="$(CDPATH= cd -- "$git_common_dir" && pwd -P)"
fi
# common dir 的父目录就是非 bare 仓库的主目录。
repo_root="$(dirname -- "$git_common_dir")"

# 任务 worktree 的约定目录，用于识别孤立资源。
task_root="$repo_root/.claude/worktrees"
# 分别保存 worktree 路径和它们对应的分支。
worktree_paths=()
worktree_branches=()
# 解析 porcelain 输出时使用的当前记录。
current_path=''
current_branch=''

# 将当前解析到的 worktree 记录追加到数组。
flush_worktree() {
  # 空记录表示 porcelain 输出中的分隔行，不应被纳入清单。
  if [ -n "$current_path" ]; then
    worktree_paths+=("$current_path")
    worktree_branches+=("$current_branch")
  fi
}

# 使用 Git porcelain 格式读取所有注册的 worktree。
while IFS= read -r line || [ -n "$line" ]; do
  # 每条 worktree 记录以 worktree 行开始。
  case "$line" in
    worktree\ *)
      # 开始新记录前先保存上一条记录。
      flush_worktree
      current_path="${line#worktree }"
      current_branch=''
      ;;
    branch\ refs/heads/*)
      # 只记录本地分支引用，detached worktree 保持空分支名。
      current_branch="${line#branch refs/heads/}"
      ;;
    '')
      # 空行结束当前记录。
      flush_worktree
      current_path=''
      current_branch=''
      ;;
  esac
done < <(git -C "$repo_root" worktree list --porcelain)
# porcelain 输出末尾可能没有空行，因此需要显式刷新最后一条记录。
flush_worktree

# 只发现约定命名空间下的本地任务分支，兼容历史命名。
task_branches=()
while IFS= read -r branch || [ -n "$branch" ]; do
  # Git 不应返回空分支名，但保留保护条件避免生成空记录。
  [ -n "$branch" ] && task_branches+=("$branch")
done < <(git -C "$repo_root" for-each-ref --format='%(refname:short)' refs/heads/features refs/heads/fixes)

# 判断一个 worktree 分支是否属于已发现的任务分支。
has_task_branch() {
  # 调用方传入一个分支名，函数只做内存比较，不执行 Git 写操作。
  local candidate="$1"
  local branch
  # set -u 下空数组不能直接展开，空清单必然表示未匹配。
  if [ "${#task_branches[@]}" -eq 0 ]; then
    return 1
  fi
  for branch in "${task_branches[@]}"; do
    # 找到精确匹配时立即返回成功。
    [ "$branch" = "$candidate" ] && return 0
  done
  # 遍历结束仍未匹配，说明它是孤立或非任务 worktree。
  return 1
}

# 查找某个任务分支对应的注册 worktree 路径。
worktree_path_for_branch() {
  # 分支名来自 Git refs，路径结果来自 porcelain 清单。
  local wanted="$1"
  local i
  for i in "${!worktree_branches[@]}"; do
    # 数组索引相同，保证路径与分支一一对应。
    if [ "${worktree_branches[$i]}" = "$wanted" ]; then
      printf '%s\n' "${worktree_paths[$i]}"
      return 0
    fi
  done
  # 没有注册 worktree 时返回失败，由调用方报告 ABSENT。
  return 1
}

# 从 task worktree 的本地 metadata 读取合并目标。
read_source_branch() {
  # 只接受精确的 SOURCE_BRANCH 键，忽略其他本地辅助信息。
  local path="$1"
  local key value
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # source branch 是合并证据的前提，不能用当前分支隐式替代。
    if [ "$key" = 'SOURCE_BRANCH' ]; then
      printf '%s\n' "$value"
      return 0
    fi
  done < "$path/.source_branch"
  # 文件存在但没有有效键时仍然视为 metadata 缺失。
  return 1
}

# 输出固定标题，方便人工阅读和后续自动化解析。
printf '%s\n' 'Task closeout audit (read-only)'
printf '%s\n' "Repository: $repo_root"
printf '%s\n' 'TASK|branch|merge|branch_state|worktree_state|dirty|source|name_check|path'

# 汇总计数只反映当前可发现的本地记录。
merged_count=0
unmerged_count=0
unknown_count=0
pending_cleanup_count=0
orphan_count=0

# 逐个任务分支收集合并、资源和 metadata 证据。
if [ "${#task_branches[@]}" -gt 0 ]; then
  for branch in "${task_branches[@]}"; do
    # 当前分支来自本地 refs，因此 branch_state 必然是 PRESENT。
    branch_state='PRESENT'
    path=''
    if path="$(worktree_path_for_branch "$branch")"; then
      # 注册记录存在，但目录仍需单独检查。
      worktree_state='PRESENT'
      if [ -d "$path" ]; then
        # dirty 状态只读检查，不会刷新或修改 worktree。
        if [ -n "$(git -C "$path" status --porcelain 2>/dev/null)" ]; then
          dirty='UNCOMMITTED'
        else
          dirty='CLEAN'
        fi
      else
        dirty='UNKNOWN'
      fi
    else
      # 分支存在但没有注册 worktree，记录为 ABSENT 而不是 UNKNOWN。
      worktree_state='ABSENT'
      dirty='N/A'
    fi

    # 默认使用 UNKNOWN，只有完整 ancestry 证据才能覆盖它。
    source=''
    merge_state='UNKNOWN'
    if [ -n "$path" ] && [ -f "$path/.source_branch" ]; then
      source="$(read_source_branch "$path" || true)"
    fi

    # 缺少 source metadata 时不能推断合并结果。
    if [ -z "$source" ]; then
      merge_reason='missing-source-metadata'
    # source branch 不存在时， ancestry 检查没有可信目标。
    elif ! git -C "$repo_root" show-ref --verify --quiet "refs/heads/$source"; then
      merge_reason='source-branch-missing'
    # ancestor 检查通过才报告 MERGED。
    elif git -C "$repo_root" merge-base --is-ancestor "$branch" "$source"; then
      merge_state='MERGED'
      merge_reason='ancestor-check-passed'
      merged_count=$((merged_count + 1))
    else
      # source branch 存在但未包含 task tip，明确报告 NOT_MERGED。
      merge_state='NOT_MERGED'
      merge_reason='ancestor-check-failed'
      unmerged_count=$((unmerged_count + 1))
    fi

    # 未知状态单独计数，避免被归入已合并或未合并。
    if [ "$merge_state" = 'UNKNOWN' ]; then
      unknown_count=$((unknown_count + 1))
    fi
    # 当前分支 refs 仍存在，因此已合并任务仍需清理 branch 资源。
    if [ "$merge_state" = 'MERGED' ] && { [ "$branch_state" = 'PRESENT' ] || [ "$worktree_state" = 'PRESENT' ]; }; then
      pending_cleanup_count=$((pending_cleanup_count + 1))
    fi

    # 最新命名要求包含 emoji、任务序号和中文描述；历史名仍保留在报告中。
    if [[ "$branch" == *'✅'* && "$branch" == *'-T'* && "$branch" == *'--'* ]]; then
      name_check='CANONICAL'
    else
      name_check='WARNING_HISTORICAL_NAME'
    fi

    printf 'TASK|%s|%s|%s|%s|%s|%s|%s|%s|%s\n' \
      "$branch" "$merge_state" "$branch_state" "$worktree_state" "$dirty" \
      "${source:-N/A}" "$name_check" "${path:-N/A}"
    printf '  evidence: %s (%s)\n' "$merge_reason" "$branch"
  done
fi

# 检查任务目录下没有对应本地 task branch 的 registered worktree。
for i in "${!worktree_paths[@]}"; do
  path="${worktree_paths[$i]}"
  branch="${worktree_branches[$i]}"
  case "$path" in
    "$task_root"/*)
      # detached worktree 没有分支，属于孤立资源。
      if [ -z "$branch" ]; then
        orphan_count=$((orphan_count + 1))
        printf 'ORPHAN_WORKTREE|path=%s|reason=DETACHED\n' "$path"
      # 非任务命名空间的分支也不应被静默忽略。
      elif ! has_task_branch "$branch"; then
        orphan_count=$((orphan_count + 1))
        printf 'ORPHAN_WORKTREE|path=%s|branch=%s|reason=NON_TASK_BRANCH\n' "$path" "$branch"
      fi
      ;;
  esac
done

# 没有任何记录时明确说明“不可发现”，不宣称历史任务已完成。
if [ "${#task_branches[@]}" -eq 0 ] && [ "$orphan_count" -eq 0 ]; then
  printf '%s\n' 'NO_TASK_RECORDS|No discoverable task branches or task worktrees; historical completion is not inferred.'
fi

# 输出汇总并声明本次没有执行清理动作。
printf '%s\n' 'SUMMARY|merged='"$merged_count"'|not_merged='"$unmerged_count"'|unknown='"$unknown_count"'|merged_pending_cleanup='"$pending_cleanup_count"'|orphan_worktrees='"$orphan_count"
printf '%s\n' 'No cleanup action was executed.'
