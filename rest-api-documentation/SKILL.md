---
name: rest-api-documentation
description: "Use when creating, completing, standardizing, or reviewing REST API documentation. Requires clear endpoint purpose plus complete method, URL, params, requestBody, headers, cookies, response values, errors, and runnable examples."
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

## Required Workflow

### 1. Establish evidence

先读取并交叉核对路由/controller、DTO/Schema、校验规则、认证中间件、测试、配置和用户提供的接口资料。记录接口的调用方、业务场景、前置条件、权限边界、数据影响和环境要求。

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

## Reference

具体输出时读取 [references/api-document-template.md](references/api-document-template.md)。它包含可复制的 Markdown 模板、字段表要求、错误响应结构和完整示例。
