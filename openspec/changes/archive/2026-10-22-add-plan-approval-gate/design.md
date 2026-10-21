# Design

## Context

`development-workflow/SKILL.md` 已经定义 brainstorming、OpenSpec、worktree、TDD、审计和集成门禁，但当前顺序没有把“用户确认计划”作为独立的阻塞状态。该文件同时需要用流程图表达完整生命周期，避免文字规则与执行顺序漂移。

## Goals / Non-Goals

**Goals:**

- 在 brainstorming 后增加唯一的用户计划确认点。
- 明确确认材料、明确批准语义、拒绝/修改后的回退路径，以及计划实质变化时的重新确认。
- 让 Mandatory Task Loop、Stage Boundaries、Gate Rules、Required Status Format 和流程图使用同一顺序。
- 让本地 AI 工具目录不再被当前仓库远程追踪，同时保留本地目录可恢复使用。

**Non-Goals:**

- 不改变 TDD、审计、代码评审或 OpenSpec 的既有门禁语义。
- 不修改现有 frontend guideline 用户改动。
- 不删除用户本机 `~/.claude` 或 `~/.codex` 安装目录。

## Decisions

### 1. 将计划确认放在 worktree 和 OpenSpec 之前

推荐把“展示计划并等待明确批准”放在 brainstorming 之后。这样在用户未批准时，不会创建分支、worktree、OpenSpec 文件或任务实现文件。把确认放在 OpenSpec 之后会让计划文件先落盘，无法满足“确认后才能开始”的要求。

### 2. 使用明确批准，而不是沉默或泛泛肯定

规则要求用户明确表达批准；继续讨论、提出修改、沉默或仅表示理解都不算通过。用户要求修改时回到计划确认阶段。OpenSpec 计划是批准计划的持久化版本，若与批准内容发生实质差异，必须重新确认。

### 3. 使用 Mermaid 流程图表达状态转移

在 skill 中加入 Mermaid `flowchart TD`，显式表示“批准?/继续讨论”“任务是否还有剩余”“每任务审计是否通过”等循环和阻塞分支。相比仅列步骤，流程图更适合表达回退路径和最终归档路径。

### 4. 只从当前仓库移除已追踪的工具目录

在当前项目根新增 `.gitignore` 托管块，忽略 `.agents/`、`.claude/` 和 `.codex/`；同时从 Git index 和远程历史的下一次提交中移除当前项目已追踪的两个目录。不会触碰用户本机安装目录，也不会把恢复后的本地副本重新加入提交。

## Risks / Trade-offs

- [Risk] 现有用户修改可能在清理目录时被误删 → 在任务开始前用可恢复备份和 stash 保存，并只在任务 worktree 中操作；完成集成后恢复未相关改动。
- [Risk] `.claude/` 和 `.codex/` 目前含有已追踪共享文件 → 先确认当前项目没有需要继续远程共享的文件；本次用户已明确要求从远程移除，恢复副本只作为本地忽略文件保留。
- [Risk] 文字流程与流程图未来再次漂移 → 将新门禁同时加入 Stage Boundaries、Mandatory Task Loop、Gate Rules、Required Status Format 和流程图，并用文本检查验证关键节点。

## Migration Plan

1. 在任务 worktree 中更新 skill 和 `.gitignore`，删除当前仓库已追踪的 `.claude/`、`.codex/` 内容。
2. 运行 OpenSpec 严格校验、结构化文本检查和 Git secret/artifact 检查。
3. 提交任务并合并回 `master`。
4. 恢复原 checkout 中被暂存的用户改动和本地工具目录副本；确认这些内容仍不出现在待提交列表中。
