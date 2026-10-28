---
name: design-to-development
description: "Use whenever the user wants a runnable product implementation based on a text requirement or a design image, including when they ask to reproduce a screen, turn a visual design into a frontend, build a product slice, or make an implementation closer to formal development. Generate a reusable full-stack implementation with the fixed Vue 3 + Vite + TypeScript + SCSS + Tailwind + Pinia frontend and Java 21 + Spring Boot + H2 + MyBatis-Plus backend, and enforce brainstorming, TDD, frontend interaction, backend reliability, logging, and code-review gates."
---

# Design to Development

把文字需求或设计图转化为“视觉接近、交互完整、结构可维护、能够继续复用”的前后端产品实现。这个 Skill 的重点不是一次性把页面画出来，而是让产出的代码尽可能接近后续正式开发可以采用的代码。

## 适用范围

当用户提出以下任一类请求时使用本 Skill：

- 根据文字需求制作一个可运行的产品功能切片
- 根据截图、设计稿或页面图片还原界面
- 把视觉稿转成 Vue 页面并接入后端
- 制作需要真实表单、列表、详情、保存、删除、发布或筛选交互的原型
- 让设计实现更接近真实开发，或希望后续代码能够复用

输入可以是文字需求或设计图，二者互相独立；如果同时提供，则交叉校验，但不能要求用户必须同时提供两者。

## 固定技术架构

不要在每个项目中重新提出技术选型。直接使用以下内置架构：

```text
project/
├── frontend/
└── backend/
```

前端固定使用：

- Vue 3
- Vite
- TypeScript
- SCSS
- Tailwind CSS
- Pinia
- Vue Router

后端固定使用：

- JDK 21
- Spring Boot
- Maven
- H2
- MyBatis-Plus
- Flyway 或项目既有的可审计迁移方案

后端采用模块化单体和轻量端口/适配器边界：

```text
interfaces        # Controller、Request/Response DTO、鉴权入口
application       # 用例编排、事务边界、权限协调
domain            # 业务规则、实体、值对象、Repository 接口
infrastructure    # MyBatis-Plus、H2/MySQL、外部服务适配器
```

Domain 和 Application 不得依赖 MyBatis-Plus 类型。H2 是默认本地数据库；需要 MySQL 兼容性时提供独立 Profile，避免使用 H2 特有 SQL，并记录 H2 与 MySQL 之间的验证范围。

## 强制流程

不要跳过阶段，也不要在需求尚未确认时先写实现代码。

### 1. 读取上下文并识别输入

先检查当前项目结构、已有技术栈、组件库、可复用模块、测试命令和运行方式。

- 文字输入：提取页面、角色、流程、数据、权限和验收目标。
- 设计图输入：提取布局、视觉层级、组件、内容密度和可见操作；对图片无法确认的业务行为记录假设。
- 已有项目：优先复用已有组件、Store、API Client、后端模块和测试基础设施。
- 新项目：按固定目录和固定技术架构创建前后端工程。

需要基线文件、构建清单、环境变量或依赖变更时，加载 `project-hygiene`。

### 2. 强制进行需求讨论

必须使用 `superpowers:brainstorming`（本环境对应的 brainstorming Skill）。这一阶段只讨论“做什么”和“验收什么”，不重新选择技术栈。

按一次一个问题的方式澄清：

1. 用户目标和核心任务路径
2. 页面、路由和业务模块范围
3. 用户角色、权限和数据边界
4. 表单、列表、详情、编辑、删除、发布等操作
5. loading、empty、error、permission-denied、offline 和长任务状态
6. 设计图无法表达的交互与数据假设
7. 可复用边界和验收标准

先输出设计结论并等待用户确认。设计未确认前，不得创建实现代码、组件、接口或数据库迁移。

### 3. 建立设计到开发的映射

读取 `references/interaction-and-state.md` 和 `references/api-and-data-contract.md`。在实现前形成：

- 页面和路由清单
- 组件层级与复用边界
- 页面状态和操作状态矩阵
- Pinia、Composable、API Client 边界
- 业务模块和用例清单
- Domain、Repository 和持久化模型边界
- API、错误码、分页和权限草案

前端交互实现必须加载 `frontend-interaction-guidelines`；后端行为必须加载 `backend-reliability-guidelines`。它们的 canonical 规则优先于本 Skill，本 Skill 不复制其完整细则。

### 4. 拆分可验证任务

读取 `references/workflow.md`。将工作拆成小的、可独立验证的任务。每个任务必须写清楚：目标、范围、依赖、成功场景、失败场景、验证命令和交付证据。

如果任务会新增或修改对外 API，加载 `rest-api-documentation`，并在对应业务模块维护唯一的 `apis/<module>.md`。

### 5. 强制使用 TDD

必须加载 `test-driven-development`，按以下顺序执行每个行为任务：

```text
RED       先写测试并确认按预期失败
GREEN     实现使测试通过的最小代码
REFACTOR  消除重复、整理边界并保持测试通过
VERIFY    运行更大范围的测试、构建或 lint
```

后端至少覆盖主要成功路径及适用的校验、鉴权、权限、重复请求、并发、外部失败和恢复路径。前端至少覆盖用户可见行为及适用的 loading、empty、error、retry、重复触发、删除确认和过期响应路径。不要把像素级差异强行转成单元测试；视觉一致性使用设计图核对和必要的视觉回归验证补充。

### 6. 按领域实现并审查

实现时按触发面加载 Skill：

- 任意代码 → `code-review-spec`
- 页面、组件、表单、列表和交互 → `frontend-interaction-guidelines`
- Vue 路由、Store、组合式逻辑和测试 → 对应 Vue Skill
- API、Service、Repository、配置和数据变更 → `backend-reliability-guidelines`
- 日志、traceId、MDC、脱敏、异常和异步任务 → `logging-boundaries`
- 复杂领域建模 → `ddd`
- 对外接口文档 → `rest-api-documentation`

冲突处理遵循领域权威：前端交互问题由 `frontend-interaction-guidelines` 决定，后端可靠性由 `backend-reliability-guidelines` 决定，日志由 `logging-boundaries` 决定，其他代码质量由 `code-review-spec` 决定。

### 7. 完成前验证

必须加载 `verification-before-completion`。在声称完成前，重新读取需求、设计映射和任务清单，并运行与变更范围匹配的完整验证：

- 前端测试、lint 和 build
- 后端测试和 build
- 关键用户流程验证
- API 文档覆盖检查（适用时）
- 设计图关键页面核对
- 启动命令和种子数据验证

任何必需检查失败时，必须报告实际失败证据，不得声称项目已完成。

## 复用规则

- 页面不得直接拼接后端请求细节；通过 API Client 或数据访问层访问服务。
- 组件之间只传递稳定且最小的标识；接收组件通过 Store、查询或数据访问层解析当前数据。
- Controller 不得直接暴露 ORM Entity；Request、Response、Domain Model 和 Persistence Model 分离。
- Repository 接口位于业务边界，MyBatis-Plus 只属于基础设施适配器。
- Pinia 管理跨页面和跨组件共享状态，局部状态留在组件或 Composable 中。
- Mock 数据必须遵守真实 API 契约，不能让页面绑定临时字段结构。
- 统一复用 loading、empty、error、success、disabled、confirmation、permission-denied 和 long-running 状态模式。
- 项目不默认引入微服务、消息队列、Redis、Kubernetes、真实支付或真实 OAuth；需要时只增加清晰的适配边界。

## 输出格式

交付时必须说明：

```text
工程位置
前端启动命令与地址
后端启动命令与地址
测试、lint 和 build 命令
API 文档位置（适用时）
种子数据或示例账号
已实现功能
设计假设
未实现或待确认事项
可复用的组件、Store、API、Domain 和 Repository 边界
验证命令及实际结果
```

## 参考资料加载

只在对应阶段读取，避免把所有细节一次性塞入上下文：

| 资料 | 读取时机 |
| --- | --- |
| `references/architecture.md` | 建立固定工程和分层边界时 |
| `references/workflow.md` | 进入任务拆分、TDD、审查和交付流程时 |
| `references/interaction-and-state.md` | 解析设计图、页面行为和交互状态时 |
| `references/api-and-data-contract.md` | 设计 API、DTO、Repository 和数据迁移时 |
| `references/quality-gates.md` | 实现后审查、验证和交付前 |

`development-workflow` 仅作为上述流程机制的参考，不作为本 Skill 的整体运行时依赖；本 Skill 不自动要求 OpenSpec、分支 Worktree、子 Agent 编排或逐任务合并。
