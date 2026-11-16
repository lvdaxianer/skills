# rsi-provider-adapter Specification

## Purpose

为 Claude、Codex、Kimi、Cursor 和其他 AI 工具提供统一的 RSI 上下文适配边界，让不同工具使用各自支持的入口消费同一份快照。

## Requirements

### Requirement: Provider Adapter 必须消费统一快照

系统 MUST 让所有 Provider Adapter 接收同一 schemaVersion 的 RSI 快照，并返回 provider、snapshotId、注入方式和生成文件的 manifest。

#### Scenario: 生成文件注入内容
- **WHEN** 工具支持项目规则文件或文件导入
- **THEN** Adapter MUST 在 `.product/rsi/` 下生成独立上下文文件，并返回用户规则文件所需的导入片段，不得覆盖用户已有文件

#### Scenario: 生成 Prompt 注入内容
- **WHEN** 工具只支持启动 Prompt、stdin 或 API 消息
- **THEN** Adapter MUST 返回带边界标记的 RSI prelude，并绑定 snapshotId 和内容哈希

### Requirement: MCP 适配器必须支持运行中查询

系统 MUST 提供可发现的 RSI 查询工具，至少支持读取全局 RSI、项目 RSI、当前快照和证据引用，并返回稳定 JSON 结构。

#### Scenario: Worker 查询相关 RSI
- **WHEN** Worker 在执行中请求某个主题的 RSI
- **THEN** MCP Adapter MUST 返回受预算限制的相关条目、来源范围、证据引用和当前快照标识

### Requirement: Adapter 必须记录注入和写回链路

系统 MUST 为每次注入和反馈写回记录 provider、snapshotId、runId、项目标识、时间、状态和错误信息。

#### Scenario: 工具注入失败
- **WHEN** 目标工具不支持当前注入方式或生成文件失败
- **THEN** Adapter MUST 返回稳定错误和可执行的 fallback，不得伪装成已注入

### Requirement: Provider Adapter 必须保持工具无关事实源

系统 MUST 将 RSI 事实、快照和反馈写回到控制平面，不得把某个工具的规则文件作为唯一事实源。

#### Scenario: 多工具复用同一 RSI
- **WHEN** 同一项目先后使用 Claude 和 Codex
- **THEN** 两个 Adapter MUST 读取同一来源快照协议，并能通过 manifest 识别内容一致性
