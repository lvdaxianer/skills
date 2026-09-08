## ADDED Requirements

### Requirement: REST API 文档必须覆盖完整请求与响应契约

skill SHALL 指导文档作者完整说明接口用途、HTTP 方法、完整请求 URL、请求参数、`requestBody`、请求 header、请求 cookie、响应状态码、响应 header、响应 cookie、响应体和字段含义。

#### Scenario: 编写一个有请求体的接口

- **WHEN** 用户要求编写或补充 REST API 接口文档
- **THEN** 输出必须分别列出路径参数、查询参数、表单参数和 `requestBody` 字段，并为每个字段说明名称、位置、类型、必填性、约束、默认值、示例和业务含义
- **AND** 输出必须包含接口用途、前置条件、认证要求、请求头/Cookie 和成功响应说明

### Requirement: 文档必须提供可联调实例

skill SHALL 要求至少提供一个完整的 `curl` 请求示例和对应的响应示例；示例必须与前文的 URL、参数、header、cookie、请求体和响应结构一致。

#### Scenario: 调用方使用文档发起请求

- **WHEN** 调用方复制接口示例
- **THEN** 示例包含实际请求方法、完整 URL、必要 header、必要 cookie、参数和完整 `requestBody`
- **AND** 文档给出对应成功响应 JSON 以及至少一个典型失败响应 JSON

### Requirement: 文档必须说明错误和通用交互约定

skill SHALL 指导作者记录适用的 HTTP 状态码、业务错误码、错误消息、认证/授权失败、参数校验失败、资源冲突、限流、分页、排序、时间格式、幂等和安全约定。

#### Scenario: 接口存在失败分支或通用约定

- **WHEN** 接口实现或资料中存在失败响应、分页、排序、幂等或认证约定
- **THEN** 文档必须在对应章节说明触发条件、字段结构和处理建议
- **AND** 不适用的约定必须明确标记为“不适用”，不能静默省略

### Requirement: 未知信息不得被臆造

skill SHALL 要求模型以代码、路由、Schema/DTO、测试、配置和用户提供资料为依据；无法确认的信息必须标记为“待确认”并列出补充问题。

#### Scenario: 资料不足以确认字段行为

- **WHEN** 无法确认参数是否必填、Cookie 是否需要、响应字段类型或状态码语义
- **THEN** 文档保留“待确认”标记，并明确指出缺失信息
- **AND** 示例中的凭据和个人数据使用占位符，不得复制真实敏感值
