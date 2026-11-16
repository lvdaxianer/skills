# T2 任务级证据：独立 MCP 启动入口

## Gate

PASS：MCP 已有独立 Node stdio 启动器和 npm 入口，不依赖 HTTP 端口，也不覆盖宿主规则文件。

## Evidence

- RED：启动器不存在时，`node --test test/rsi-mcp-start.test.mjs` 明确因 `src/mcp-start.mjs` 缺失失败。
- GREEN：同一测试通过，独立子进程初始化并返回 `tools/list`；stdout 每行均可解析为 JSON-RPC，stderr 为空，退出码为 0。
- `npm test`：79/79 通过。
- `npm run mcp -- --projectRoot <项目目录> --sharedKnowledgeRoot <公共知识目录>` 已写入启动文档和 API 文档。
- `--snapshotId` 存在时，启动器会在进入 stdio 循环前验证快照可读性。

## Review notes

- stdout 只允许协议响应；启动错误写 stderr 并以非零状态退出。
- MCP 只读 RSI 快照，不自动写反馈或知识事实。
- 控制平面返回的 MCP 配置只代表 `available`，不伪装为已替客户端注册。

## Result

T2.1、T2.2 完成，允许进入最终集成审计。
