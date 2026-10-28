# Proposal

## Why

`development-ready-demo` 中的 “demo” 容易让人理解为一次性、临时或不可复用的假页面，弱化了本 Skill 面向正式开发复用的目标。将其更名为 `design-to-development`，让名称直接表达从需求/设计到开发实现的定位。

## What Changes

- 将 Skill 目录从 `development-ready-demo/` 重命名为 `design-to-development/`。
- 将 frontmatter 中的 `name` 和 `description` 同步为新的 Skill 身份和触发语义。
- 将 evals 中的 `skill_name` 和相关文案同步更新。
- 更新 OpenSpec 主规格、归档记录和仓库内引用，确保不再把旧名称作为当前 Skill 名称使用。

## Capabilities

### New Capabilities

无。本变更只调整既有 Skill 的身份命名和文档引用。

### Modified Capabilities

无。既有 Skill 的行为要求不变。

## Impact

- 影响 Skill 目录、frontmatter、评测标识和 OpenSpec 文档引用。
- 不改变固定技术架构、brainstorming、TDD、前后端规范、日志规范或交付流程。
- 不修改业务代码、公开 API 或现有其他 Skill。
