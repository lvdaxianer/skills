# Tasks

## 1. RSI 快照协议与构建器

- [x] 1.1 定义 RSI snapshot、layer、item、manifest 和 feedback schema，验证全局/项目/当前任务优先级、来源引用和冲突结构。
- [x] 1.2 实现基于现有 `GlobalKnowledgeCatalog` 与 `KnowledgeStore` 的快照构建、相关性排序、条目/字节预算、截断摘要、JSON/Markdown 双格式和原子落盘；验证快照哈希稳定、snapshotId 可恢复、unknown/pending/excluded 不进入默认上下文。
- [x] 1.3 为快照构建器添加 focused tests，并完成 `code-review-spec`、`backend-reliability-guidelines` 和 per-task audit 后提交合并。

## 2. Provider Adapter 与 MCP 查询

- [x] 2.1 定义 Provider Adapter 注册协议，支持文件导入片段、Prompt prelude、manifest 和 fallback 状态；验证不覆盖已有 `CLAUDE.md`/`AGENTS.md`。
- [x] 2.2 实现 stdio MCP server 的 initialize、tools/list、tools/call 和 RSI 查询工具；验证预算、snapshotId、工具错误和无事实写入边界。
- [x] 2.3 为 Claude/Codex/Kimi 通用文件与 Prompt 输出补齐中文接入说明和 focused tests，完成领域审计后提交合并。

## 3. 控制平面接入与反馈写回

- [ ] 3.1 新增 RSI 快照准备、查询和反馈写回 API，接入 loopback 控制平面并返回稳定错误、manifest 和 snapshotId。
- [ ] 3.2 将会话启动、任务开始、Worker 创建、开发/测试/重试和结束写回时机写入 `product-delivery-workflow` 与控制平面启动协议；验证 API、文件事实和 SQLite 投影边界一致。
- [ ] 3.3 添加多项目端到端验证，覆盖全局先于项目、项目覆盖、工具快照一致性、反馈回写和失败重试后生成增量快照；完成领域审计后提交合并。

## 4. 集成、文档与最终审计

- [ ] 4.1 更新中文 README、知识模型、验证证据和 Provider Adapter 配置示例，验证新用户能够生成快照并接入至少一种文件方式和 MCP 方式。
- [ ] 4.2 执行全量测试、全部 Node 语法检查、OpenSpec strict、快照/MCP 烟囱验证和最终代码审计；补充 verification.md 并归档 change。

## Workflow follow-up

- 每个任务使用独立 worktree，完成 RED/GREEN、领域 review、per-task audit、提交后合并回 `master`。
- 全部任务完成后同步主规格、归档 OpenSpec change，并确认 `master` 干净。
