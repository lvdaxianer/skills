---
name: task-closeout-audit
description: "仅在用户显式调用 /task-closeout-audit 时使用：审计当前 Git 仓库中的任务分支和 worktree，依据合并证据自动清理安全资源，并始终用中文回答。保留未合并、未知、脏、锁定、超出范围和孤立资源。"
compatibility: Requires Git and a Bash-compatible shell; no network or external package is needed.
---

# 任务收尾审计

仅在用户显式调用 `/task-closeout-audit` 时使用。它会回答任务是否合并、
临时分支是否仍存在、worktree 是否仍存在，并对证据充分且安全的资源自动
完成清理。

## 用户可见输出语言（强制）

- 最终回答必须全部使用中文：标题、表头、状态解释、清理结果、告警、汇总
  和限制说明都不得使用英文报告模板。
- `TASK|...`、`ORPHAN_WORKTREE|...`、`SUMMARY|...` 等机器记录只作为内部
  证据解析，不要原样复制到用户报告中。
- 分支名、worktree 路径、source branch 名称和必要的命令保持原样，因为它们
  是 Git 事实；除这些事实外，不要保留英文状态词或英文说明。

## 状态中文映射

| 内部状态 | 用户可见中文 |
|---|---|
| `MERGED` | 已合并 |
| `NOT_MERGED` | 未合并 |
| `UNKNOWN` | 未知（证据不足） |
| `PRESENT` / `ABSENT` | 存在 / 不存在 |
| `CLEAN` / `UNCOMMITTED` | 干净 / 有未提交修改 |
| `CLEANED` | 已清理 |
| `SKIPPED_DIRTY` | 已跳过：存在未提交修改 |
| `SKIPPED_CURRENT_WORKTREE` | 已跳过：当前正在使用的 worktree |
| 其他 `SKIPPED_*` | 已跳过：按实际原因用中文说明 |
| `WORKTREE_REMOVE_FAILED` | worktree 删除失败 |
| `BRANCH_DELETE_FAILED` | 分支删除失败 |
| `ORPHAN_WORKTREE` | 孤立 worktree |
| `WARNING_HISTORICAL_NAME` | 历史命名警告 |

## 清理安全边界

- 只有当可读的 `.source_branch` 指向现有本地 source branch，且
  `git merge-base --is-ancestor <task-branch> <source-branch>` 成功时，才
  报告“已合并”。
- 对已确认合并的任务，不再询问确认：删除 `.claude/worktrees/` 下干净、
  非当前 worktree，然后用 `git branch -d` 删除本地任务分支。
- 只有在 worktree 没有用户修改、仅剩 Skill 自己的 `.source_branch` 元数据
  时，脚本才可使用 `git worktree remove --force`；不会强制删除脏或锁定的
  worktree。
- 保留未合并、未知、脏、锁定、当前、路径缺失、超出约定目录和孤立资源。
  worktree 删除失败时，不得继续删除关联分支。
- 不执行合并、切换分支、重置文件、清理 worktree 注册表、删除远程分支，
  也不能根据本地记录缺失推断历史上已经成功完成。

## 执行步骤

1. 确认当前目录位于目标 Git 仓库内。
2. 运行 Skill 目录中的脚本：

   ```bash
   bash <skill-root>/scripts/audit_task_closeout.sh
   ```

3. 读取每一条 `TASK|...` 和 `ORPHAN_WORKTREE|...` 记录，不得只总结当前
   任务或第一条记录。
4. 根据 `evidence:`、`cleanup:` 和 `SUMMARY|...` 记录生成中文报告；将所有
   内部状态按上面的映射翻译。
5. 如果脚本报错，展示中文错误说明并停止，不得自行追加破坏性清理。

## 中文报告规则

必须提供简洁的中文表格或等价摘要，包含以下信息：

| 任务分支 | 合并证据 | 分支 | Worktree | 修改状态 | 来源分支 | 清理结果 | 告警 |
|---|---|---|---|---|---|---|---|
| 分支名 | 已合并/未合并/未知 | 存在/不存在 | 存在/不存在 | 干净/有未提交修改 | source branch 或不可用 | 已清理/已跳过/失败及中文原因 | 命名、孤立或元数据告警 |

报告结尾必须用中文给出：

- 已合并、未合并、未知、已清理、已跳过、失败和孤立 worktree 的数量；
- 所有未解决或被跳过的具体项目；
- 哪些清理动作实际执行成功；
- 删除后的本地记录不能证明历史上曾经合并完成这一限制。

`NO_TASK_RECORDS` 应翻译为“当前没有发现可审计的任务记录；不能据此证明
历史任务都已合并并清理”。

## 内部资源

- `scripts/audit_task_closeout.sh`：确定性的 Git 审计和安全自动清理脚本。
- `tests/test_audit_task_closeout.sh`：覆盖已清理、脏、锁定、未合并、未知、
  当前和孤立状态的临时仓库回归测试。
- `evals/evals.json`：显式调用、安全边界和中文输出评测提示。
