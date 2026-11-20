# Tasks

## 1. 傻瓜式部署交付契约

- [x] 1.1 更新 `service-deploy/SKILL.md`，新增部署方式选择、零基础 preflight、客户目录确认、包版本、一键部署/运维/诊断/回滚和部署手册门禁；新增部署包规范、部署手册规范、模式检测矩阵和包清单 schema；实现并测试包契约校验入口，补充 VM/Docker/Kubernetes 缺失条件、端口冲突、无版本包和敏感文件场景的 skill eval；验证 `openspec validate service-deployment-foolproof-delivery --strict`、schema/脚本/文档检查和现有 service-deploy evals 均通过。

## Workflow follow-up

- 完成实现后执行主代理计划一致性审计、`code-review-spec`、项目卫生检查和 per-task audit。
- 通过审计后标记本任务完成，使用中文 Conventional Commit 提交并合并回 `master`。
- 完成最终验收后归档 OpenSpec change，并验证集成分支包含全部变更。
