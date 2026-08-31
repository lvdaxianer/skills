# 日志边界原则（6 个维度）

> 决策矩阵告诉你"什么事件什么级别"，本文告诉你"**为什么**"和"**如何拿捏灰色地带**"。

---

## 维度 1：分层边界（Where —— 哪一层打？）

**核心原则**：**日志跟着业务语义走，不跟着代码路径走**。

| 层 | 职责 | 反面 |
|----|------|------|
| **Gateway / 网关** | access log（method/path/status/rt）作为统一入口日志 | 业务代码重复打 access |
| **Filter（MDC 注入）** | 只做上下文注入 + 传播，**不打业务日志** | 在 Filter 里写业务判断 |
| **Controller** | ❌ **几乎不打日志**（body 参数交给 Gateway，业务语义交给 Service） | 打 `进入 xxx 方法` |
| **Service** | 业务里程碑（INFO）+ 业务异常分支（WARN） | 把过程细节都打成 INFO |
| **Repository / DAO** | ❌ **一律不打业务日志**，慢 SQL 交给 P6Spy / DB APM | 每个 select 都 log.info |
| **HTTP / RPC Client** | 智能拦截器：正常 DEBUG 安全快照 / 异常 WARN 必要上下文 | 每个请求都打未受控 body |
| **AOP 切面** | 通用横切：入口/出口/异常/耗时 | 侵入业务代码或代替 Service 里程碑 |
| **全局异常处理器** | ERROR 最后兜底 + 报警 | Service 已打，这里又打一次（双写） |

**关键判断**：一条日志出现在**多个层**时，只保留**最有业务语义的那一层**。例如：`log.error("stock check failed")` 应该出现在 Service，不是 Controller，也不是 Repository。

---

## 维度 2：级别边界（How loud —— 用哪个 level？）

**核心公式**：`级别 = f(业务重要性, 频次, 异常性)`

- **业务重要性高** → 至少 INFO
- **频次高（>100 QPS）** → 降到 DEBUG 或用 Metrics
- **异常性**：预期内 → WARN；未预期 → ERROR

### INFO / WARN / ERROR 的分界（最容易搞混）

| 情况 | 级别 | 理由 |
|------|------|------|
| 参数校验失败 | **WARN** | 客户端问题但非攻击，值得关注 |
| 库存不足 / 余额不足 | **WARN** | 业务预期内异常 |
| 幂等命中重复请求 | **INFO** | 属于正常防御，不是异常 |
| HTTP 4xx 客户端错 | **WARN** | 值得看但不用告警 |
| HTTP 5xx 服务端错 | **WARN** 或 **ERROR** | 若已触发降级=WARN；若无兜底=ERROR |
| 数据库连接断开 | **ERROR** | 基础设施问题，需告警 |
| NPE / OOM / Deadlock | **ERROR** | 代码 Bug 或严重故障 |
| 消息重试中 | **WARN** | 预期机制 |
| 消息进死信 | **ERROR** | 已耗尽重试，需人工介入 |

### 灰色地带决策记录

**Q: 触发降级/熔断是 WARN 还是 ERROR？**
A: **WARN**。降级是**系统预期的自我保护**，不是故障。真正 ERROR 的是"降级也失败"。

**Q: 用户重复点击导致的重复请求怎么打？**
A: 幂等命中 **INFO**，因为高频出现说明前端/网关**有问题**，需要看得见但不需要告警。

**Q: 定时任务某一条数据处理失败？**
A: 单条 **WARN**（收敛+聚合），整体失败率 > 阈值时汇总一条 **ERROR**。

---

## 维度 3：触发边界（When —— 什么事件必打 / 禁打？）

### 必打（业务不可见的静默是最大风险）

- ✅ 所有**写操作**的入口和出口（增删改）
- ✅ 所有**状态跃迁**（订单从 A 状态到 B 状态）
- ✅ 所有**异常分支**（if/else 中的失败路径）
- ✅ 所有**降级/熔断/重试触发**
- ✅ 所有**外部依赖调用**的失败或超时
- ✅ 所有**定时任务/消息消费**的开始和结束

### 禁打（打了就是噪音或风险）

- ❌ 方法进入/退出（用 [`@Loggable` AOP](../scenarios/aop-loggable.md) 统一）
- ❌ 简单 getter/setter / DTO 转换
- ❌ 循环内每次迭代（用汇总日志代替）
- ❌ 无业务语义的中间步骤（如"开始查询"、"查询完成"）
- ❌ 用日志代替 Metrics 打 QPS/RT
- ❌ 用日志代替 Trace 打链路 step

---

## 维度 4：内容边界（What —— 必带 / 禁带哪些字段？）

### 必带 3 类信息

1. **上下文**：traceId / userId / tenantId（MDC 自动）
2. **业务标识**：orderId / skuId / msgId 等实体 ID
3. **决策依据**：为什么走这个分支的关键字段（如 `need=5, remain=1`）

### 禁带（无论什么级别）

| 类别 | 例子 | 处理方式 |
|------|------|---------|
| 认证凭据 | password / token / cookie | 完全不打或全部 `***` |
| 完整个人信息 | 手机号原值、身份证、银行卡 | 脱敏 Converter 强制处理 |
| 用户原始输入 | 校验失败时的原始 value | 只打字段名 + 错误码 |
| 大对象 | 大型 req/resp body | INFO 只打摘要；DEBUG 也必须脱敏、截断 |

### "INFO 摘要或受控全量 / DEBUG 安全快照" 的正确写法

INFO 是否完整记录取决于请求 DTO 能否证明安全且有界，而不是固定按级别禁止或放行：

```java
// ✅ 小型、安全、字段受控且低频：INFO 可受控全量
log.info("[订单创建] createOrder request={}", safeLog(req));

// ✅ 无法证明安全有界：INFO 摘要，DEBUG 也只打安全诊断快照
log.info("[订单创建] createOrder start, skuId={}, qty={}", req.getSkuId(), req.getQty());
if (log.isDebugEnabled()) {
    log.debug("[订单创建] createOrder requestSnapshot={}", safeLog(req));
}

// ❌ 反例：绕过安全序列化直接输出任意对象
log.info("createOrder, req={}", req);
```

`safeLog` 必须统一省略或遮蔽凭据、脱敏个人信息，再限制序列化长度。先截断后脱敏可能破坏字段结构并造成泄露。字段安全、大小、频次或序列化边界任一不明确时，退回摘要策略。

**为什么必须这样**：
- 小型安全 DTO 全量记录 → 常规排障不必等待临时开启 DEBUG
- 未受控对象直接序列化 → 字段演进后可能泄露敏感信息或撑爆日志
- 摘要与安全快照结合 → 高频或边界不明场景仍然安静且可调试

---

## 维度 5：频次边界（How much —— 一次请求最多几条？）

### 硬性约束

| 场景 | INFO 日志条数上限 | 理由 |
|------|-----------------|------|
| 一次 HTTP 请求 | ≤ 3 条（入口 + 出口 + 1 个关键跃迁） | 更多说明打了过程细节 |
| 一次定时任务运行 | ≤ 5 条（开始 + 心跳 + 结束） | 心跳按时间/进度 |
| 一次 MQ 消息处理 | ≤ 2 条（进入 + 结束） | 且高频消息应降级 DEBUG |

### 循环内的正确姿势

```java
// ❌ 严禁：循环内每次都打
for (Item item : items) {
    log.info("processing item {}", item.getId());
}

// ✅ 正确：汇总输出
int success = 0, fail = 0;
List<String> failIds = new ArrayList<>(10);
for (Item item : items) {
    try {
        process(item);
        success++;
    } catch (ItemProcessingException e) {
        fail++;
        if (failIds.size() < 10) failIds.add(item.getId());   // 采样失败详情
    }
}
log.info("[批量处理] batch done, total={}, success={}, fail={}, failSample={}",
         items.size(), success, fail, failIds);
```

---

## 维度 6：上下文边界（Context —— MDC / traceId 怎么组织？）

### traceId 必带 vs 允许缺失

**必须带**（业务上下文内）：
- HTTP 请求处理
- MQ 消费
- RPC 调用
- 定时任务
- 从上述场景派生的异步任务

**允许缺失**（系统级）：
- 应用启动日志
- Spring / Hibernate 框架初始化
- GC 日志、连接池监控
- 健康检查

**关键**：这条边界避免了「每条日志强制带 traceId」的死板要求带来的误报，同时保证业务日志不会有孤儿日志。

### MDC 组织建议

| Key | 值 | 何时设 | 何时清 |
|-----|-----|-------|--------|
| `traceId` | 32 位 UUID 或从上游透传 | Filter / Consumer 入口 | Filter finally 清 |
| `userId` | 认证后的用户 ID | 认证 Filter | 同上 |
| `tenantId` | 多租户系统的租户 ID | 认证 Filter | 同上 |
| `bizId` | 业务实体 ID（订单号等） | 进入业务方法时手动加 | 方法退出前手动清 |

**禁忌**：不要把 body、token、密码放进 MDC —— MDC 会输出到每一条日志。

### 手拼 traceId 是坏味道

```java
// ❌ 反例：手动在 log 里拼
String traceId = MDC.get("traceId");
log.info("traceId={}, order created, id={}", traceId, orderId);

// ✅ 正确：交给 Logback pattern 自动带
log.info("[订单创建] order created, id={}", orderId);
// logback pattern: %X{traceId} %X{userId} - %msg
```

---

## 附：跨语言原则一致性

**5 条铁律和 6 大边界维度是语言无关的**，语言差异只在实现细节：

| 关注点 | Java/Spring | Go | Python | Node.js |
|--------|-------------|-----|--------|---------|
| 日志库 | Slf4j + Logback | zerolog / zap | structlog | pino |
| 上下文传播 | MDC + TTL | context.Context | contextvars | AsyncLocalStorage |
| 动态调级 | Actuator /loggers | 配置中心 + 监听 | dictConfig 热加载 | pino level 运行时改 |
| 结构化输出 | Logstash JsonEncoder | zerolog 原生 JSON | structlog processors | pino 原生 JSON |
| 脱敏 | Logback Converter | zerolog Hook | structlog processor | pino redact 配置 |
| AOP 切面 | Spring AOP `@Loggable` | middleware / decorator | decorator | interceptor |

各场景文档的「多语言实现」小节会给具体代码。
