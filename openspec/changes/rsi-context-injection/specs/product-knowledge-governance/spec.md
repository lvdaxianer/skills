# Spec Delta

## ADDED Requirements

### Requirement: 已验证知识必须可作为 AI 交互上下文

系统 MUST 将已验证的公共知识和项目知识转换为有限 RSI 快照，并保留范围、来源、验证状态和证据引用。

#### Scenario: 任务开始读取 RSI

- **WHEN** AI 工具开始处理项目任务
- **THEN** 系统 MUST 先提供全局 RSI，再提供项目 RSI，并将当前任务事实作为最高优先级上下文

#### Scenario: 未验证候选不进入默认上下文

- **WHEN** 候选知识仍为 unknown、pending 或未通过公共晋升门禁
- **THEN** 系统 MUST 只保留候选引用，不把候选内容作为默认可执行规则注入

### Requirement: RSI 写回必须保留反馈证据

系统 MUST 将失败、近失误、成功前修正和人工反馈写回项目事实源，并支持后续按公共或项目范围治理。

#### Scenario: 重试后成功

- **WHEN** AI 工具修复失败并最终通过验证
- **THEN** 系统 MUST 同时保留原始失败、修正动作、验证证据和可提炼的 near_miss 关系
