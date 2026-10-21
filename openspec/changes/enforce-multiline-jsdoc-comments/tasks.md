# Tasks

## 1. 注释规范与模板

- [x] 1.1 更新 `code-review-spec/SKILL.md`、`code-review-spec/spec.md`、`code-review-spec/references/method-comments.md` 和 `docs/superpowers/specs/2026-10-21-enforce-multiline-jsdoc-comments-design.md`，将 JSDoc 多行布局、标签独占行和禁止单行格式写成强制规则，并同步审查清单与 TypeScript/Vue 示例；验证 `rg` 能找到完整规则、示例均为多行且不存在单行模板。任务边界：module-oriented agent `comment-format-spec`; 允许文件仅限上述四个文档文件及本 change 资产；out-of-scope 为业务代码、格式化工具配置和其他 skill；依赖为 proposal/spec/design 已完成；focused verification 为 `rg -n "单行|多行|独占一行|JSDoc" code-review-spec`; broader verification 为 `openspec validate enforce-multiline-jsdoc-comments --strict` 与全量 diff 审查；handoff evidence 为变更文件列表、规则行号、验证命令输出。

## Workflow follow-up

- 在任务 gate 通过后完成 OpenSpec 校验、规范审查、任务勾选和原子提交。
- 完成最终审计并归档 OpenSpec change，再将任务分支合并回 `master`。
