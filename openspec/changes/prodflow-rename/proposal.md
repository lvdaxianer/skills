# 变更提案：将产品交付总控 Skill 更名为 prodflow

## Why

当前总控 Skill 使用 `product-delivery-workflow` 作为目录和调用名称，过长且不能直接体现它是产品到交付的总控入口。README 也只覆盖了部分流程，无法让使用者清楚理解各环境职责、状态流转和 RSI 注入方式。

## What Changes

- 将当前 Skill 目录和 frontmatter canonical name 更名为 `prodflow`。
- 同步当前有效文档、测试、控制平面运行标识和 Worker 交互来源中的名称。
- 保留历史 OpenSpec 归档中的旧名称，避免篡改历史事实。
- 重写 `prodflow/README.md`，完整说明需求分流、PRD 三 Worker、开发、验证、部署、知识治理和 RSI。
- 为改名和 README 增加可验证的引用、frontmatter、目录和回归检查。

## Impact

- 影响 Skill 发现名称、Skill 目录路径和当前有效文档路径。
- 不改变 `development-workflow`、`service-deployment` 的职责和授权边界。
- 不改变控制平面 HTTP API、MCP 协议能力、RSI 文件/Prompt/MCP 注入行为。
- 历史归档仍可以保留 `product-delivery-workflow`，它们代表当时的真实名称。
