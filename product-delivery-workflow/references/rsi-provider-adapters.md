# RSI 上下文注入与 Provider Adapter

## 事实源与生成物

RSI 的事实源仍然是公共知识和项目知识文件，SQLite 只做查询投影。快照生成器把已验证的全局、项目和当前事实合并为同一份 `schemaVersion=1` 快照，并记录 `snapshotId`、`sourceHash`、`contentHash`、来源证据和预算。

生成物只放在项目 `.product/rsi/`：

```text
.product/rsi/
├── current.json
├── current.md
├── current.manifest.json
├── snapshots/<snapshotId>.json
├── snapshots/<snapshotId>.md
└── providers/<provider>/current.md
```

`CLAUDE.md`、`AGENTS.md`、项目规则文件属于用户维护范围。Adapter 只返回导入片段或 Prompt prelude，绝不覆盖这些文件。

## 三种接入方式

| 方式 | 适用工具 | 行为 | 结果凭证 |
| --- | --- | --- | --- |
| 文件导入 | Claude、Codex、Kimi、Cursor 等支持读取文件的工具 | 写入 `.product/rsi/providers/<provider>/current.md`，返回导入片段 | Provider manifest、文件路径、snapshotId、contentHash |
| Prompt prelude | 不支持文件导入或需要临时会话的工具 | 返回带 snapshotId/hash 的受字节预算限制文本 | `promptBytes`、`truncated`、manifest |
| MCP stdio | 支持 MCP 的工具 | 只读查询快照层、证据和 manifest | JSON-RPC 响应、snapshotId、稳定错误码 |

三种方式消费同一个快照，不各自重新分类或重写事实。MCP 查询默认不写知识事实；反馈写回由控制平面显式接口负责。

## Provider 示例

文件 Adapter 的结果中会返回对应导入片段：

- Claude：`@.product/rsi/providers/claude/current.md`
- Codex：`请先读取 .product/rsi/providers/codex/current.md，再回答当前任务。`
- Kimi：`请先读取 .product/rsi/providers/kimi/current.md，再回答当前任务。`
- 其他工具：使用 generic Adapter 的读取提示，或使用 Prompt prelude。

这些片段是交给对应工具的入口提示，不是新的事实源。

## MCP 工具

MCP Server 使用 stdio JSON-RPC，不通过控制平面的 HTTP 端口暴露：

- `rsi_get_context`：按 `snapshotId` 读取 global、project、current 层。
- `rsi_get_evidence`：读取条目的证据引用和来源范围。
- `rsi_get_manifest`：读取来源哈希、内容哈希和 Provider 无关 manifest。

工具只允许读取已落盘快照。`snapshotId` 不存在、层名称无效或条目不存在时，返回 `isError=true` 和稳定错误码，不返回伪成功。

## 注入时机

1. 会话启动：控制平面创建当前项目的初始快照，准备文件 Adapter 或 MCP 查询入口。
2. 任务开始：把当前任务事实追加到 current 层；记录同一 `snapshotId` 和 manifest。
3. Worker 创建：主 Worker 和两个独立复检 Worker 各自读取同一快照内容，但仍保留自己的 Worker 上下文边界。
4. 开发、测试和重试：没有新事实时恢复原快照；有新验证、失败或人工修改时重新生成增量快照。
5. 结束与反馈：将成功前近失误、失败、修订和证据交给控制平面写回项目事实源，下一次运行再经过治理门禁进入上下文。

文件适合启动时的稳定导入，Prompt 适合一次性任务，MCP 适合运行中按需查看证据。三者可以同时启用，但必须展示相同的 `snapshotId` 和 `contentHash`。

## 使用边界

- `unknown`、`pending`、`candidate`、`excluded` 和 `deprecated` 不进入默认可执行上下文。
- 项目层可以覆盖公共层，但必须保留 `conflictRefs` 和双方来源。
- 快照同时受条目数和字节数限制；截断时返回 `omittedItems` 和 `omittedByLayer`。
- Adapter 失败时返回 `fallback` 或稳定错误，调用方必须根据状态决定重试，不能把失败当作已注入。
