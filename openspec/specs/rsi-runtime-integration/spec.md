# rsi-runtime-integration Specification

## Purpose
为产品交付控制平面提供可验证的 RSI 运行时注入闭环：把已落盘快照交给文件、Prompt 或 MCP Provider，并为每次注入保留可回放的运行证据。

## Requirements

### Requirement: 控制平面必须提供真实 Provider 注入

系统 MUST 提供 `POST /api/rsi/snapshots/:snapshotId/inject/:provider`，请求体至少支持 `mode`，可选 `maxPromptBytes`。

#### Scenario: 文件注入

- **当** snapshot 存在且 `mode=file`
- **则** 调用 Provider Adapter，把内容写入 provider 专属目录，不得覆盖 `CLAUDE.md`、`AGENTS.md` 或其他宿主规则文件
- **并且** 返回 `status=injected`、`injectionMethod=file`、snapshot 标识和 manifest 路径

#### Scenario: Prompt 注入

- **当** `mode=prompt`
- **则** 返回受字节预算约束的上下文前缀和 manifest
- **并且** 若发生预算降级，必须返回 `status=fallback` 并记录原因

#### Scenario: MCP 注入

- **当** `mode=mcp`
- **则** 返回可执行的 MCP 命令、参数和 snapshot 标识
- **并且** 返回 `status=available` 或等价的明确状态，不得声称已经向第三方客户端自动注册

### Requirement: 注入必须留下审计证据

每次注入尝试 MUST 向 `.product/rsi/audit.jsonl` 追加一条 JSON 记录，至少包含 `projectId`、`runId`、`provider`、`snapshotId`、`injectionMethod`、`status`、时间和错误信息（如有）。

#### Scenario: 成功、降级和失败可区分

- **当** Adapter 返回成功、降级或抛出稳定错误
- **则** 审计中的 `status` 必须分别可区分
- **并且** 审计文件必须采用追加方式，不删除既有记录

### Requirement: MCP 必须有独立可运行入口

系统 MUST 提供独立 Node stdio 启动入口，并允许通过 npm script 启动；stdout 仅允许输出 JSON-RPC 响应。

#### Scenario: 客户端可启动并发现工具

- **当** 客户端以项目目录和公共知识目录启动 MCP 进程，并发送 initialize 与 tools/list
- **则** 进程返回合法 JSON-RPC 响应，且包含 RSI 工具
- **并且** 启动错误写入 stderr，不污染 stdout
