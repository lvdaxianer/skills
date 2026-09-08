## Context

本仓库是面向 Claude Code/Codex 的独立 skill 集合，每个 skill 通过目录中的 `SKILL.md` 被发现。接口文档规则包含较多字段细节和示例，全部放在入口文件会降低可读性，因此采用入口规则与 reference 模板分离的方式。

## Goals / Non-Goals

### Goals

- 让文档作者能从接口实现或用户资料中整理出完整的请求/响应契约。
- 让调用方可以仅依靠文档构造请求并解析成功、业务失败和系统失败响应。
- 用具体模板和实例约束字段位置、类型、必填性、限制和示例。

### Non-Goals

- 不生成或校验 OpenAPI 文件。
- 不绑定 Spring、Express、FastAPI 等具体框架。
- 不虚构不存在的认证、参数或响应字段。

## Architecture

新增两个互相配合的文件：

1. `rest-api-documentation/SKILL.md`：入口层。定义触发场景、资料优先级、编写流程、强制覆盖项、输出格式和 reference 路由。
2. `rest-api-documentation/references/api-document-template.md`：资料层。提供接口文档模板、请求/响应字段表、错误响应表、curl/HTTP/JSON 实例和适用的通用约定。

README 文件只做索引和安装/使用说明，不复制完整规范，避免多个来源漂移。

## Decisions

### 入口规则与详细模板分离

选择 `SKILL.md` 加 `references/api-document-template.md`，而不是把所有内容写入一个入口文件。入口只保留触发条件、必需行为和路由信息，详细字段表和实例放入 reference，便于自动发现、按需读取和后续维护。替代方案是单文件 skill，优点是复制方便，但会让入口过长并重复模板内容。

### 默认使用 Markdown、curl 和 JSON

选择与仓库现有文档习惯一致的 Markdown，并用 `curl` 和 JSON 表达完整联调实例。这样不依赖具体后端框架；OpenAPI 生成器作为替代方案不纳入本次范围，因为它需要额外的 schema 维护和运行时工具。

### 证据优先，未知项显式待确认

要求模型优先读取路由、DTO/Schema、测试和配置，不能依据 REST 惯例猜测字段。该决策牺牲了部分输出的即时完整度，但能避免文档与实际接口契约不一致。

## Workflow

触发后，模型先读取入口规则，并在需要生成或审查具体接口文档时读取模板 reference。模型按用途、请求、响应、示例、自检顺序工作：

```text
接口资料 -> 用途与权限 -> 请求契约 -> 响应契约 -> 完整实例 -> 覆盖检查
```

资料缺失时保留“待确认”标记并列出问题；示例数据使用占位值并脱敏。

## Error Handling and Safety

- 将 HTTP 状态码、业务错误码和错误消息分开记录。
- 对认证、授权、参数校验、资源不存在、冲突、限流和服务端错误分别给出适用说明。
- header、cookie 中的 token、session、CSRF 等敏感值只用占位符。
- 不把日志、配置或真实用户数据直接复制到公开文档。

## Risks / Trade-offs

- [接口资料不完整] -> 使用“待确认”标记和问题清单，避免把猜测写成契约。
- [README 与实际目录漂移] -> 在验证阶段检查目录树、安装清单和 skill 表格中的名称一致性。
- [示例泄露敏感信息] -> 示例只允许使用占位 token、Cookie 和个人数据，并在评审阶段执行敏感文件与示例扫描。
- [模板过度约束特殊接口] -> 对不适用的参数类别明确写“不适用”，保留 WebSocket、文件上传等非典型场景的媒体类型和编码说明空间。

## Migration Plan

本变更只新增 skill 和文档索引，不涉及运行时部署或数据迁移。合并后，安装该仓库 skill 的项目即可通过自动发现使用新目录；回滚时删除新 skill 目录和 README 对应索引即可，不影响既有 skill。

## Open Questions

无阻塞性问题。具体接口文档使用时，接口的实际认证方式、字段约束和错误码仍必须从目标项目资料中确认。

## Verification

- 使用 `quick_validate.py rest-api-documentation` 校验 skill 结构和 frontmatter。
- 使用 `git diff --check` 校验所有 Markdown 差异。
- 检查 README 中文/英文的清单、安装示例和目录树都包含新 skill。
- 搜索模板，确认方法、URL、param、requestBody、响应值、header、cookie、用途和实例均有明确章节。
