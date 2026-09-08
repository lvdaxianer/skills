# REST API 接口文档 Skill 设计

## 目标

新增一个 `rest-api-documentation` skill，用于在创建、补充或审查 REST API 接口文档时，稳定地产出可执行、可联调、信息完整的中文 Markdown 文档。

skill 的重点不是规定某个框架或 OpenAPI 工具，而是确保调用方能回答：接口做什么、如何调用、需要传什么、会返回什么，以及异常时如何处理。

## 组织方式

采用入口文件加辅助资料的结构：

- `rest-api-documentation/SKILL.md`：定义触发条件、工作目标、信息核对顺序、强制字段和输出要求；保持短小，便于自动加载。
- `rest-api-documentation/references/api-document-template.md`：定义可复制的 Markdown 接口文档模板、字段表格规范、请求/响应示例和常见 REST 约定。

不增加运行时脚本或 OpenAPI schema 生成器。当前需求是提高文档编写质量，模板和规则已经足够；脚本会把 skill 绑定到特定格式，增加维护成本。

## 编写流程

skill 被触发后按以下顺序工作：

1. 识别接口用途、业务场景、调用方、权限和前置条件。
2. 从路由或已有实现中确认 HTTP 方法、完整 URL、路径参数和查询参数。
3. 确认 header、cookie、认证信息、Content-Type、幂等键等请求元数据。
4. 确认 `requestBody` 的媒体类型、字段结构、类型、必填性、约束、默认值和示例。
5. 确认成功及失败响应的状态码、响应 header/cookie、响应体和字段含义。
6. 输出字段表格、完整请求示例和完整响应示例。
7. 检查文档是否覆盖所有要求；不确定的信息标记为“待确认”，不得根据惯例臆造。

## 文档契约

每个接口必须包含：

- 接口名称与用途说明
- 请求方法和完整 URL
- 路径参数、查询参数、表单参数或其他 `param`
- 请求 header 与 cookie
- `requestBody` 结构和字段说明
- 成功响应的状态码、header、cookie、响应体和字段说明
- 失败响应的状态码、错误码、错误消息和响应示例
- 至少一个完整可执行的 `curl` 示例和对应 JSON 响应示例

分页、排序、过滤、时间格式、认证、幂等、缓存和安全规则仅在接口实际适用时记录；不适用时明确写“不适用”。

## 信息缺失与安全

文档生成必须以仓库代码、路由定义、DTO/Schema、测试、配置和用户提供的信息为依据。无法确认的字段使用“待确认”并列出需要补充的问题。示例中的 token、手机号、邮箱、Cookie 和业务数据使用明显的占位值，不能泄露真实凭据或敏感数据。

## 验证策略

- 使用 skill-creator 提供的 `quick_validate.py` 检查 frontmatter、命名和未完成脚手架占位符。
- 人工检查入口文件是否链接到 reference，模板是否覆盖方法、URL、param、requestBody、响应值、header、cookie、用途和实例。
- 用 `git diff --check` 检查 Markdown 空白和格式问题。

## 验收标准

1. skill 名称符合小写字母、数字和连字符规则，并能被自动发现。
2. skill 明确要求完整说明方法、请求 URL、param、requestBody、响应值、header、cookie 和接口用途。
3. reference 提供可复用模板，且包含完整 `curl` 请求与 JSON 响应实例。
4. skill 明确区分路径参数、查询参数、表单参数和请求体字段。
5. skill 对状态码、错误响应、认证、幂等、分页及安全信息有可执行的记录规则。
6. skill 禁止臆造未知接口细节，并能指导文档作者补齐待确认项。
