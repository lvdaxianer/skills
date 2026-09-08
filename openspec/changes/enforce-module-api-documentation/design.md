## Context

现有 REST API skill 已确保端点级文档包含用途、请求、响应和实例，但开发流程只
调用后端可靠性和代码审查等领域规范，未把 API 文档作为 Controller 变更的通过
条件。详细工作流指南的文字流程、步骤表和 Mermaid 图也没有表达该依赖。

本次为跨 skill 的文档契约变更，不涉及运行时 API、依赖或数据模型。

## Goals / Non-Goals

**Goals:**

- 让对外 Controller/API 路由变更自动触发 REST API 文档 authority。
- 将文档存储策略固定为目标项目根目录下按业务模块分组的 `apis/<module>.md`。
- 让任务边界、验证、审计和 review 都可检查 Controller-to-module 的文档覆盖。
- 使工作流详细指南和 Mermaid 图准确展示新门禁。

**Non-Goals:**

- 不生成或迁移 OpenAPI/Swagger 定义。
- 不要求没有对外路由变更的任务创建 `apis/` 目录。
- 不规定 Controller 框架、模块命名语言或单个文件的端点数量上限。

## Decisions

### 在实现后、综合验证前设置专用门禁

选择在实现完成后且 broader verification、审计和 review 前运行 REST API 文档
门禁。此时路由、DTO、认证和错误契约已可作为文档证据，同时仍能在提交前发现
文档遗漏。

备选方案是在规划阶段只提醒文档要求，或仅在 review 阶段检查。前者无法验证实际
覆盖，后者发现问题过晚，均不满足强制要求。

### 以业务模块作为文档边界

要求每个受影响业务模块对应一个 `apis/<module>.md`，并在其中按端点建立章节。
同一模块内的多个 Controller 可以共用文件；Controller 与端点的对应关系由文档
概览或覆盖清单显式记录。

备选方案是每个 Controller 或端点一个文件。该方案会分散订单等业务的调用契约，
增加链接维护和查询成本，因此不采用。

### 在工作流中引用权威 skill，而不复制端点字段规则

`development-workflow` 只规定何时加载 `rest-api-documentation`、何时验证覆盖和
何处记录证据；字段表、示例、Header、Cookie 和响应契约仍由 REST API skill 及其
模板定义。这保持“流程编排”和“领域标准”的职责边界。

## Risks / Trade-offs

- [模块归属不明确] → 在任务边界列出 route-to-module 映射；无法判断时先向用户或
  项目约定确认，而不任意新建文档。
- [文档与实现漂移] → 要求以 Controller、DTO、认证、测试和配置为证据，并在
  broader verification 和 review 中复核。
- [额外文档维护成本] → 只在对外 Controller/API 路由有变化时触发，内部接口和
  无关任务明确记录为不适用。

## Migration Plan

1. 更新 workflow、REST API skill、模板、详细指南和 README。
2. 通过 OpenSpec 严格校验、skill validator、结构检索和人工 review 验证。
3. 合并后，后续符合触发条件的任务将按新门禁维护 `apis/<module>.md`；无需对现有
   无变更的项目批量补写文档。

回滚方式：恢复本次文档与 skill 修改即可，不影响运行时产物或已存在的 API 文档。

## Open Questions

无。模块目录、强制触发范围和流程图更新均已由用户确认。
