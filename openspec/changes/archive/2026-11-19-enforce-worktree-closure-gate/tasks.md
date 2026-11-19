# Tasks

## 1. Workflow 门禁与文档同步

- [x] 1.1 更新 canonical `development-workflow` skill、仓库镜像和 `DEVELOPMENT_WORKFLOW_GUIDE.md`，补充提交前门禁、合并后 ancestry 校验、worktree clean 检查、禁止强制清理和失败保留现场规则；验证三份文档包含一致的关键条件、命令和流程顺序，并通过 `openspec validate enforce-worktree-closure-gate --strict`。

### Task 1.1 boundary and dispatch plan

- 模块代理名：`workflow-guardrail-docs`。
- 负责范围：只修改 workflow 规则文档和本 change 的 OpenSpec 任务状态；维护提交、集成、清理三个阶段的可审计门禁。
- 允许文件：`/Users/lvdaxianer/.agents/skills/development-workflow/SKILL.md`、`development-workflow/SKILL.md`、`DEVELOPMENT_WORKFLOW_GUIDE.md`、本 change 目录下的 OpenSpec 文件。
- 明确不在范围：不修改业务代码；不新增 Git hook、服务端保护、依赖或公共 API；不删除现有 worktree。
- 依赖：已批准的设计、`git-branch-worktree-convention` 的 `SOURCE_BRANCH` 与 ancestry 规则、`commit` 和 `project-hygiene` 的既有门禁。
- 聚焦验证：`openspec validate enforce-worktree-closure-gate --strict`；关键词/条件一致性检查；`git diff --check`。
- broader verification：仓库文档全文搜索、三份文档的门禁条款对照、最终 `git diff --stat` 与状态检查。
- 交接证据：变更文件列表、OpenSpec 严格校验输出、门禁关键词检查输出、review 和最终审计记录。
- 执行方式：直接执行，不派发子 agent；理由是本任务只有三个强耦合文档与一个 OpenSpec 变更，委派会增加同步漂移风险，且没有可安全拆分的写入边界。

## Workflow follow-up

- 任务审计、任务标记和原子提交必须在本任务门禁通过后执行。
- 提交后读取 `.source_branch`，合并回 `master`，完成 ancestry 和 clean 检查，再清理任务 worktree 与 branch。
- 最终审计通过后归档 `enforce-worktree-closure-gate`，并确认 `master` 包含归档结果。
