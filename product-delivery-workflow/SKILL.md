---
name: product-delivery-workflow
description: "中文产品到交付总控流程：按任务复杂度分流，必要时生成并双 Worker 复检 PRD，调度开发、验证、知识回流和可选部署。"
---

# Product Delivery Workflow

这是产品需求到工程交付的总控 Skill。它负责判断任务应走多重流程、维护可恢复的运行状态、调度其他 Skill 和 Worker，并要求每个成功结论都有可回放证据。

它不复制领域规范：工程实现、TDD、代码审查、前后端可靠性、日志、REST API 文档、项目卫生和部署规则，分别以被调用的权威 Skill 为准。

## 总原则

- 所有新增文档、协议、状态说明和操作提示使用中文。
- 简单内容修改和明确 Bug 不强制生成完整 PRD；新功能和高风险变更必须经过 PRD 门禁。
- 低风险不确定性可以自动采用默认值，但必须写入假设；高风险歧义必须暂停。
- 主 Worker 可以生成和修订 PRD，两个复检 Worker 必须使用独立上下文。
- Worker 只能读取目标消息和冻结输入快照，不能读取隐藏思维链或其他复检 Worker 的临时结论。
- 所有 Worker 输入引用、输出、状态、决策和证据追加写入交互账本。
- 原始错误先落到项目知识库，公共知识必须脱敏、抽象、复检后才能晋升。
- 没有可观察证据时不得标记 `VERIFIED` 或 `DEPLOYED`。
- 部署不是默认步骤；只有用户在全部开发、测试和审计完成后明确授权，才能调用 `service-deployment`。

## 每次运行的控制平面预检

总控流程开始时必须先读取 `references/control-plane-startup.md`，并执行以下顺序：

1. 确定当前项目根目录和公共知识根目录。
2. 检查配置的本地 `127.0.0.1:<port>/healthz`。
3. 检查服务实例的项目根目录、服务版本和运行元数据是否匹配。
4. 若未监听，启动 `references/control-plane/` 中的 Node 服务。
5. 验证 `/healthz` 和 `/readyz`；端口被未知进程占用时不得杀进程。
6. 服务通过就绪检查后，创建本次 `run` 和追加式 `interaction.jsonl`。

控制平面不可用时必须保存可诊断错误并停止总控流程，不能静默回退到不可恢复的内存状态。

## Intake Router：入口分流

先读取 `references/intake-routing.md`，将输入分配到一个档位：

| 档位 | 典型输入 | 产物 |
|---|---|---|
| `quick-action` | 简单格式、局部说明、不改变行为的修改 | 最小任务记录和验证证据 |
| `content` | 文章、README、接口文档 | 内容 brief、范围和审阅证据 |
| `bugfix` | 复现明确、预期明确、边界可控的 Bug | Bug Record、回归测试和证据 |
| `feature` | 新流程、API、数据模型或业务规则 | 完整 PRD、任务和开发交接 |
| `high-risk` | 权限、敏感数据、支付、迁移、生产发布 | 完整 PRD、高风险门禁和人工决策 |

人工可以在控制台覆盖档位，但必须记录原始判断、覆盖值、操作者、原因和时间。

## 完整功能流程

`feature` 和 `high-risk` 按以下状态推进：

```text
INTAKE
  → PRD_DRAFT
  → PRD_REVIEWING
  → PRD_VERIFIED
  → DEVELOPMENT_READY
  → DEVELOPMENT_RUNNING
  → TASK_VERIFIED
  → FINAL_AUDIT_PASSED
  → DEPLOYMENT_DECISION_REQUIRED
  → VERIFIED_NOT_DEPLOYED | DEPLOYED | ROLLED_BACK | FAILED
```

每个状态变化都必须写入交互账本，并引用对应的 PRD、任务、测试或部署证据。

## PRD 三 Worker 门禁

主 Worker 必须按固定结构生成 PRD：背景、目标、角色、用户故事、主/异常流程、业务规则、数据和状态、权限、范围/非目标、验收标准、测试意图、假设、风险和依赖。

每条需求、用户故事、规则、验收标准和测试意图都必须有稳定 ID，并标记来源：`explicit`、`inferred`、`default` 或 `project-context`。

主 Worker 生成一个 PRD 版本后，调度两个独立上下文：

- 产品复检 Worker：检查目标、价值、范围、流程、业务规则、遗漏和冲突。
- 研发复检 Worker：检查可测试性、任务拆分、依赖、权限、数据、异常路径和工程可执行性。

两个子 Worker 只能读取：原始需求、项目事实、PRD 当前版本和评审规则。不得读取主 Worker 隐藏推理、其他子 Worker 结果或未冻结的历史草稿。

只有以下条件同时满足，才能写入 `PRD_VERIFIED`：

```text
两个 Worker 的 status=succeeded
+ 两个 Worker 的 verdict=pass
+ 没有高风险 block
+ 验收标准、任务依赖和验证计划完整
+ 没有未处理 blocked 假设
```

任一 Worker 返回 `revise` 或 `block` 时，主 Worker 必须生成新 PRD 版本并重新创建两个独立上下文。评审结果不得互相可见。

## Worker 交互账本

每条消息必须至少包含：

```yaml
message_id: MSG-...
run_id: RUN-...
round: 1
from: main-worker
to: product-review-worker
kind: inform | request | response | ack | block
action: none | execute
status: pending | processing | succeeded | failed | blocked
verdict: pass | revise | block | null
correlation_id: ...
input_refs: []
output_refs: []
```

只有 `action=execute` 且 `to` 指向当前 Worker 的消息才进入执行队列。`inform` 只记录，不触发执行。账本只追加，不覆盖历史轮次。

## 知识与错误回流

所有 Worker 失败、测试失败、验收失败、部署失败、人工修订、重试和近失误都要立即追加为错误事件。后台分类 Worker 再提出 `common`、`project` 或 `hybrid` 建议；人工覆盖优先于自动建议。

公共知识和项目知识的读取边界、晋升条件和目录约定，以 `references/knowledge-model.md` 为准。Worker 每次只读取有限大小的已发布 `lesson-snapshot`，不把全部历史日志塞进上下文。

RSI 上下文注入的事实源、文件/Prompt/MCP 三种 Adapter、注入时机和不覆盖用户规则文件的边界，以 `references/rsi-provider-adapters.md` 为准。

## 验证与成功证据

每个验收标准必须绑定验证方式、预期结果、实际结果和证据引用。涉及页面时，验证必须优先使用浏览器自动化，保存操作、断言、URL、截图、trace、console/network 摘要和下载 checksum；后端还要保存 API、业务状态和健康/冒烟证据。

缺少必要证据、证据与当前 commit/release 不匹配，或存在关键 console/network 错误时，只能标记 `FAILED` 或 `INCONCLUSIVE`。

## 下游 Skill 交接

- `DEVELOPMENT_READY` 后，将 `handoff.md` 和冻结的任务/验收引用交给 `development-workflow`。工程 Skill 继续负责分支、OpenSpec、TDD、领域 review、提交和合并。
- 全部任务、验证和最终审计完成后，进入 `DEPLOYMENT_DECISION_REQUIRED`。
- 用户明确选择不部署时，标记 `VERIFIED_NOT_DEPLOYED`。
- 用户明确选择部署并提供必需参数时，读取并调用 `service-deployment`；缺少参数时只生成 dry-run 报告，不猜测路径、健康命令、迁移安全性或秘密。

## 必须读取的参考文件

按当前阶段读取，不把参考文件内容复制成另一套规则：

- `references/intake-routing.md`
- `references/worker-protocol.md`
- `references/control-plane-startup.md`
- `references/knowledge-model.md`
- `references/rsi-provider-adapters.md`
- `references/verification-evidence.md`
- `references/development-workflow-adapter.md`
- `references/service-deployment-adapter.md`

## 进度报告

总控运行中使用以下格式：

```markdown
Current task: <当前任务>
Gate: <当前门禁>
Opt-outs: <none | no OpenSpec | no branch | ...>
Evidence: <命令、文件、run 或证据引用>
```
