# Design

## Context

现有 workflow 已定义 task branch 提交、合并和清理的顺序，但提交前条件与清理前条件分散在多个章节，缺少一个明确的失败阻断点。任务 worktree 的本地 `.source_branch` 是唯一可靠的合并目标记录；清理动作必须在该记录、当前 Git 状态和 ancestry 证据一致时执行。

## Goals / Non-Goals

**Goals:**

- 在 workflow 中提供可重复执行的提交前门禁和关闭前门禁。
- 让 `features/✅...` 与 `fixes/✅...` task branch 的生命周期可审计。
- 明确失败时保留现场，成功时安全删除 task worktree 和 branch。
- 同步 canonical skill、仓库镜像和使用指南的规则、流程图、步骤编号和示例。

**Non-Goals:**

- 不新增 Git hook、服务端分支保护或强制推送策略。
- 不改变已有 branch 命名、`SOURCE_BRANCH` 记录格式或提交消息规范。
- 不替代测试、review、OpenSpec、project-hygiene 等既有门禁。

## Decisions

### 1. 采用两段式硬门禁

提交门禁验证任务是否具备提交资格；关闭门禁验证任务是否具备清理资格。每段门禁都列出失败条件和必须保留的现场，避免把“可以提交”和“可以删除 worktree”混为同一状态。

备选方案是只保留最终清理检查，但它无法阻止未完成任务提前产生提交，因此不采用。

### 2. 关闭门禁使用固定 Git 检查块

关闭前必须读取 `.source_branch`，确认 integration branch clean，确认 task worktree clean，并用 `git merge-base --is-ancestor "$TASK_BRANCH" "$SOURCE_BRANCH"` 验证任务分支已进入集成分支。仅在全部命令成功后允许执行非强制的 `git worktree remove` 与 `git branch -d`。

备选方案是新增脚本或 hook。它们在 skill 跨项目安装、权限和 hook 生命周期方面成本更高，且可能被绕过；本 change 先将固定检查块设为 workflow 的唯一规范入口。

### 3. 强制禁止绕过清理门禁

workflow 明确禁止 `git worktree remove --force`、`git branch -D` 及等价操作用于任务收尾。若有未提交改动、未合并、验证缺失或冲突，必须报告具体条件并保留 worktree/branch。

### 4. 同步三份说明

canonical `SKILL.md` 是运行时权威；仓库 `development-workflow/SKILL.md` 是可提交镜像；`DEVELOPMENT_WORKFLOW_GUIDE.md` 是用户可读指南。三者必须描述同一门禁顺序和清理条件，避免安装源与仓库文档漂移。

## Risks / Trade-offs

- [风险] 规则型门禁依赖执行者调用标准检查块，无法阻止用户直接运行原生 Git 命令 → [缓解] 明确所有绕过操作为 workflow 违规，并在状态格式、步骤表和清理示例中重复关键阻断条件。
- [风险] 在有意保留未合并实验分支时，不能自动清理 → [缓解] 先保留现场；如确需放弃，必须由用户明确提出独立的清理请求，再按目标确认和可恢复操作处理。
- [风险] canonical 文件与仓库镜像后续再次漂移 → [缓解] 本次将门禁条款、流程图和指南同步修改，并在验证阶段执行关键词与差异检查。

## Migration Plan

1. 更新 canonical skill、仓库镜像和指南中的提交、合并、清理门禁。
2. 用 OpenSpec 严格校验、文档关键词检查和 diff 审查确认三份说明一致。
3. 旧任务不自动删除；新任务从该规则发布后开始执行。已有未关闭 worktree 继续按新关闭门禁检查。
