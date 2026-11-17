# T1 任务级证据：Skill 重命名与当前引用迁移

## Gate

PASS：当前总控 Skill 已从 `product-delivery-workflow` 迁移为 `prodflow`。

## Evidence

- `node --test prodflow/test/prodflow-rename.test.mjs`：1/1 通过。
- `npm test --prefix prodflow/references/control-plane`：79/79 通过。
- `prodflow/SKILL.md` frontmatter 的 `name` 为 `prodflow`。
- 当前有效文件已使用 `prodflow/` 路径和 `prodflow` 运行来源标识。
- 旧名称仅保留在兼容 MCP `serverInfo`、相关测试断言、迁移说明和历史 OpenSpec 归档中。
- `CLAUDE.md`、`AGENTS.md`、HTTP API 路径和 MCP 工具能力未被改写。

## Review notes

- 这是目录和名称重构，不改变业务行为。
- MCP 协议服务名继续保持 `product-delivery-workflow-rsi`，避免已有客户端失效。
- README 详细流程内容由 T2 单独负责，避免混淆任务边界。

## Result

T1.1、T1.2、T1.3 完成，允许进入 README 任务。
