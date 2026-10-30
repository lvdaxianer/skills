# Proposal

## Why

长会话切换到新会话时，项目背景、服务器环境、当前进度和已确认决策容易丢失，用户不得不重复提供上下文。本变更新增一个可复用的上下文交接 skill，把当前会话中的事实整理为可直接复制到新会话的交接包。

## What Changes

- 新增 `context-handoff` skill，并支持自然语言触发和显式 `/context-handoff` 调用。
- 定义稳定的交接包字段：目标、项目/仓库、服务器/环境、进度、决策、关键文件与命令、待办、风险和缺失信息。
- 输出单一 Markdown 代码块，方便使用聊天界面的复制能力粘贴到新会话。
- 明确禁止编造事实，并对密码、Token、私钥、Cookie 等敏感信息进行脱敏。
- 添加覆盖正常、不完整和含敏感信息场景的 skill eval 用例。
- 更新中英文 README 的目录、安装和使用说明。

## Capabilities

### New Capabilities

- `context-handoff-output`: 从当前会话事实生成安全、结构化、可复制的上下文交接包。

### Modified Capabilities

- 无。

## Impact

- 新增 `context-handoff/` skill 目录及其 eval 用例。
- 修改 `README.md` 与 `README.en.md` 的 skill 清单、安装示例和使用示例。
- 不新增运行时依赖、不调用外部服务、不修改现有 skill 的行为。
