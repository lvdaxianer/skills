# Spec Delta

## ADDED Requirements

### Requirement: 控制平面必须提供 RSI 上下文边界

控制平面 MUST 提供生成、读取和追踪 RSI 快照的稳定入口，并让快照与项目、运行、Provider 和内容哈希关联。

#### Scenario: 准备当前任务上下文

- **WHEN** 总控在任务开始或 Worker 创建前请求 RSI 快照
- **THEN** 控制平面 MUST 返回 snapshotId、分层条目、预算状态、manifest 和可用的 Provider 注入结果

#### Scenario: 反馈写回 RSI

- **WHEN** 当前运行产生错误、近失误、成功经验或人工修订
- **THEN** 控制平面 MUST 追加反馈事实并关联 runId、snapshotId、证据引用和写回状态

### Requirement: RSI 上下文接口必须保持稳定错误和可重试

RSI 快照和反馈接口 MUST 校验项目、Provider、预算和来源参数，并在生成失败时返回稳定错误码和可重试信息。

#### Scenario: 快照来源发生变化

- **WHEN** manifest 发现事实源或知识版本在生成期间发生变化
- **THEN** 控制平面 MUST 返回冲突状态或生成新的快照，不得返回未绑定来源的成功结果
