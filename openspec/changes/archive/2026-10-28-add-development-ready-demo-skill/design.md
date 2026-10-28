# Design

## Context

本变更新增一个用于生成开发型 Demo 的 Skill。现有仓库已经提供前端交互、后端可靠性、日志边界、代码审查、REST API 文档和项目卫生等领域规范；本 Skill 需要编排这些规范，但不复制它们的细则。固定技术架构为前后端同仓库的模块化单体：Vue 3 + Vite + TypeScript + SCSS + Tailwind CSS + Pinia，以及 Java 21 + Spring Boot + H2 + MyBatis-Plus。

## Goals / Non-Goals

**Goals:**

- 让文字需求或设计图均可独立触发 Demo 开发流程。
- 在实现前强制完成需求讨论、交互状态、数据边界和验收标准确认。
- 让 Demo 代码接近真实开发结构，并尽可能复用到后续项目。
- 将领域规范按触发条件组合起来，避免把 `development-workflow` 整体作为运行时依赖。
- 将 TDD、代码审查和完成前验证设置为实现门禁。
- 使用 references 渐进式承载架构模板、工作流、契约和验收清单，控制主 `SKILL.md` 长度。

**Non-Goals:**

- 不为每个 Demo 重新进行前后端技术选型。
- 不默认引入微服务、消息队列、Redis、Kubernetes 或真实支付/OAuth 基础设施。
- 不替代领域 Skill 的权威规则，也不在本 Skill 中复制完整的日志、可靠性或前端交互细则。
- 不要求设计图提供所有业务行为；无法确认的行为必须记录为假设或在 brainstorming 中澄清。

## Decisions

### 1. 使用轻量编排 Skill，而不是整体继承 development-workflow

Skill 会吸收 `development-workflow` 的 brainstorming、计划确认、TDD、审查和验证思想，但运行时只加载实际需要的领域 Skill。这样可以保留质量门禁，同时避免把 OpenSpec、分支 Worktree、子 Agent 编排和逐任务合并等完整工程生命周期强加给每个 Demo。

备选方案是直接要求使用完整 `development-workflow`。该方案流程完整，但与“快速生成可复用 Demo”的目标不匹配，且会把 Skill 的职责扩展到分支和提交管理。

### 2. 固定技术栈和模块化单体架构

Skill 主体直接声明固定技术架构，不开放运行时技术选型：

```text
demo/
├── frontend/
└── backend/
```

后端使用 `interfaces / application / domain / infrastructure` 边界。Domain 和 Application 依赖 Repository 端口，MyBatis-Plus 仅作为 Infrastructure 适配器。这样 Demo 可以使用 H2 快速运行，同时不会把 ORM 类型泄漏到业务代码，便于后续替换 MySQL 或非关系型存储。

### 3. 以 brainstorming 作为实现前硬门禁

输入可以是文字需求或设计图。Skill 先区分输入模式，再调用 `superpowers:brainstorming`：检查项目上下文、一次澄清一个关键问题、补齐不可见的交互状态、记录假设、形成设计并等待用户确认。设计未确认前，不创建实现代码。

### 4. 以任务为单位执行 TDD

每个可独立验证的功能任务都必须先写失败测试，确认失败原因是缺少目标行为，再实现最小代码使其通过，最后重构并运行更大范围验证。后端使用项目已有 Java 测试约定，前端使用 Vue 测试约定；TDD 关注行为和状态，不把像素级视觉差异强行转化为单元测试。

### 5. 按领域触发 Skill，并遵循权威优先级

主 Skill 只定义“何时加载哪个 Skill”，不复述领域规则：

- 前端页面、组件、表单和交互 → `frontend-interaction-guidelines`
- 后端 API、Service、持久化、配置和可靠性 → `backend-reliability-guidelines`
- 日志、traceId、MDC、脱敏和日志级别 → `logging-boundaries`
- 任意代码修改和审查 → `code-review-spec`
- 对外 API 文档 → `rest-api-documentation`
- 工程基线、依赖或环境变量 → `project-hygiene`
- Vue 路由、状态或测试细节 → 对应 Vue Skill
- 复杂领域建模 → `ddd`

发生规则重叠时，具体领域 Skill 优先，主 Skill 只保留流程和证据要求。

### 6. 使用渐进式参考资料

主 `SKILL.md` 保持在 500 行以内，包含触发条件、固定架构、阶段流程、Skill 编排、门禁和交付格式。以下内容放入 `references/`，只在对应阶段读取：

- `architecture.md`：前后端目录、分层和可替换持久化边界
- `workflow.md`：输入解析、brainstorming、计划、TDD、审查和交付流程
- `interaction-and-state.md`：设计图转页面状态、操作状态和复用边界
- `api-and-data-contract.md`：DTO、API、分页、错误码、Repository 和数据库约束
- `quality-gates.md`：TDD、专项规范、验证命令和交付检查清单

## Risks / Trade-offs

- [设计图缺少业务语义] → 将推断内容记录为假设；影响范围大的内容必须在 brainstorming 中确认。
- [H2 与 MySQL 行为不完全一致] → 禁止使用 H2 特有 SQL；提供 MySQL Profile，并对关键迁移或查询保留兼容性验证说明。
- [固定架构对极小 Demo 可能显得偏重] → 使用轻量模块化分层，不默认引入完整 DDD、事件总线或微服务。
- [领域 Skill 内容重复或发生冲突] → 主 Skill 只编排和引用，具体规则由对应权威 Skill 负责。
- [TDD 增加首次 Demo 的实现成本] → 只要求行为和关键状态测试，采用最小测试闭环，避免无价值的像素测试。
- [Skill 主文档过长导致执行不稳定] → 使用 references 渐进式加载，并在主文档中明确每个参考资料的读取时机。

## Migration Plan

本变更只新增 Skill 及其 OpenSpec 资产，不修改现有业务代码、公开 API 或已有 Skill。发布前通过结构检查、Markdown/JSON 解析、OpenSpec 严格校验和 Skill 评测用例验证；失败时删除新 Skill 目录即可回滚，不影响现有 Skill。
