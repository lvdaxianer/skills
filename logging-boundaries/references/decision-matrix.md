# 日志决策矩阵

> 速查表：**什么事件 → 什么级别 → 打什么字段**。写日志前对照此表，review 时优先扫此表。

---

## 一、总览：4 大级别的定位

| 级别 | 定位 | 生产是否常开 | 允许打完整 body | 典型内容 |
|------|------|-------------|---------------|---------|
| **DEBUG** | 排查用「摄像头」 | ❌ 默认关，**必须支持热开** | ✅ 仅安全诊断快照（脱敏+截断） | HTTP 全过程、SQL 参数、中间步骤 |
| **INFO** | 业务里程碑 / 系统关键事件 | ✅ 常开 | ⚠️ 仅小型安全 DTO 受控全量 | 请求入口、成交、状态跃迁 |
| **WARN** | 值得关注但不阻断 | ✅ 常开 + 安全上下文 | ⚠️ 仅必要的脱敏限长快照 | 校验失败、库存不足、慢请求、外部调用失败、重试 |
| **ERROR** | 未预期异常 / 需要告警 | ✅ 常开 + stack | ⚠️ 仅必要的脱敏限长快照 | NPE、超时、OOM、死信、任务整体失败 |

**关键理解**：
- INFO 选择业务摘要或受控全量中的一种常开视角；DEBUG 补充脱敏、限长的诊断细节，不得借 DEBUG 绕过敏感字段规则。
- WARN 是「异常但可预期」，ERROR 是「异常且不可预期」。校验失败是 WARN（业务预期内），NPE 是 ERROR（代码 bug）。

---

## 二、通用事件决策表

| 事件类型 | 必打? | 级别 | 生产常开? | 必带字段 | 典型示例 |
|---------|------|------|----------|---------|---------|
| **核心业务入口** | ✅ | INFO | ✅ | traceId, userId, 关键业务字段 | `createOrder start, skuId=X, qty=2` |
| **核心业务出口（成功）** | ✅ | INFO | ✅ | 业务ID, 结果 | `createOrder done, orderId=O001, amount=199` |
| **状态跃迁** | ✅ | INFO | ✅ | 业务ID, 旧→新, 触发源 | `order state, id=O001, PAID→SHIPPED, by=system` |
| **参数校验失败** | ✅ | WARN | ✅ | 字段名 + 错误码（**不带值**） | `validation failed, field=phone, code=INVALID` |
| **业务预期异常** | ✅ | WARN | ✅ | 决策字段（need/remain） | `stock not enough, need=5, remain=1` |
| **幂等命中（重复请求）** | ✅ | INFO | ✅ | idempotentKey, returnCached | `idempotent hit, key=xxx, returnCached=true` |
| **慢外部调用（超阈值）** | ✅ | WARN | ✅ | URL, cost, 脱敏 body | `HTTP slow, GET /product cost=1203ms` |
| **外部调用失败（4xx/5xx）** | ✅ | WARN | ✅ | URL, status, 脱敏 body | `HTTP fail, status=500, body=***` |
| **降级/熔断触发** | ✅ | WARN | ✅ | 服务名, 原因, fallback | `fallback triggered, service=stock, cause=timeout` |
| **未预期异常** | ✅ | ERROR | ✅ | 完整 stack + 上下文 | `unexpected error, orderId=O001 \n <stack>` |
| **HTTP 请求全过程细节** | ❌ | DEBUG | ❌ 热开 | URL, 安全 headers, 诊断快照 | `HTTP GET /x status=200 cost=45ms body=...` |
| **SQL / 参数细节** | ❌ | DEBUG | ❌ 热开 | SQL, 参数 | 交给 P6Spy / MyBatis 日志 |
| **DAO 增删改查** | ❌ | — | — | — | **DAO 层不打业务日志**，交给慢SQL监控 |
| **简单 DTO 转换** | ❌ | — | — | — | 不打 |
| **方法进入/退出** | ❌ | — | — | — | 用 [`@Loggable` 切面](../scenarios/aop-loggable.md)统一 |
| **循环内每次迭代** | ❌❌ | — | — | — | **绝对禁止**，改用汇总 |
| **QPS/RT/成功率等数值** | ❌❌ | — | — | — | 用 Metrics，不用 log |

---

## 三、定时任务事件表

> 定时任务默认采用“正常成功静默、异常和诊断条件输出”。任务入口仍必须建立
> 本次执行的 trace context，但生成 traceId 本身不等于必须打印日志；只有已经
> 产生的日志才能通过 traceId 查询，事后不能补回被抑制的过程日志。

| 事件 | 必打? | 级别 | 常开? | 必带字段 |
|------|------|------|------|---------|
| 任务开始（诊断运行） | 条件 | INFO | ❌ 诊断开关 | jobName, jobRunId, traceId, params 摘要 |
| 任务结束（正常成功） | ❌ | — | — | 结果交给 Metrics/执行记录 |
| 任务结束（诊断或状态变化） | 条件 | INFO | ❌ 诊断/状态变化 | jobName, jobRunId, traceId, cost, processed, success, fail |
| 任务部分失败（汇总） | ✅ | WARN | ✅ | jobName, jobRunId, traceId, fail, 限量失败样本 |
| 任务失败（整体） | ✅ | ERROR | ✅ | jobName, jobRunId, traceId, cost, stack |
| 单条处理成功 | ❌ | DEBUG | ❌ 热开 | itemId |
| 单条处理失败 | ⚠️ 收敛 | WARN | ✅ | 计数器聚合，最后限量输出失败样本 |
| 进度心跳（诊断/异常长任务） | 条件 | INFO | ❌ 诊断或异常 | traceId, 每 N 秒或 M% 输出一次进度 |

详见 [`scenarios/scheduled-job.md`](../scenarios/scheduled-job.md)。

---

## 四、跨服务 traceId 查询边界

同一请求、消息或任务派生的 HTTP/RPC/MQ 调用 MUST 传播同一个 `traceId`；参与
服务的关键业务日志 MUST 自动带上该 ID。日志平台按 `traceId` 查询时，可以聚合
已经产生的跨服务日志；如果某个服务按默认静默策略没有产生正常成功日志，查询
不会凭空生成该服务的过程日志。完整链路拓扑和耗时仍交给 OpenTelemetry、SkyWalking
等 Trace 系统，日志只承担事件摘要和异常上下文。

---

## 五、MQ 消费者事件表

| 事件 | 必打? | 级别 | 常开? | 必带字段 |
|------|------|------|------|---------|
| 消息进入（低频关键消息） | ✅ | INFO | ✅ | msgId, topic, key |
| 消息进入（高频消息） | ❌ | DEBUG | ❌ 热开 | msgId |
| 处理成功（高频） | ❌ | DEBUG | ❌ 热开 | msgId, cost |
| 处理失败（可重试） | ✅ | WARN | ✅ | msgId, retryCount, cause |
| 消息进死信 | ✅ | ERROR | ✅ | msgId, 全量脱敏 payload |
| 幂等命中（重复消息） | ✅ | INFO | ✅ | msgId, idempotentKey |
| 消费者 rebalance | ✅ | INFO | ✅ | groupId, partitions |

**关键规则**：MQ 消息成功日志**按频次决定级别** —— 关键低频（订单支付回调）INFO；高频（埋点、心跳）DEBUG。

详见 [`scenarios/mq-consumer.md`](../scenarios/mq-consumer.md)。

---

## 六、级别决策 3 步法

拿不准打什么级别时，按顺序问 3 个问题；定时任务先应用上方的默认静默规则：

```
Q1: 这条日志是否影响业务判断或告警？
    ├─ 是 → 至少 INFO
    └─ 否 → 降到 DEBUG

Q2: 是否代表异常或值得关注的分支？
    ├─ 业务预期内异常（校验失败/库存不足/幂等命中/慢请求）→ WARN
    ├─ 未预期异常（NPE/超时/OOM/框架异常）→ ERROR
    └─ 正常业务流转 → INFO

Q3: 生产会不会爆炸？
    ├─ 高频 (>100 QPS) → 降到 DEBUG 或改用 Metrics
    ├─ 循环内 → 禁止逐条，改为汇总
    └─ 低频关键 → 保持 INFO
```

---

## 七、字段清单：必带 vs 禁带

### 必带（业务上下文内所有日志）

| 字段 | 来源 | 传播 |
|------|------|------|
| `traceId` | Gateway / Filter 生成或透传；定时任务等链路起点校验并生成或复用 | MDC / context 自动 |
| `userId` / `tenantId` | 认证后写入 | MDC 自动 |
| 业务实体 ID（orderId / skuId 等） | 业务代码手动带上 | 显式参数 |

### INFO 受控全量的准入条件

请求 DTO 必须同时满足以下条件，才允许在 INFO 完整记录：

- 字段集合小且受控，不包含文件、二进制、无界集合或自由文本
- 序列化长度有明确上限；没有项目级上限时按摘要处理
- 经过统一安全序列化，先全局脱敏再截断，不直接调用任意对象的 `toString()`
- 接口频次和日志成本可控；高频请求仍使用摘要或 DEBUG 安全快照
- 凭据字段完全省略或遮蔽，个人敏感信息按全局规则脱敏

任一条件无法确认时，INFO 只打业务摘要。同一请求不要同时输出等价的 INFO 摘要和 INFO 全量日志。

### 禁带（任何级别都禁止明文）

| 字段类 | 例子 | 处理 |
|--------|------|------|
| 认证凭据 | password, token, apiKey, sessionId | 完全不打或全部 `***` |
| 个人信息 | 手机号（除前 3 后 4）、身份证、银行卡 | 脱敏 Converter 强制 |
| 完整用户输入 | 校验失败时的原始 value | 只打字段名 + 错误码 |
| 大对象 | 大型 request/response body | INFO 只打摘要；DEBUG 也必须脱敏、截断 |

---

## 八、判定优先级

多个规则冲突时，按此优先级判定：

```
1. 铁律（SKILL.md 中的 5 条）优先级最高
2. 脱敏规则 > 内容详细度
3. 频次控制 > 信息完整度（高 QPS 场景）
4. 场景细则（scenarios/*.md）> 通用矩阵
5. 项目 CLAUDE.md > 本 skill
```
