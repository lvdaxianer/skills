# Task 1.1 Audit

## Scope

- 任务：同步 canonical workflow、仓库镜像和用户指南，增加提交前与 worktree closure 硬门禁。
- 允许范围：`/Users/lvdaxianer/.agents/skills/development-workflow/SKILL.md`、`development-workflow/SKILL.md`、`DEVELOPMENT_WORKFLOW_GUIDE.md`、本 change OpenSpec 文件。
- 越界检查：未修改业务代码、API、依赖、Git hook、服务端保护或现有 worktree。

## Acceptance Criteria

- [x] 提交前明确要求 RED/GREEN、验证、审计、review、OpenSpec 标记和泄密/产物检查。
- [x] 合并后明确要求 integration checkout clean、task worktree clean 和 `git merge-base --is-ancestor`。
- [x] 只有 closure gate 全部通过后才允许非强制 `git worktree remove` 与 `git branch -d`。
- [x] 明确禁止 `git worktree remove --force`、`git branch -D` 和等价绕过，并要求失败时保留现场。
- [x] canonical skill 与仓库镜像完全一致，用户指南同步覆盖规则、流程图、步骤表和命令示例。

## Verification Evidence

- RED：三份文档标题检查在实现前失败，输出 `RED: missing closure gate heading in /Users/lvdaxianer/.agents/skills/development-workflow/SKILL.md`。
- GREEN：三份文档均通过 closure 标题、ancestry 命令和强制删除禁止检查。
- `openspec validate enforce-worktree-closure-gate --strict`：通过。
- `diff -u /Users/lvdaxianer/.agents/skills/development-workflow/SKILL.md development-workflow/SKILL.md`：无差异。
- `git diff --check`：通过。
- 占位符扫描：无未解决占位符结果。
- 任务 worktree 状态：仅包含本任务的两份仓库文档修改和本 change OpenSpec 文件。

## Domain Review

- `code-review-spec`：不适用；本任务没有 source code 写入、修改、review 或格式化。
- `logging-boundaries`：不适用；没有生产日志变更。
- `backend-reliability-guidelines`：不适用；没有后端 API、服务、配置、并发或错误处理变更。
- `frontend-interaction-guidelines`：不适用；没有前端交互变更。
- `rest-api-documentation`：不适用；没有外部 Controller/API route 变更。
- `project-hygiene`：基线同步不适用；没有修改 `.gitignore`、`.gitattributes`、`.editorconfig`、`.env.example`，也没有新增工具或构建产物类型。提交门仍需执行泄密/产物检查。

## Review Result

通过。实现符合 proposal、spec、design 和 task boundary；无实现漂移、越界文件或未修复 review 问题。任务可进入 task mark-complete gate。
