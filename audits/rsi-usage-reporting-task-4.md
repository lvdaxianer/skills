# T4 任务级证据：文档与集成最终验证

## Gate

PASS：中文 Skill、README、Provider Adapter 和控制平面文档已统一说明 RSI 使用阶段、MCP/HTTP/文件回传、直接聊天边界、unknown 结算和事实/统计投影关系；主规格已同步，所有任务和验证均完成。

## Evidence

- `npm test --prefix prodflow/references/control-plane`：88/88 通过。
- `node --test prodflow/test/*.mjs`：3/3 通过。
- `node --check`：RSI 使用存储、SQLite 投影、MCP Server、Provider Adapter、RSI API 和控制平面 Server 均通过。
- `openspec validate --all --strict`：32/32 通过，包含新增 `spec/rsi-usage-reporting` 和 active change。
- `git diff --check`：通过。
- 文档存在性、占位词检查：通过；prodflow README 链接与关键命令专项测试通过。
- 主规格已从 `openspec/changes/rsi-usage-reporting/specs/rsi-usage-reporting/spec.md` 同步为 `openspec/specs/rsi-usage-reporting/spec.md`。
- 文档明确：`loaded` 仅证明 MCP 返回；`consulted`/`applied` 必须由 Worker 显式回传；没有回传不等于未使用；显式 finalize 后未解决 item 才进入 `unknown`。
- 文档明确直接 Claude/Codex/Kimi 聊天绕过 Worker Runner 时的能力边界，以及 MCP、HTTP、`worker-result.json` 三条可回传路径。

## Code review

### 必须修复 (CRITICAL)

- 无。

### 应该修复 (HIGH/MEDIUM)

- 无。文档中的阶段、身份字段、回传入口和事实路径与已通过的控制平面测试保持一致。

### 可优化 (LOW)

- 无。后续可在实际宿主工具接入后补充各工具的自动化回传适配，但不影响当前协议闭环。

## Result

T4.1、T4.2 完成，允许提交、合并并归档 `rsi-usage-reporting`。
