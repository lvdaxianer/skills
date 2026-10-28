# Tasks

## 1. Skill 内容与参考资料

- [x] 1.1 创建 `development-ready-demo/SKILL.md`，定义输入模式、固定技术架构、brainstorming 门禁、TDD 流程、领域 Skill 编排、交付格式和冲突处理；通过 Markdown 结构检查确认 frontmatter、触发描述和所有必需阶段均存在
- [ ] 1.2 创建 `development-ready-demo/references/` 下的架构、工作流、交互状态、API/数据契约和质量门禁资料；通过链接检查确认主 Skill 的每个参考路径存在且资料不重复领域 Skill 的权威细则

## 2. 评测与验证

- [ ] 2.1 创建 `development-ready-demo/evals/evals.json`，覆盖文字需求输入、设计图输入、前后端复用边界和 TDD/质量门禁；通过 JSON 解析和字段检查确认每个评测用例具备 prompt、expected_output 和 expectations
- [ ] 2.2 执行 OpenSpec 严格校验、Skill 结构检查、链接检查、评测 JSON 校验和内容审查；确认规格要求、设计决策、任务清单与实际文件一致后，输出完整验证证据

## Workflow follow-up

- 按项目要求完成代码审查、任务级审计、原子提交、合并回 `SOURCE_BRANCH=master`，并在所有任务完成后归档 OpenSpec change。
