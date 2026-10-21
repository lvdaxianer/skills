# Proposal

## Why

当前代码审查规范要求方法注释包含必要标签，但没有把 JSDoc 的换行形式定义为强制规则，导致生成器可能把完整注释压缩成一行，降低可读性并偏离项目模板。需要明确多行排版契约，避免同类输出继续发生。

## What Changes

- 将 JSDoc 多行排版定义为强制规则。
- 要求注释起止标记、方法描述和每个文档标签各自独占一行。
- 明确禁止单行 JSDoc，并将该要求加入审查清单。
- 保留并强化现有 TypeScript/Vue 多行示例。

## Capabilities

### New Capabilities

- `multiline-code-comments`: 约束生成和审查代码文档注释的多行排版格式。

### Modified Capabilities

<!-- 无已有 capability 的同类 requirement，本次新增独立能力。 -->

## Impact

- 受影响文件：`code-review-spec/SKILL.md`、`code-review-spec/spec.md`、`code-review-spec/references/method-comments.md`。
- 影响代码生成、代码格式化和代码审查行为；不改变运行时 API、依赖或业务代码。
