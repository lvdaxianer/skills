# Worker 交互协议

## Worker 角色

| Worker | 职责 | 可以读取 | 不可以读取 |
|---|---|---|---|
| `main-prd` | 生成和修订 PRD | 原始需求、项目事实、规则、冻结知识快照 | 其他 Worker 的隐藏推理 |
| `product-review` | 检查目标、价值、范围、流程和业务规则 | 原始需求、当前 PRD、规则、冻结知识快照 | `engineering-review` 临时结果 |
| `engineering-review` | 检查可测试性、依赖、任务和工程风险 | 原始需求、当前 PRD、规则、冻结知识快照 | `product-review` 临时结果 |
| `verification` | 执行验收并收集证据 | 冻结 PRD、任务、验收契约、环境引用 | 未冻结的 PRD 草稿 |
| `knowledge-classifier` | 提出错误范围和复用建议 | 错误事件、证据引用、分类规则 | 隐藏推理和无关项目原始资料 |

## 输入快照

每一轮 Worker 必须绑定不可变快照：

```yaml
snapshot_id: SNAP-...
run_id: RUN-...
prd_version: prd-v1
source_refs: []
rule_refs: []
lesson_refs: []
context_hash: sha256:...
```

Worker 可以读取快照引用的文件，但不能修改快照。PRD 修订后必须创建新版本和新快照。

## 消息字段

```yaml
message_id: MSG-...
run_id: RUN-...
round: 1
from: main-prd
to: product-review
kind: inform | request | response | ack | block
action: none | execute
status: pending | processing | succeeded | failed | blocked
verdict: pass | revise | block | null
correlation_id: REVIEW-...
input_refs: []
output_refs: []
created_at: ...
```

`status` 表示 Worker 动作是否完成；`verdict` 表示评审结论。评审成功但发现需求问题时，允许 `status=succeeded`、`verdict=revise`。

## 路由和屏障

- 只有 `action=execute` 且 `to` 是当前 Worker 的消息才进入待执行队列。
- `inform` 只作为事实记录，不触发 Worker 动作。
- 两个 PRD 复检 Worker 的输出在本轮屏障关闭前互不可见。
- 主 Worker 只有在两个复检结果都落盘后才能消费评审结果。
- 任何 `block` 都阻止进入下一状态；`revise` 会生成下一 PRD 版本。
- 消息账本采用追加写入，重复消费必须依据 `message_id` 或 `correlation_id` 幂等处理。

## 可审计输出

Worker 不写隐藏思维链。必须写结构化问题、证据引用、结论、需要执行的动作和简短可验证理由。失败、超时、重试和人工覆盖都必须写入账本。
