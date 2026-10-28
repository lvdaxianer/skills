# Proposal

## Why

`design-to-development` 已固定 Vue 3 前端技术栈，但尚未固定页面、组件、状态、API、类型和测试的目录职责，导致 Demo 容易把请求、状态和页面逻辑混在一起，降低后续开发复用率。现在补充一套“按技术类型分层、按业务命名文件、页面局部组件隔离、API Mock 可替换、测试邻近源码”的前端目录契约，使 Demo 的代码组织更接近正式开发。

## What Changes

- 为 `frontend/` 定义固定的 `src/` 顶层目录及职责边界。
- 规定页面按业务模块组织在 `views/<module>/`，页面专属组件放在页面目录内，共享组件放在 `components/`。
- 规定 API Client、Pinia Store 和类型定义按业务命名拆分到对应技术目录。
- 规定页面、组件和 Store 等单元测试邻近源码，端到端测试统一放在 `tests/e2e/`。
- 规定页面只能通过 API Client 访问后端，Mock 通过可替换 Adapter 提供，并遵守真实 API 契约。
- 将前端目录结构、依赖方向、复用边界和验证项加入 Skill 正文、参考文档、质量门禁和评估用例。

## Capabilities

### New Capabilities

- `frontend-directory-structure`: 定义开发型 Demo 的前端目录、职责、依赖方向、测试位置和 Mock 边界。

### Modified Capabilities

- `design-to-development`: 将固定前端架构从技术栈约束扩展为可复用的目录和模块边界约束。

## Impact

- 影响 `design-to-development` Skill 及其 `references/`、README 和评估用例。
- 新增 OpenSpec 前端目录结构规格，并同步更新现有 `design-to-development` 规格。
- 不修改运行时业务代码、后端 API、依赖版本或项目构建配置。
