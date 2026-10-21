# 强制 JSDoc 多行注释设计

## 背景

`development-workflow` 将代码注释要求委托给 `code-review-spec`。现有规范要求注释完整，但没有明确 JSDoc 的换行边界，导致生成结果可能把多个标签压成一行。

## 设计

- 在 `code-review-spec/SKILL.md` 增加不可违反的多行 JSDoc 规则。
- 在 `code-review-spec/spec.md` 增加主规范和审查清单条目。
- 在 `code-review-spec/references/method-comments.md` 明确 TypeScript/Vue 模板的多行格式。
- 规定 `/**`、`*/`、方法描述和每个 `@` 标签必须各自独占一行，禁止单行 JSDoc。

## 验收标准

- 规范文本明确拒绝单行 JSDoc。
- TypeScript/Vue 示例保持多行结构。
- OpenSpec strict 校验和文档格式检查通过。
