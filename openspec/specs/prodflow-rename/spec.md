# prodflow-rename Specification

## Purpose
将产品到交付总控 Skill 统一为短名称 `prodflow`，并提供完整中文流程、环境职责、成功证据和 RSI 实现说明，确保入口名称和使用方式可发现、可验证、可回放。

## Requirements

### Requirement: 当前总控 Skill MUST 使用 prodflow 作为 canonical 名称

当前 Skill 的目录、frontmatter `name`、标题和入口文档 MUST 使用 `prodflow`；当前有效文件引用 MUST 不再把 `product-delivery-workflow` 作为可执行入口名称。

#### Scenario: Skill 可被发现并加载

- **当** 使用者扫描 Skill 目录并读取 `prodflow/SKILL.md`
- **则** frontmatter 的 `name` 为 `prodflow`，描述明确它是产品到交付的总控流程
- **并且** `prodflow/README.md` 和 SKILL 中的相对链接均可解析

#### Scenario: 当前运行链路使用新名称

- **当** 控制平面、Worker 交互或启动文档记录当前运行来源
- **则** 当前有效记录使用 `prodflow`
- **并且** 历史归档可以继续保留旧名称作为历史事实

### Requirement: README MUST 解释完整产品交付流程和环境职责

`prodflow/README.md` MUST 使用中文说明需求分流、PRD 门禁、开发、测试、验收、部署决策、知识治理和各环境边界。

#### Scenario: 新用户可以从 README 运行一次完整流程

- **当** 新用户只阅读 `prodflow/README.md` 和其链接的权威协议
- **则** 能知道每个阶段的输入、输出、状态、责任 Skill 和成功证据
- **并且** 能知道什么时候不需要 PRD、什么时候进入开发、什么时候询问部署

### Requirement: README MUST 说明 RSI 的可验证实现

README MUST 说明 RSI 的 global/project/current 三层快照、事实源与 SQLite 投影边界、快照预算、注入时机、文件/Prompt/MCP 三种注入方式和审计证据。

#### Scenario: 使用者可以选择正确的 RSI 注入方式

- **当** 使用者需要让 Claude、Codex、Kimi 或其他工具读取上下文
- **则** README 明确文件注入不覆盖 `CLAUDE.md` 或 `AGENTS.md`
- **并且** README 给出 Prompt、MCP 和 `.product/rsi/audit.jsonl` 的可验证入口
