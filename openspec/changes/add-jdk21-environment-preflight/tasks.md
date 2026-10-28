# Tasks

## 1. 环境预检与安装流程

- [x] 1.1 新增 `references/environment-preflight.md`，定义 JDK 21 检查、平台包管理器安装、当前项目环境设置、失败停止和安全边界；通过文档结构与命令覆盖检查
- [ ] 1.2 更新 `design-to-development/SKILL.md`、workflow 和 quality-gates，在 brainstorming 前增加 JDK 21 预检门禁；通过引用、顺序和硬门禁检查

## 2. 评测与最终验证

- [ ] 2.1 更新 `design-to-development/evals/evals.json`，增加 JDK 已存在、JDK 缺失自动安装和安装失败停止场景；通过 JSON schema 和覆盖检查
- [ ] 2.2 执行 OpenSpec 严格校验、Skill 结构检查、引用检查、评测 JSON 校验、敏感文件检查和最终审查；通过后归档变更

## Workflow follow-up

- 完成任务级审计、原子提交、合并回 `SOURCE_BRANCH=master`，并归档本次 OpenSpec change。
