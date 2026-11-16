# Proposal

## Why

当前 RSI 知识已经能够按公共和项目范围沉淀，但只能依赖具体 Skill 或人工读取，无法在 Claude、Codex、Kimi 等不同 AI 工具启动和切换任务时稳定进入上下文。需要建立工具无关的快照协议和适配层，让 RSI 成为每次 AI 交互都可复用、可追踪、可限额的上下文基础设施。

## What Changes

- 新增统一 RSI Context Snapshot，合并全局、项目和当前任务三层信息，并保存版本、来源、内容哈希、预算和截断状态。
- 新增快照生成器，从现有全局目录和项目知识中筛选已验证、未排除且与当前任务相关的 RSI，避免把全部历史塞进上下文。
- 新增 Provider Adapter 协议，支持文件导入、启动 Prompt、MCP 查询和结果写回，不覆盖用户已有的 `CLAUDE.md`、`AGENTS.md` 或其他规则文件。
- 控制平面新增 RSI 快照准备、读取、反馈写回和 MCP 工具能力，支持会话启动、任务开始、Worker 创建、开发/测试/重试等边界时机。
- 更新 `product-delivery-workflow` 的中文流程说明，明确 RSI 注入时机、优先级、上下文预算和工具适配边界。
- 新增端到端测试，验证全局优先于项目、项目可覆盖全局、快照稳定、预算受限、适配器输出可消费以及失败经验可写回。

## Capabilities

### New Capabilities

- `rsi-context-snapshot`: 统一 RSI 快照协议、分层合并、相关性筛选、预算限制、哈希和可恢复存储。
- `rsi-provider-adapter`: 面向 Claude、Codex、Kimi 等工具的文件、Prompt、MCP 和反馈适配协议。

### Modified Capabilities

- `product-control-plane`: 增加 RSI 快照准备、查询、反馈写回和 MCP 入口。
- `product-knowledge-governance`: 将已验证公共/项目知识作为 AI 交互上下文，并保留人工归属和证据边界。

## Impact

- 影响 `product-delivery-workflow/references/control-plane/` 的 Node 服务、知识快照和 API。
- 影响 `product-delivery-workflow/SKILL.md` 及 RSI、知识模型、启动和验证说明。
- 不引入第三方数据库或远程 AI 服务；继续使用本地文件事实源和 SQLite 查询投影。
- 不自动覆盖用户规则文件；生成文件均位于项目 `.product/rsi/` 或共享 RSI 目录，并通过 manifest 记录来源和哈希。
