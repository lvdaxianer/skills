# product-intake-routing Specification

## Purpose
让自然语言任务先按复杂度、变更范围和风险进入合适的交付档位，避免简单内容修改被完整产品流程阻塞，同时保证高风险需求不会绕过必要的需求和验证门禁。

## Requirements

### Requirement: 任务必须获得执行档位

总控流程 MUST 为每个输入分配 `quick-action`、`content`、`bugfix`、`feature` 或 `high-risk` 档位，并保存分类依据。

#### Scenario: 简单内容修改进入轻量档位
- **WHEN** 用户请求修改文章、README 或格式且不改变系统行为
- **THEN** 系统 MUST 分配 `content` 或 `quick-action`，且 MUST NOT 强制生成完整 PRD

#### Scenario: 新功能进入产品档位
- **WHEN** 用户请求新增用户流程、API、数据模型或业务规则
- **THEN** 系统 MUST 分配 `feature` 并进入完整 PRD 校验流程

### Requirement: 高风险输入必须升级

系统 MUST 将权限、敏感数据、支付、不可逆数据变更、迁移、跨系统集成和生产发布相关输入分配为 `high-risk`。

#### Scenario: 权限变化升级为高风险
- **WHEN** 输入会改变角色权限或敏感数据访问范围
- **THEN** 系统 MUST 选择 `high-risk`，并阻止轻量流程直接进入开发

### Requirement: Bug 可以使用轻量契约

系统 MUST 允许复现步骤、期望行为和影响范围明确且边界可控的 Bug 使用 Bug Record，而不是完整 PRD。

#### Scenario: 明确 Bug 不生成完整 PRD
- **WHEN** Bug 有稳定复现步骤、明确期望行为且不涉及高风险边界
- **THEN** 系统 MUST 生成 Bug Record、回归验证和证据计划

#### Scenario: 不明确 Bug 自动升级
- **WHEN** Bug 涉及多个模块、业务规则重新定义、权限、迁移或不可逆数据变化
- **THEN** 系统 MUST 升级为 `feature` 或 `high-risk` 并进入 PRD 校验

### Requirement: 人工可以覆盖路由

系统 MUST 支持人工修改执行档位，并记录原始判断、覆盖值、操作者、原因和时间。

#### Scenario: 人工将 Bug 升级为完整 PRD
- **WHEN** 操作者将 `bugfix` 改为 `feature`
- **THEN** 系统 MUST 保存覆盖审计，并按 `feature` 流程重新推进
