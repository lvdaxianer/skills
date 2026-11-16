# rsi-context-snapshot Specification

## Purpose

为所有 AI 工具提供可追踪、可限额、可恢复的 RSI 上下文快照，把全局知识、项目知识和当前任务事实按稳定优先级注入交互上下文。

## Requirements

### Requirement: 快照必须分层合并 RSI 上下文

系统 MUST 生成包含 global、project、current 三层的 RSI 快照，并为每层保留来源范围、条目 ID 和证据引用。

#### Scenario: 生成任务快照
- **WHEN** 操作者为项目和当前任务准备 AI 上下文
- **THEN** 系统 MUST 先加入全局 RSI，再加入项目 RSI，最后加入当前任务事实，并返回稳定的 snapshotId

#### Scenario: 项目规则覆盖全局规则
- **WHEN** 项目 RSI 与全局 RSI 针对同一规则存在冲突
- **THEN** 系统 MUST 保留两者来源，并按用户要求、当前证据、项目 RSI、全局 RSI 的优先级生成最终上下文

### Requirement: 快照必须限制上下文预算

系统 MUST 支持最大条目数和最大字节数，并在截断时返回 truncated、保留条目数和被省略内容的摘要引用。

#### Scenario: RSI 超出预算
- **WHEN** 候选 RSI 超过当前工具的上下文预算
- **THEN** 系统 MUST 按任务相关性、严重级别、复现次数和最近验证时间排序后截断，不得把全部历史写入上下文

### Requirement: 快照必须可验证和可恢复

系统 MUST 为快照保存 schemaVersion、来源哈希、内容哈希、生成时间和 manifest，并支持通过 snapshotId 重新读取相同内容。

#### Scenario: 新会话恢复快照
- **WHEN** AI 工具发生上下文压缩或启动新会话
- **THEN** 系统 MUST 能通过 snapshotId 和 manifest 恢复原快照，或明确报告来源已变化

### Requirement: 未验证知识不得进入默认 RSI

系统 MUST 排除 excluded、deprecated、unknown 未确认和未通过公共晋升门禁的候选，除非当前任务明确请求查看候选。

#### Scenario: 项目候选尚未确认
- **WHEN** 项目知识仍处于 unknown 或 pending
- **THEN** 默认任务快照 MUST 不把它作为可执行规则注入，并保留可查询的候选引用
