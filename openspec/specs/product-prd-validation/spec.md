# product-prd-validation Specification

## Purpose
让功能需求从自然语言形成可追踪、可测试、可拆分的 PRD，并通过相互隔离的复检上下文证明它可以安全交给工程流程，而不是依赖单个 Worker 的主观判断。

## Requirements

### Requirement: 主 Worker 必须生成可追踪 PRD

主 Worker MUST 按固定结构生成 PRD，并为需求、用户故事、规则、验收标准和测试意图分配稳定 ID 及来源类型。

#### Scenario: 简单输入被补全为可执行 PRD
- **WHEN** 功能输入只包含一句自然语言描述
- **THEN** PRD MUST 补齐目标、角色、流程、边界、非目标、验收标准、测试意图、假设和风险

#### Scenario: 推断内容被标记
- **WHEN** 主 Worker 需要补充用户没有明确说明的规则
- **THEN** 该内容 MUST 标记为 `explicit`、`inferred`、`default` 或 `project-context`，不得伪装成事实

### Requirement: 两个复检 Worker 必须独立运行

产品复检 Worker 和研发复检 Worker MUST 使用独立上下文，只接收原始需求、项目事实、PRD 版本和评审规则，不得接收主 Worker 的隐藏推理或另一个复检 Worker 的结论。

#### Scenario: 两个 Worker 并行复检同一版本
- **WHEN** 主 Worker 发布 `prd-v1`
- **THEN** 系统 MUST 为两个复检 Worker 创建独立输入快照，并等待两个结果完成

#### Scenario: 复检结果互不可见
- **WHEN** 任一复检 Worker 尚未完成
- **THEN** 另一个复检 Worker MUST NOT 读取其评审输出

### Requirement: PRD 只能双通过后冻结

系统 MUST 只有在两个复检 Worker 都返回 `status=succeeded` 且 `verdict=pass`、不存在高风险 `block` 时，才将 PRD 标记为 `PRD_VERIFIED`。

#### Scenario: 任一复检要求修订
- **WHEN** 任一复检结果为 `verdict=revise`
- **THEN** 主 Worker MUST 生成新 PRD 版本，并重新启动两个独立复检

#### Scenario: 两个复检全部通过
- **WHEN** 两个复检结果均为 `pass`
- **THEN** 系统 MUST 生成冻结 PRD、任务拆分和开发交接包

### Requirement: Worker 交互必须可回放

系统 MUST 将 Worker 的可审计输入引用、输出、状态、目标对象、关联 ID、版本和时间追加写入交互账本，不得覆盖历史轮次。

#### Scenario: Worker 请求和结果形成关联
- **WHEN** 主 Worker 向复检 Worker 投递执行请求并收到结果
- **THEN** 账本 MUST 保存对应的 `from`、`to`、`kind`、`action`、`status`、`verdict` 和 `correlation_id`

### Requirement: 开发交接必须满足就绪条件

系统 MUST 仅在 PRD 已验证、验收标准完整、任务依赖可解析、无阻塞假设且 handoff 完整时标记 `DEVELOPMENT_READY`。

#### Scenario: PRD 通过但仍有阻塞假设
- **WHEN** 两个复检 Worker 通过但仍存在 `blocked` 假设
- **THEN** 系统 MUST 保持阻塞，不得发送自动开发执行请求
