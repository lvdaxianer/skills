# T3 任务级证据：最终集成审计

## Gate

PASS：RSI 从快照生成、Provider 注入、JSONL 审计到独立 MCP 启动的运行闭环已在 master 基线验证。

## Evidence

- `npm test`：79/79 通过。
- `openspec validate --all --strict`：29/29 通过。
- `node --check src/mcp-start.mjs`、`src/rsi-api.mjs`、`src/rsi-provider-adapter.mjs`、`src/server.mjs`：全部通过。
- `npm run mcp -- --help`：退出码 0；帮助信息写 stderr，stdout 未混入非 JSON-RPC 内容。
- 独立 MCP smoke test：初始化和 `tools/list` 均返回合法 JSON-RPC，返回 3 个 RSI 工具。
- 控制平面集成测试：文件、Prompt、MCP、fallback、failed 审计和宿主规则文件保护均通过。

## Final decision

允许归档 `rsi-runtime-integration`，并将运行时接入结果交付给后续 product-delivery-workflow 使用。部署仍不在本变更范围内，必须由最终流程单独询问用户后交给 `service-deployment`。
