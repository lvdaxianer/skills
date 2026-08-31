# 反模式清单（Review 快速扫查）

> Code review 时按此表**逐条扫查**。任一命中直接标为 `必须修复` 或 `应该修复`。

---

## 反模式速查表

| # | 反模式 | 严重度 | grep 关键词 |
|---|--------|--------|------------|
| 1 | INFO 未受控地打完整 req/resp body | 🔴 必须 | `log.info.*req\|log.info.*resp\|log.info.*body` 后继续核对安全序列化、脱敏、限长与频次 |
| 2 | 明文敏感字段（phone/password/token/idCard） | 🔴 必须 | `phone=\|password=\|token=\|idCard=` |
| 3 | 循环内每次迭代打日志 | 🔴 必须 | `for.*{[\s\S]*log\.\|forEach.*log\.` |
| 4 | `log.error` 无 stack | 🔴 必须 | `log.error.*getMessage` |
| 5 | try-catch 内打日志又抛异常（双写） | 🟡 应该 | `catch.*log\.error[\s\S]*throw` |
| 6 | 静默失败（catch 里只打 info 或空） | 🔴 必须 | `catch.*log.info\|catch\s*{\s*}` |
| 7 | 字符串拼接构造日志消息 | 🟡 应该 | `log\.\w+\(.*\+.*\)` |
| 8 | 打进入方法 / 退出方法（应交给 AOP） | 🟢 可优化 | `log.info.*进入\|log.info.*enter` |
| 9 | 用日志代替 Metric（打 QPS/RT） | 🟡 应该 | `log.*QPS\|log.*RT\|log.*latency` |
| 10 | 用日志代替 Trace（step1/step2） | 🟢 可优化 | `log.info.*step\d` |
| 11 | 手动拼 traceId 到消息里 | 🟢 可优化 | `MDC.get.*traceId.*log\.\|log.*traceId=" \+` |
| 12 | 业务上下文内日志缺 traceId（异步/线程池丢失） | 🔴 必须 | `@Async\|Executor\|CompletableFuture\|threadPool` 附近查 MDC 透传 |

---

## 详细反面 + 正面对照

### 1. INFO 未受控地打完整 body（生产爆炸 + 敏感泄露）

```java
// ❌ 反例：任意对象直接序列化，未来新增字段也会被输出
log.info("createOrder, req={}, resp={}", req, resp);

// ✅ 正例 A：小型、安全、字段受控且低频的 DTO 可受控全量
log.info("[订单创建] createOrder, request={}", safeLog(req));

// ✅ 正例 B：无法证明安全有界时使用摘要 + DEBUG 安全快照
log.info("[订单创建] createOrder start, skuId={}, qty={}", req.getSkuId(), req.getQty());
if (log.isDebugEnabled()) {
    log.debug("[订单创建] createOrder requestSnapshot={}", safeLog(req));
}
```

`safeLog` 必须由项目统一实现安全序列化，先脱敏再限长。完整记录的准入条件不明确时，按反模式处理；不能因为参数当前看起来很少就直接依赖 `toString()`。

### 2. 明文敏感字段

```java
// ❌ 反例
log.info("user login, phone={}, pwd={}", phone, pwd);

// ✅ 正例：password 完全不打，phone 交给 Logback SensitiveMaskConverter 脱敏
log.info("[用户登录] user login, phone={}", phone);   // 输出：phone=138****5678
```

### 3. 循环内打日志（生产 N 倍膨胀）

```java
// ❌ 反例
for (Item item : items) {
    log.info("processing item {}", item.getId());
}

// ✅ 正例：汇总输出 + 失败采样
int success = 0, fail = 0;
List<String> failIds = new ArrayList<>(10);
for (Item item : items) {
    try {
        process(item);
        success++;
    } catch (ItemProcessingException e) {
        fail++;
        if (failIds.size() < 10) failIds.add(item.getId());
    }
}
log.info("[批量处理] batch done, total={}, success={}, fail={}, failSample={}",
         items.size(), success, fail, failIds);
```

### 4. `log.error` 无 stack

```java
// ❌ 反例：只留一句 message，堆栈丢失，问题无法定位
catch (Exception e) {
    log.error("failed: " + e.getMessage());
}

// ✅ 正例：exception 作为最后一个参数，Logback 会打印完整 stack
catch (Exception e) {
    log.error("[订单创建] createOrder failed, orderId={}", orderId, e);
}
```

### 5. try-catch 双写（同一异常打两遍）

```java
// ❌ 反例：这里打一次，上层全局异常处理器又打一次
catch (Exception e) {
    log.error("something wrong", e);
    throw e;
}

// ✅ 正例：要么这里处理并吞掉异常，要么直接抛给上层统一处理
catch (Exception e) {
    throw new BizException(ErrorCode.STOCK_FAIL, e);   // 上层统一 log
}
```

**判定标准**：如果你打了 log 又 throw，那**必须换成业务异常包装**并明确交给全局处理器打 log。

### 6. 静默失败（最危险的反模式）

```java
// ❌ 反例 A：空 catch
try {
    doSomething();
} catch (Exception e) {}   // 出问题永远查不到

// ❌ 反例 B：只打 info，级别不够被过滤掉
catch (Exception e) {
    log.info("忽略");
}

// ✅ 正例：明确记录 + 明确级别（预期内 WARN，未预期 ERROR）
catch (BusinessValidationException e) {
    log.warn("[参数校验] validation skip, cause={}", e.getMessage());   // 预期
} catch (Exception e) {
    log.error("[系统异常] unexpected in xxx", e);                       // 未预期
}
```

### 7. 字符串拼接（性能坑 + 阅读障碍）

```java
// ❌ 反例：即使 log 级别关闭，拼接也会执行
log.debug("data=" + heavyToString() + ", userId=" + userId);

// ✅ 正例：占位符延迟渲染，DEBUG 关闭时零开销
log.debug("[调试信息] data={}, userId={}", heavyToString(), userId);

// ✅ 更优（如果参数构造本身很重）
if (log.isDebugEnabled()) {
    log.debug("[调试信息] data={}, userId={}", heavyToString(), userId);
}
```

### 8. 打「进入方法 / 退出方法」（用 AOP 代替）

```java
// ❌ 反例：每个方法都手写一遍，业务代码噪音大
public Order create(Req req) {
    log.info("进入 create");
    // ...
    log.info("退出 create");
    return order;
}

// ✅ 正例：AOP 统一，业务代码零污染
@Loggable(slowThresholdMs = 500)
public Order create(Req req) {
    // 业务代码
    return order;
}
```

详见 [`scenarios/aop-loggable.md`](../scenarios/aop-loggable.md)。

### 9. 用日志代替 Metric

```java
// ❌ 反例：高频数值靠 grep 日志算，成本高、精度低
log.info("QPS={}, RT={}ms", qps, rt);

// ✅ 正例：交给 Micrometer / Prometheus
Metrics.counter("orders.created").increment();
Metrics.timer("orders.rt").record(cost, TimeUnit.MILLISECONDS);
```

**判定**：如果一个字段的用途是**告警阈值** 或 **趋势分析**，它就是 metric，不是 log。

### 10. 用日志代替 Trace

```java
// ❌ 反例：靠人肉串 traceId 拼链路
log.info("step1: 收到请求");
log.info("step2: 校验通过");
log.info("step3: 调用商品服务");

// ✅ 正例：单一业务里程碑 + OpenTelemetry Span
log.info("[订单创建] createOrder start, skuId={}", skuId);
Span span = tracer.spanBuilder("call-product-service").startSpan();
// ...
span.end();
```

### 11. 手动拼 traceId 到消息里

```java
// ❌ 反例
String traceId = MDC.get("traceId");
log.info("traceId={}, order created", traceId);

// ✅ 正例：交给 Logback pattern 自动带
log.info("[订单创建] order created");
// pattern: %d [%X{traceId}] [%X{userId}] %-5level %logger - %msg%n
```

### 12. 异步/线程池丢 traceId（最容易漏的坑）

```java
// ❌ 反例：@Async 里 MDC 为空
@Async
public void sendNotify(Long orderId) {
    log.info("send notify, orderId={}", orderId);   // 没有 traceId！
}

// ✅ 正例：Executor 用 TaskDecorator 透传 MDC
@Bean
public TaskExecutor taskExecutor() {
    ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
    exec.setTaskDecorator(runnable -> {
        Map<String, String> ctx = MDC.getCopyOfContextMap();
        return () -> {
            if (ctx != null) MDC.setContextMap(ctx);
            try { runnable.run(); }
            finally { MDC.clear(); }
        };
    });
    return exec;
}
```

详见 [`scenarios/async-mdc.md`](../scenarios/async-mdc.md)。

---

## Review 输出模板

```
## 日志治理审查

### 必须修复 (CRITICAL)
- Foo.java:23  反模式#1  INFO 未受控地打完整 req body：`log.info("req={}", req)`
                → 改为摘要或受控全量；request 内含 phone 字段时必须统一脱敏、限长
- Bar.java:45  反模式#12 @Async 方法内 log 无 traceId
                → 配置 TaskDecorator 透传 MDC

### 应该修复 (HIGH/MEDIUM)
- Baz.java:12  反模式#5  catch 内既 log.error 又 throw，会双写
                → 抛出后交给 GlobalExceptionHandler 统一记录

### 可优化 (LOW)
- Qux.java:8   反模式#8  手写「进入 xxx」日志
                → 建议改为 @Loggable 注解
```
