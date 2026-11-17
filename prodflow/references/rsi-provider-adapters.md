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
├── providers/<provider>/current.md
├── providers/<provider>/current.manifest.json
└── audit.jsonl
```

运行级 RSI 使用事实另外写入：

```text
.product/runs/<runId>/
├── rsi-usage.jsonl       # 权威追加事实
└── worker-result.json     # 无 MCP 时的结构化回传（可选）
.product/runs/rsi-usage.sqlite  # 可重建的统计投影
```

`CLAUDE.md`、`AGENTS.md`、项目规则文件属于用户维护范围。Adapter 只返回导入片段或 Prompt prelude，绝不覆盖这些文件。

## 三种接入方式

| 方式 | 适用工具 | 行为 | 结果凭证 |
| --- | --- | --- | --- |
| 文件导入 | Claude、Codex、Kimi、Cursor 等支持读取文件的工具 | 写入 `.product/rsi/providers/<provider>/current.md`，返回导入片段 | Provider manifest、文件路径、snapshotId、contentHash |
| Prompt prelude | 不支持文件导入或需要临时会话的工具 | 返回带 snapshotId/hash 的受字节预算限制文本 | `promptBytes`、`truncated`、manifest |
| MCP stdio | 支持 MCP 的工具 | 只读查询快照层、证据和 manifest | JSON-RPC 响应、snapshotId、稳定错误码 |

三种方式消费同一个快照，不各自重新分类或重写事实。MCP 查询默认不写知识事实；使用情况由控制平面显式接收并写入运行事实。SQLite 只做可重建的统计投影，JSONL 才是权威事实源。

## 使用回传与统计阶段

每个被注入的 RSI item 都按同一个 `runId`、`snapshotId`、`workerId` 追踪以下阶段：

| 阶段 | 含义 | 谁产生 | 是否代表语义使用 |
| --- | --- | --- | --- |
| `injected` | Provider 已准备文件、Prompt 或 MCP 配置 | Adapter | 否，只证明已准备 |
| `loaded` | Worker 通过 `rsi_get_context` 收到该 item | MCP Server | 否，只证明工具返回 |
| `consulted` | Worker 声明在分析中参考了该 item | Worker 回传 | 是，属于显式声明 |
| `applied` | Worker 声明已将 item 应用于结果，并提供证据引用 | Worker 回传/后续验收 | 是，仍需按证据门禁确认 |
| `unknown` | 运行结束时仍未得到 `consulted`/`applied` 回传 | `rsi_finalize_run` | 否，表示未知，不表示未使用 |

`loaded` 只能证明 MCP 返回了内容，不能证明模型理解或采纳了内容。`consulted`、`applied` 必须由 Worker 通过 MCP、HTTP 或文件回传声明；系统不能从普通聊天文本中可靠推断隐式使用。没有回传时，运行保持未完成；只有显式 finalize 后才会把未解决 item 标为 `unknown`。

控制平面将使用事实同时写入 `.product/runs/<runId>/rsi-usage.jsonl` 和 `.product/runs/rsi-usage.sqlite`；重复身份和阶段的回传是幂等的。

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
- `rsi_report_usage`：回传本次 Worker 对 RSI item 的 `consulted` 或 `applied` 声明及证据引用。
- `rsi_finalize_run`：声明 Worker 已完成回传；未解决的已注入 item 才会进入 `unknown`。

工具只允许读取已落盘快照。`snapshotId` 不存在、层名称无效或条目不存在时，返回 `isError=true` 和稳定错误码，不返回伪成功。

当 Worker 调用 `rsi_get_context` 时，响应中的 `usageProtocol` 会提供本次 `runId`、`snapshotId`、`workerId`、回传工具名和 finalize 工具名。Worker 应使用这些身份原样回传，不能自行改写 item 身份。

## 注入时机

1. 会话启动：控制平面创建当前项目的初始快照，准备文件 Adapter 或 MCP 查询入口。
2. 任务开始：把当前任务事实追加到 current 层；记录同一 `snapshotId` 和 manifest。
3. Worker 创建：主 Worker 和两个独立复检 Worker 各自读取同一快照内容，但仍保留自己的 Worker 上下文边界。
4. 开发、测试和重试：没有新事实时恢复原快照；有新验证、失败或人工修改时重新生成增量快照。
5. 结束与反馈：将成功前近失误、失败、修订和证据交给控制平面写回项目事实源，下一次运行再经过治理门禁进入上下文。

文件适合启动时的稳定导入，Prompt 适合一次性任务，MCP 适合运行中按需查看证据。三者可以同时启用，但必须展示相同的 `snapshotId` 和 `contentHash`。

## 控制平面调用

快照准备完成后，由控制平面显式执行注入：

```bash
curl --request POST \
  'http://127.0.0.1:<port>/api/rsi/snapshots/RSI-SNAPSHOT-<UUID>/inject/claude' \
  --header 'Content-Type: application/json' \
  --data '{"mode":"file","runId":"RUN-003","workerId":"main-worker"}'
```

请求体的 `mode` 可取 `file`、`prompt`、`mcp`。返回值必须检查 `status`：`injected` 表示文件或 Prompt 已准备好，`available` 表示 MCP 启动配置可用，`fallback` 表示发生降级。失败时 HTTP 响应返回稳定错误码，审计记录为 `failed`。

每次调用都会向 `.product/rsi/audit.jsonl` 追加 JSON 记录。这个文件只保存运行证据，不会被作为知识上下文读取；公共或项目知识仍然只能通过治理门禁进入下一份 RSI 快照。

## 独立 MCP 命令

```bash
npm run mcp --prefix prodflow/references/control-plane -- \
  --projectRoot /absolute/path/to/project \
  --sharedKnowledgeRoot /absolute/path/to/shared-knowledge \
  --workerId main-worker
```

MCP 客户端通过 stdin/stdout 使用 JSON-RPC。stdout 不混入日志，启动错误写 stderr；客户端关闭 stdin 后进程正常退出。MCP 只读快照，不会自动写入反馈或知识事实。

## Worker 回传方式

### MCP 回传（优先）

Worker 先读取上下文，再回传实际使用声明，最后结束运行：

```json
{
  "runId": "RUN-003",
  "workerId": "main-worker",
  "snapshotId": "RSI-SNAPSHOT-<UUID>",
  "usages": [
    {
      "itemId": "guardrail-api-error",
      "stage": "consulted",
      "evidenceRefs": ["handoff.md#acceptance-1"]
    },
    {
      "itemId": "lesson-browser-retry",
      "stage": "applied",
      "evidenceRefs": ["verification/evidence/browser-001.json"]
    }
  ]
}
```

随后调用 `rsi_finalize_run`。回传工具由 Control Plane 接收，先追加 JSONL 事实，再更新 SQLite 统计；相同身份和阶段重复回传是幂等的。

### HTTP 回传

没有可用 MCP 但 Worker Runner 能发送 HTTP 时，调用：

```http
POST /api/rsi/runs/RUN-003/worker-result
Content-Type: application/json

{
  "workerId": "main-worker",
  "snapshotId": "RSI-SNAPSHOT-<UUID>",
  "complete": true,
  "rsiUsage": [
    {"itemId":"guardrail-api-error","stage":"consulted","evidenceRefs":["handoff.md#acceptance-1"]}
  ]
}
```

### 文件回传

直接聊天通常绕过 Worker Runner，系统无法自动接收模型返回。若宿主工具可以保存结构化结果，写入 `.product/runs/<runId>/worker-result.json`，内容使用 HTTP 示例中的 `workerId`、`snapshotId`、`complete` 和 `rsiUsage` 字段，再由控制平面导入。若既没有 MCP，也没有结构化文件/HTTP 回传，只能保留未完成状态，或由人工/后续 Worker 显式导入；不能把“没有看到回传”解释为“没有使用”。

## 使用边界

- `unknown`、`pending`、`candidate`、`excluded` 和 `deprecated` 不进入默认可执行上下文。
- 项目层可以覆盖公共层，但必须保留 `conflictRefs` 和双方来源。
- 快照同时受条目数和字节数限制；截断时返回 `omittedItems` 和 `omittedByLayer`。
- Adapter 失败时返回 `fallback` 或稳定错误，调用方必须根据状态决定重试，不能把失败当作已注入。
