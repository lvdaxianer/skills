# Design

## Context

现有知识治理已经把错误、near_miss、项目 lesson 和公共 Guardrail 写入文件事实源，并提供 SQLite 查询投影；`product-delivery-workflow` 也规定了 Worker、开发和验证阶段，但尚未有工具无关的 RSI 上下文快照。Claude、Codex、Kimi 等工具的规则文件、启动 Prompt 和 MCP 能力不同，不能把某一个工具的文件当成 RSI 事实源。

## Goals / Non-Goals

**Goals:**

- 生成 global、project、current 三层 RSI 快照，明确优先级、预算、来源和哈希。
- 让文件导入、CLI/Prompt、MCP 三类 Provider Adapter 消费同一份快照。
- 让控制平面在会话、任务、Worker、开发、测试和重试边界生成或恢复快照，并记录反馈写回。
- 保持文件事实源唯一，SQLite 仍然只是查询投影；不覆盖用户现有规则文件。

**Non-Goals:**

- 不实现每个 AI 厂商的登录、账户管理或远程 API 认证。
- 不把完整历史事件、敏感日志或未验证候选直接注入上下文。
- 不把 Provider Adapter 的生成文件作为事实源，也不要求所有工具都支持 MCP。

## Decisions

### 1. 使用双格式快照

快照同时保存结构化 JSON 和带边界标记的 Markdown。JSON 用于 API、MCP、manifest 和稳定测试；Markdown 用于 `CLAUDE.md`、`AGENTS.md` 或其他工具的文件导入。这样不会把工具格式差异反向带入 RSI 数据模型。

### 2. 采用三层合并和显式优先级

Builder 先读取全局已验证知识，再读取项目已验证知识，最后追加当前任务事实。最终决策优先级固定为用户当前要求、当前运行证据、项目 RSI、全局 RSI、默认规则。冲突条目不静默覆盖，必须保留来源和冲突标识。

### 3. 文件注入、MCP 查询和 Prompt 注入并存

启动时优先生成项目 `.product/rsi/providers/<provider>/current.md`，并返回用户规则文件的导入片段；运行中通过 MCP 查询详细条目和证据；不支持文件导入或 MCP 的工具使用带 snapshotId 和 hash 的 Prompt prelude。Adapter 只写 `.product/rsi/`，不改写用户的 `CLAUDE.md`、`AGENTS.md`。

### 4. 反馈写回走现有知识事实源

反馈通过统一接口追加到当前项目 `.product/knowledge/`，携带 runId、snapshotId、provider、证据引用和反馈类型。后续分类、人工归属和公共晋升仍使用既有治理门禁，避免 RSI 旁路产生第二套知识库。

### 5. MCP 使用 stdio JSON-RPC 边界

提供最小可用的 MCP stdio server，支持初始化、工具发现和工具调用；工具调用只返回受预算限制的 RSI JSON，不允许直接修改知识。反馈写回仍通过显式控制平面接口或 `record_rsi_feedback` 工具完成并保留审计。

## Risks / Trade-offs

- [快照过大] → 同时限制条目数和字节数，返回 truncated 和省略摘要，原始内容保留在文件中。
- [工具规则文件冲突] → 只生成独立文件和导入片段，不自动覆盖用户维护的规则文件。
- [多工具结果不一致] → 所有 Adapter 必须使用同一 snapshotId、contentHash 和 manifest，差异进入审计。
- [反馈污染公共知识] → 默认写入项目事实源，公共晋升继续要求脱敏、可移植、证据和独立复检。
- [MCP 工具不可用] → 文件或 Prompt Adapter 作为 fallback，并返回明确的注入状态，不伪装成功。

## Migration Plan

1. 保持现有 `KnowledgeStore`、`GlobalKnowledgeCatalog` 和 SQLite 投影不变，新增 Builder 从它们读取已验证条目。
2. 控制平面启动时创建 `.product/rsi/` 目录；首次任务开始时生成 provider snapshot 和 manifest。
3. 在 `product-delivery-workflow` 文档中增加 Adapter 接入步骤；已有 `CLAUDE.md`、`AGENTS.md` 不自动改写。
4. 旧运行没有 RSI snapshot 时只生成新的快照，不影响旧 PRD、开发和验证事实。
5. 回滚时停止调用 RSI API/Adapter 即可；既有知识事实、公共规则和 SQLite 投影不需要迁移。
