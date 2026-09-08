---
name: rest-api-documentation
description: "Use when creating, completing, standardizing, or reviewing REST API documentation. Requires business-module documents plus clear endpoint purpose, method, URL, params, requestBody, headers, cookies, response values, errors, and runnable examples."
---

# REST API Documentation

用于编写、补全、统一或审查 REST API 接口文档。目标是让调用方只依靠文档就能理解接口用途、构造请求、处理响应和定位常见错误。

## When to Use

触发于以下请求：

- 编写新接口、补充已有接口文档或根据代码反推接口契约
- 将接口说明整理成 Markdown、API 手册或联调文档
- 审查接口文档是否缺少参数、请求头、Cookie、响应值或实例
- 统一一组 REST API 的字段说明、错误结构和示例格式

不负责生成 OpenAPI 文件；如果用户明确要求 OpenAPI/Swagger，应遵循对应格式，同时保留本 skill 要求的契约完整性。

## Module Documentation Rules

对外 Controller/API 路由的文档按业务模块维护，不按 Controller 或单个接口拆分：

- 文档根目录必须是目标项目仓库根目录下的 `apis/`。
- 每个业务模块使用一个 Markdown 文件：`apis/<module>.md`。例如订单相关的
  Controller 和路由统一写入 `apis/orders.md`。
- 模块文档顶部必须说明模块职责、覆盖的 Controller/路由和文档范围；每个接口在该
  文件内使用独立端点章节。
- 新增或修改同一模块的多个对外接口时，更新同一个模块文档。不得创建
  `apis/create-order.md`、`apis/get-order.md` 一类的一接口一文档，也不得让同一模块
  分散在多个文档中。
- 每个对外 Controller 必须在所属模块文档中有对应的端点章节。路由归属无法从项目
  结构、领域命名或用户资料确认时，写明“待确认”并在交付前解决，不能随意归类。
- 模块和端点命名应遵循项目既有约定；没有约定时使用稳定、可读的小写连字符文件名。

## Required Workflow

### 1. Establish evidence

先读取并交叉核对路由/controller、DTO/Schema、校验规则、认证中间件、测试、配置和用户提供的接口资料。记录接口的调用方、业务场景、前置条件、权限边界、数据影响和环境要求。

对于对外 Controller/API 路由，还要先列出“Controller/route → 业务模块 →
`apis/<module>.md`”映射，确认模块文件覆盖每个对外 Controller。使用
[api-document-template.md](references/api-document-template.md) 的模块文档布局；不要为每个端点复制一份完整文件。

不要按 REST 惯例猜测字段、状态码、Cookie 或认证方式。无法确认的内容写成“待确认：<需要确认的问题>”，不得用看似合理的默认值替代。

### 2. Describe the request

使用 [api-document-template.md](references/api-document-template.md) 的模板，逐项说明：

- HTTP 方法和完整 URL（包括 base URL、版本和路径占位符）
- `param`：路径参数、查询参数、表单参数和其他 URL 参数，明确参数位置
- `requestBody`：媒体类型、编码、JSON/XML/表单结构、字段类型、必填性、约束、默认值、枚举和示例
- Request Header：名称、是否必填、类型/格式、用途、示例和缺失时行为
- Request Cookie：名称、是否必填、用途、作用域/有效期（已知时）和示例
- 认证、幂等键、Content-Type、Accept、分页、排序、筛选和时间格式

即使某类参数不适用，也要写“不适用”，避免读者误以为遗漏。

### 3. Describe the response

按状态码分别说明成功和失败结果。每个响应至少包含状态码及含义、响应 header、响应 cookie、响应体媒体类型、完整示例、字段表和调用方处理建议。区分 HTTP 状态码、业务错误码和错误消息，不能只写“返回成功/失败”。

典型失败分支按实际实现覆盖参数校验、未认证、无权限、资源不存在、冲突、限流、业务规则拒绝和服务端错误；不存在的分支标记“不适用”，未知分支标记“待确认”。

### 4. Add runnable examples

至少提供一个与字段表完全一致的 `curl` 示例和对应 JSON 响应示例；有鉴权或 Cookie 时，在示例中展示 header/cookie 的位置，但值必须是占位符。涉及路径参数、查询参数和请求体时，示例必须同时体现它们。

### 5. Self-check before delivery

交付前逐项检查：

- 是否说明接口干什么、谁调用、前置条件和权限
- Method、完整 URL、所有 `param`、`requestBody`、Request/Response Header 和 Cookie 是否分开说明
- 是否说明字段类型、必填性、格式/范围、默认值、枚举、示例和业务含义
- 是否列出成功和实际失败响应，包括状态码、错误码、响应体、header 和 cookie
- `curl`、HTTP 和 JSON 示例是否与表格和实现一致
- 是否明确分页、排序、时间、幂等、缓存、限流和安全规则的适用性
- 是否对所有未知信息写“待确认”，并脱敏 token、Cookie、个人数据和内部信息
- 对外 Controller 是否全部映射到一个业务模块，且每个模块只维护一个
  `apis/<module>.md`
- 模块文档的 Controller/route 覆盖表是否包含本次涉及的每个对外 Controller，且每个
  端点章节是否包含完整请求、响应、错误和实例契约

## Reference

具体输出时读取 [references/api-document-template.md](references/api-document-template.md)。它包含可复制的 Markdown 模板、字段表要求、错误响应结构和完整示例。
