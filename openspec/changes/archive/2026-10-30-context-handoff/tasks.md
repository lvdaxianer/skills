# Tasks

## 1. Context handoff skill

- [x] 1.1 **Module-oriented agent:** `context-handoff`（由主 agent 直接执行；该变更是一个小型提示 skill，且 `SKILL.md`、evals 和双语 README 共享同一行为契约，拆分实现会增加漂移风险）。**责任：**实现 skill、eval 用例和文档登记；**允许文件：**`context-handoff/**`、`README.md`、`README.en.md`；**不在范围：**修改现有 skill 行为、引入运行时依赖、连接服务器或新增脚本；**依赖：**本变更 proposal/spec/design；**聚焦验证：**`openspec validate context-handoff --strict`、frontmatter/必需章节静态检查和 `evals/evals.json` JSON 解析；**更广验证：**README 引用检查、全仓库 diff 审查和三类场景的人工/模型评估；**交接证据：**新 skill 的路径、eval 用例、验证命令输出及 README 变更摘要。

## Workflow follow-up

- 在实现前完成 RED/GREEN 验证、计划一致性审计和适用的代码/文档审查。
- 任务审计通过后，将本任务标记完成并创建一个原子提交，随后合并回 `SOURCE_BRANCH=master`。
- 全部实现完成后执行 OpenSpec verify、最终审计和 OpenSpec archive，并确认 `master` 包含最终变更。
