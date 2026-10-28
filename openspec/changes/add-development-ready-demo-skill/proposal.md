# Proposal

## Why

设计 Demo 往往只还原视觉稿，导致组件、交互、数据边界和后端代码难以复用。需要一个固定技术架构和质量门禁，帮助 Codex 将文字需求或设计图转化为视觉接近、结构清晰、可测试并能继续演进的前后端 Demo。

## What Changes

- 新增一个用于生成开发型 Demo 的 Skill，支持文字需求或设计图作为独立输入。
- 固定前端技术栈为 Vue 3、Vite、TypeScript、SCSS、Tailwind CSS、Pinia。
- 固定后端技术栈为 Java 21、Spring Boot、H2、MyBatis-Plus，并要求 Repository 端口与持久化适配器分离。
- 强制在需求讨论阶段使用 `superpowers:brainstorming`，完成需求、交互状态、数据边界和验收标准确认后再实现。
- 强制融合前端交互、后端可靠性、日志边界、代码审查和 TDD 规范。
- 通过参考资料提供固定目录、分层、前后端契约、状态矩阵和交付检查清单。
- 新增 Skill 评测用例，验证它能要求架构复用、TDD、专项规范和最终验证。

## Capabilities

### New Capabilities

- `development-ready-demo`: 根据文字需求或设计图生成遵循固定架构、可运行、可测试、可复用的前后端 Demo。

### Modified Capabilities

无。

## Impact

- 新增 Skill 目录、参考资料和评测用例。
- 不修改现有业务代码、公开 API 或既有 Skill 的运行规则。
- 依赖已有的前端交互、后端可靠性、日志边界、代码审查和 TDD Skill；`development-workflow` 仅作为流程设计参考，不作为新 Skill 的整体运行时依赖。
