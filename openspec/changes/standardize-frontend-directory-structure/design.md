# Design

## Context

`design-to-development` 当前规定了 Vue 3、Vite、TypeScript、SCSS、Tailwind、Pinia 和 Vue Router，但没有统一页面、组件、状态、API、类型和测试的文件边界。本变更只调整 Skill 的生成与审查规则，不引入运行时依赖，也不迁移任何业务项目。

## Goals / Non-Goals

**Goals:**

- 用按技术类型划分的顶层目录提供稳定入口。
- 用业务命名文件保持 API、Store 和类型的可定位性。
- 通过页面专属组件与共享组件边界控制复用范围。
- 让页面只能依赖 API Client，并让 Mock 成为可替换适配器。
- 让单元/组件测试邻近行为源码，端到端测试集中管理。
- 让新项目严格使用标准结构，已有项目采用增量补齐策略。

**Non-Goals:**

- 不把已有项目强制迁移成模板结构。
- 不改变 Vue、Vite、TypeScript、SCSS、Tailwind、Pinia 或 Vue Router 的技术选型。
- 不新增前端运行时库，不规定具体 UI 组件库。
- 不将所有业务代码改成 feature-first 目录；本变更采用用户确认的技术类型组织方式。

## Decisions

### 1. 顶层按技术职责组织，页面内部按业务模块分组

标准结构固定为：

```text
frontend/
├── public/
├── src/
│   ├── main.ts
│   ├── app/
│   ├── layouts/
│   ├── router/
│   ├── views/<module>/
│   ├── components/
│   │   ├── base/
│   │   ├── business/
│   │   └── feedback/
│   ├── stores/
│   ├── composables/
│   ├── api/
│   │   ├── http.ts
│   │   ├── <module>.ts
│   │   └── mocks/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   ├── assets/
│   └── test/
└── tests/e2e/
```

选择技术类型组织，是因为用户希望快速定位“所有 Store、所有 API 或所有组件”；在 `views/<module>/` 内按业务模块分组，则保留页面级复用边界，避免所有页面文件完全平铺。

### 2. 依赖方向由页面向数据访问层单向收敛

约束为：

```text
router → views
views → components / composables / stores
stores / composables → api
api → transport / mock adapter
```

组件不得直接发起后端请求，`views` 不得拼接 URL、请求头或错误解析逻辑。跨页面状态进入 Pinia Store，页面局部状态留在页面或 Composable 中。

### 3. Mock 是 API Client 的替换实现

Mock 不放在页面或 Store 中，也不允许页面直接导入 Mock。运行模式只切换 API Client 的适配器，真实实现和 Mock 实现共享类型、成功响应、错误响应和状态语义。这样 Demo 的展示路径可以脱离后端运行，但后续接入真实服务不需要重写页面。

### 4. 测试按行为邻近源码

页面和组件测试放在对应 `__tests__/`，Store、Composable 和 API Client 测试与源码同目录；跨页面流程放在 `tests/e2e/`。该布局配合 TDD 的 RED/GREEN/REFACTOR，保证修改行为时能立即找到聚焦测试。

## Risks / Trade-offs

- [Risk] 技术类型目录可能让同一业务模块的文件分散 → 使用统一业务命名，并在交付说明中列出模块 API、Store、类型和页面位置。
- [Risk] `components/` 可能重新变成杂物箱 → 只允许跨页面稳定复用的组件进入，并按 `base/business/feedback` 分类。
- [Risk] Mock 与真实 API 漂移 → Mock 必须复用 API 类型和错误契约，评估与质量门禁检查两者一致性。
- [Risk] 既有项目目录不符合标准 → 采用等价目录复用和缺失项增量补齐，禁止无关大迁移。

## Migration Plan

1. 将目录结构、依赖方向、Mock 边界和测试位置写入 `design-to-development` Skill 及参考资料。
2. 为新项目按标准结构生成；为已有项目只在新增功能涉及的边界补齐目录。
3. 运行 Skill 快速校验、OpenSpec 严格校验和评估用例检查。
4. 若后续需要调整目录，只更新 Skill 规范和迁移说明，不要求本仓库生成一个示例前端工程。

## Open Questions

无。UI 组件库、状态管理细节和具体 API 契约仍由具体项目需求在该目录边界内确定。
