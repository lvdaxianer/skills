## 1. 模块 API 文档门禁

- [x] 1.1 在 REST API skill、development workflow、详细流程指南及中英文 README
  中实现并验证对外 Controller 的模块级 API 文档门禁、`apis/<module>.md` 归档规则和
  可视化流程图更新。

### Task boundary and dispatch plan

| 项目 | 内容 |
| --- | --- |
| Agent | 主代理：模块 API 文档门禁 |
| 责任 | 保持 workflow、REST API skill、模板、流程指南和双语 README 的契约一致 |
| 允许文件 | `development-workflow/SKILL.md`、`rest-api-documentation/`、`DEVELOPMENT_WORKFLOW_GUIDE.md`、`README.md`、`README.en.md`、本 OpenSpec change |
| 不在范围 | 运行时代码、OpenAPI 生成、现有项目 API 文档迁移、基线文件变更 |
| 依赖 | 已批准设计、已验证 OpenSpec 计划、现有 REST API skill 和详细流程指南 |
| 并发/委派 | 不委派：该任务的术语、步骤编号、流程节点和 README 关系图紧密耦合；当前无可用的隔离 subagent 工具，拆分会增加跨文件不一致风险 |
| TDD | 不适用：变更仅为 Markdown skill 与说明文档，无运行时代码；用严格 OpenSpec、skill validator、Mermaid/结构检索和人工审查验证 |
