# frontend-directory-structure Specification

## Purpose
为开发型产品 Demo 提供稳定、可复用且可验证的前端目录契约，使页面、组件、状态、数据访问、类型和测试拥有清晰边界，并降低后续正式开发的迁移成本。

## Requirements

### Requirement: Frontend source directories have stable responsibilities

前端实现 MUST 使用稳定的技术类型目录来承载应用入口、页面、组件、布局、路由、状态、组合式逻辑、数据访问、类型、工具、样式、资源和测试初始化职责。

#### Scenario: New frontend project is generated

- **WHEN** Skill 为新项目生成前端工程
- **THEN** 工程 MUST 提供 `src/app`、`src/layouts`、`src/router`、`src/views`、`src/components`、`src/stores`、`src/composables`、`src/api`、`src/types`、`src/utils`、`src/styles`、`src/assets` 和 `src/test`，并提供根目录 `tests/e2e`

#### Scenario: Existing frontend project is extended

- **WHEN** Skill 在已有前端项目中新增功能
- **THEN** Skill MUST 先复用已有等价目录和边界，仅在缺失时增量补齐，不得为了套用模板进行无关的大规模迁移

### Requirement: Pages and components preserve reuse boundaries

页面 MUST 按业务模块组织在 `views/<module>/`；页面专属组件 MUST 放在对应页面目录内；跨页面稳定复用的组件 MUST 放在 `components/`。

#### Scenario: Page-specific component is created

- **WHEN** 组件只服务于一个页面或一个页面模块
- **THEN** 组件 MUST 放在对应 `views/<module>/components/`，不得直接污染全局共享组件目录

#### Scenario: Shared component is promoted

- **WHEN** 组件已经被多个页面稳定复用
- **THEN** 组件 MUST 可以提升到 `components/`，并通过稳定、最小的 Props/Emits 契约供页面使用

### Requirement: Business data files are separated by technical responsibility

API Client、Pinia Store 和类型定义 MUST 分别位于 `api/`、`stores/` 和 `types/`，并按业务命名拆分文件；页面和组件 MUST NOT 直接拼接后端请求细节。

#### Scenario: A business module is added

- **WHEN** 前端新增一个业务模块
- **THEN** 模块 MUST 在对应技术目录提供可独立维护的 API、Store 和类型文件，并由页面通过这些边界访问数据

#### Scenario: Shared state is introduced

- **WHEN** 状态需要跨页面或跨组件共享
- **THEN** 状态 MUST 由对应 Pinia Store 管理；仅单个页面使用的局部状态 MUST 留在页面或 Composable 中

### Requirement: Mock data uses the same data access contract

Mock 数据 MUST 通过 `api/mocks` 等可替换适配器接入，页面 MUST 只依赖 API Client 契约；Mock 字段、错误和状态 MUST 与真实 API 契约一致。

#### Scenario: Backend is unavailable during Demo development

- **WHEN** Demo 需要在后端不可用时展示可运行流程
- **THEN** Skill MUST 允许切换到 Mock Adapter，而无需修改页面、组件或 Store 的调用方式

#### Scenario: Mock response differs from API contract

- **WHEN** Mock 响应缺少真实 API 的字段、错误或状态语义
- **THEN** 验证 MUST 视为失败，不得以页面能够显示静态数据作为通过条件

### Requirement: Frontend tests are discoverable beside behavior

页面、组件、Store、Composable 和 API Client 的单元或组件测试 MUST 邻近源码放置；端到端测试 MUST 统一放在 `tests/e2e/`。

#### Scenario: A frontend behavior changes

- **WHEN** 前端新增或修改用户可见行为
- **THEN** 对应聚焦测试 MUST 与源码同目录或在其 `__tests__/` 目录中维护，并先以失败测试表达缺失行为

#### Scenario: End-to-end flow is added

- **WHEN** 测试覆盖跨页面或完整用户流程
- **THEN** 测试 MUST 放在 `tests/e2e/`，不得用端到端测试替代组件和 Store 的局部行为测试
