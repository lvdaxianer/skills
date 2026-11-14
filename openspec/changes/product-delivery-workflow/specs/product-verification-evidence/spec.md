# Spec Delta

## Purpose

让每个功能点都通过可执行的验收断言和可回放的证据包证明完成，避免仅凭命令退出码、进程存活或 Worker 口头结论误报成功，并为可选部署提供可信交接依据。

## ADDED Requirements

### Requirement: 每个验收标准必须绑定验证方式

系统 MUST 为每条验收标准保存验证类型、执行命令或操作、预期结果、实际结果和证据引用。

#### Scenario: 功能点拆分为多个验收标准
- **WHEN** 一个任务包含权限、成功、失败和重复触发等多个行为
- **THEN** 系统 MUST 为每条行为分别生成验证记录，不得用单一通过结果覆盖全部行为

### Requirement: 浏览器验证必须保存可观察证据

浏览器验证 MUST 保存用户操作、页面断言、环境和 URL、截图，以及必要的 trace、console/network 摘要或下载文件 checksum。

#### Scenario: 浏览器流程完成
- **WHEN** 验证 Worker 执行完整用户流程并通过断言
- **THEN** 系统 MUST 生成绑定当前 commit 或 release 的浏览器证据包

### Requirement: 成功状态必须满足证据门禁

系统 MUST 只有在所有必要验收断言通过、证据完整且与当前 commit 或 release 匹配时，才允许标记 `VERIFIED` 或 `DEPLOYED`。

#### Scenario: 测试通过但缺少业务证据
- **WHEN** 单元测试通过但没有必要的 API、浏览器或业务冒烟证据
- **THEN** 系统 MUST 标记为 `INCONCLUSIVE` 或 `FAILED`，不得提示成功

### Requirement: 部署必须是最终可选动作

系统 MUST 在开发、测试和最终审计完成后询问用户是否部署；未获得当前请求中的明确部署授权时，不得调用真实部署。

#### Scenario: 用户选择不部署
- **WHEN** 用户拒绝或暂不选择部署
- **THEN** 系统 MUST 标记 `VERIFIED_NOT_DEPLOYED` 并保留发布凭证

#### Scenario: 用户明确选择部署
- **WHEN** 用户明确授权并提供或确认部署输入
- **THEN** 系统 MUST 将交接包交给 `service-deployment`，记录预检、健康、业务冒烟和回滚结果
