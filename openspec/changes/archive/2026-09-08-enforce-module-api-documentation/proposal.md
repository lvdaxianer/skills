## Why

`rest-api-documentation` 已定义单个 REST 接口的完整契约，但
`development-workflow` 尚未在对外 Controller 变更时强制执行该规范。这样会使
对外接口缺少文档，或形成按接口分散的文档，增加调用方发现和维护成本。

## What Changes

- 在 `development-workflow` 中把新增或修改对外 Controller/API 路由定义为
  `rest-api-documentation` 的强制触发条件。
- 增加 REST API 文档门禁：按业务模块在目标项目根目录的
  `apis/<module>.md` 创建或更新文档，并验证每个受影响的对外 Controller 已被
  覆盖。
- 明确模块文档包含多个端点章节，禁止为每个端点单独创建文件。
- 更新 REST API skill 的模块分组规则和模板，并把该门禁加入工作流详细文字、
  Mermaid 流程图、步骤表、README 中英文说明和关系图。

## Capabilities

### New Capabilities

- `module-api-documentation-gate`: 在对外 Controller/API 路由变更时强制完成并
  验证按业务模块归档的 REST API 文档。

### Modified Capabilities

- 无。仓库尚无已同步到 `openspec/specs/` 的同名能力规范。

## Impact

- `development-workflow/SKILL.md`
- `rest-api-documentation/SKILL.md`
- `rest-api-documentation/references/api-document-template.md`
- `DEVELOPMENT_WORKFLOW_GUIDE.md`
- `README.md`
- `README.en.md`
