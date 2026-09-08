## Why

现有 skill 集合缺少一套专门约束 REST API 文档完整性的规则，接口文档容易遗漏参数位置、请求头、Cookie、请求体或失败响应，导致调用方无法直接联调。现在补充该能力，使新写、补写和审查接口文档时都有统一的可执行标准。

## What Changes

- 新增 `rest-api-documentation` skill，自动指导 REST API 文档的收集、编写和自检。
- 新增可复制的 Markdown 接口文档模板，覆盖用途、请求契约、响应契约和完整实例。
- 明确路径参数、查询参数、表单参数、`requestBody`、header、cookie 和响应字段的说明要求。
- 增加认证、幂等、分页、错误响应、安全脱敏和未知信息标注规则。
- 在中文和英文 README 的 skill 目录与使用方式中登记新 skill。

## Capabilities

### New Capabilities

- `rest-api-documentation`: 为 REST API 接口文档提供完整字段规范、模板、实例和自检要求。

### Modified Capabilities

无。

## Impact

- 新增一个 skill 目录及其 `references` 辅助资料。
- 修改 `README.md` 和 `README.en.md` 的目录、skill 清单、安装、使用方式和目录结构说明。
- 新增 OpenSpec 变更资产和初始化生成的 Codex/Claude OpenSpec 指令文件。
- 不改变任何运行时 API、依赖或应用代码。
