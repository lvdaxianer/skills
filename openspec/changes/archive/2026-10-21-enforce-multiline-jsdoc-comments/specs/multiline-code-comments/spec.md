# Spec Delta

## Purpose

为代码生成与审查提供稳定、可读且可验证的文档注释排版契约，确保 JSDoc 不会被压缩为难以维护的单行文本。

## ADDED Requirements

### Requirement: JSDoc SHALL use multiline layout

代码生成和代码审查 MUST 要求 JSDoc 使用多行布局；注释起始标记 `/**` 与结束标记 `*/` MUST 各自独占一行。

#### Scenario: Generate a method documentation comment

- **WHEN** 为 TypeScript、JavaScript 或 Vue 方法生成 JSDoc
- **THEN** 输出使用 `/**`、内容行和 `*/` 的多行结构，不得输出单行 JSDoc

### Requirement: Documentation tags SHALL be line-separated

JSDoc 中的方法描述以及每个以 `@` 开头的文档标签 MUST 各自独占一行；标签之间 MUST 保留可读的换行结构。

#### Scenario: Format multiple documentation tags

- **WHEN** 一个方法包含多个参数、返回值和作者信息
- **THEN** 每个文档标签分别位于独立行，不能把多个标签拼接在同一行

### Requirement: Review checklist SHALL reject single-line JSDoc

代码审查清单 MUST 将单行 JSDoc 判定为格式不合格，即使其中包含全部必需标签也不得通过注释排版检查。

#### Scenario: Review a single-line JSDoc

- **WHEN** 被审查代码使用 `/** ... @param ... @returns ... */` 的单行形式
- **THEN** 审查结果 MUST 标记注释排版不通过，并要求改为多行格式
