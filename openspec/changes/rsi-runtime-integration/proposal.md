# 变更提案：补齐 RSI 运行时接入

## Why

当前 RSI 已经可以生成三层上下文快照，并且已经提供 Provider Adapter 与 MCP 处理器，但控制平面没有真正调用 Adapter，MCP 也没有独立的可执行入口。这样会出现“快照生成成功，但上下文没有进入目标工具”的假成功。

## What Changes

- 在控制平面增加显式的 Provider 注入接口，支持文件、Prompt 和 MCP 三种注入方式。
- 由 Provider Adapter 记录成功、降级和失败的追加式注入审计。
- 增加独立的 Node MCP stdio 启动入口和 npm script。
- 补齐接口文档、启动文档和端到端测试，确保成功结果可以被证据验证。

## Impact

- 影响 `product-delivery-workflow/references/control-plane` 的 RSI API、启动入口和 Provider Adapter。
- 不覆盖 `CLAUDE.md`、`AGENTS.md` 等宿主规则文件；文件注入只写入 `.product/rsi/providers/<provider>/`。
- 不新增外部网络依赖或凭证要求；MCP 通过标准输入输出通信。
