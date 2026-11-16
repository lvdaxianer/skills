# 知识模型与归属协议

## 目录边界

项目知识默认写入：

```text
<project-root>/.product/knowledge/
├── events/
├── incidents/
├── lessons/
├── guardrails/
├── evidence/
├── adapters/
└── index.yaml
```

RSI 生成的上下文快照不替代上述事实源，单独写入项目：

```text
<project-root>/.product/rsi/
├── current.json
├── current.md
├── current.manifest.json
├── snapshots/<snapshotId>.json
├── snapshots/<snapshotId>.md
└── providers/<provider>/current.md
```

`current` 和 `snapshots` 是可恢复的派生上下文；`providers` 只服务文件导入。它们都必须携带 `schemaVersion`、`snapshotId`、`sourceHash`、`contentHash` 和来源 manifest，不能反向成为知识事实源，也不能覆盖 `CLAUDE.md`、`AGENTS.md` 或用户项目规则。

公共知识写入可配置的共享根目录：

```text
<shared-knowledge-root>/common/
├── issues/
├── lessons/
└── guardrails/
```

原始事件、日志、截图、trace、部署报告和项目敏感事实只能留在项目范围。公共知识只能保存脱敏后的通用问题、根因、解决方案、触发条件和验证方式。

## 生命周期

```text
event
→ incident
→ lesson candidate
→ guardrail candidate
→ validated
→ published
→ deprecated / excluded
```

新事件先使用：

```yaml
scope: unknown
classification_status: pending
lifecycle: active
```

后台分类只能提出建议，不能直接发布公共 Guardrail。

## 归属判断

公共候选必须满足：去掉项目名、API、表结构和环境路径后仍成立；根因属于流程、工具或通用工程不变量；能够转成共享检查；有多个独立项目/运行复现或明确规范依据；且全局应用误伤风险可接受。

项目知识包括业务规则、领域模型、项目 API、数据表、目录、环境变量、部署路径、健康命令和项目特有验证脚本。通用原则加项目实现时拆成 `common` 规则和项目 `adapter`。

证据不足时保持 `unknown`，不强行归类。

## 人工操作

人工可修改 `scope`、严重级别、问题描述、根因、解决方案、发布状态和排除状态。每次修改必须追加操作者、时间、原值、新值、原因和受影响版本。

排除使用 `lifecycle=excluded` 或 `deprecated`，不物理删除原始证据。排除记录不进入 Worker 的知识快照。

## 读取快照

每次运行创建有限大小的 `lesson-snapshot`，只包含：

- 当前项目和当前档位匹配的已发布 Guardrail；
- 高风险或重复发生的相关规则；
- 公共规则及其项目 adapter；
- 完整证据的 ID、路径和 hash，不直接展开全部日志。

公共 Guardrail 定义最低安全和质量底线；项目规则可以更严格，但不能静默削弱公共规则。

## RSI 上下文分层

默认快照固定按 `global → project → current` 输出。公共层先提供可移植底线，项目层可以针对项目事实覆盖并保留 `conflictRefs`，当前层记录用户当前要求和本次运行证据。决策优先级为：用户当前要求、当前运行证据、项目 RSI、公共 RSI、默认规则。

只允许 `active` 且已验证的事实进入默认可执行上下文。`unknown`、`pending`、`candidate`、`excluded` 和 `deprecated` 只能作为待治理引用保留，不能直接指导 Worker、开发或测试。快照同时受条目数和字节预算限制，截断必须记录 `omittedItems` 与 `omittedByLayer`。
