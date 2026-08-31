# 跨场景：异步 / 线程池 MDC 透传

> 本文是**共用横切**主题：任何在 HTTP、定时任务、MQ 消费场景中使用 `@Async`、线程池、`CompletableFuture` 的地方都必须验证 MDC 透传。**这是铁律 #5**。

---

## 问题：为什么原生 MDC 会丢失 traceId

Java 常用的 SLF4J / Logback `MDC` 基于 `ThreadLocal`，默认不会可靠传播到新线程；即使某个实现使用 `InheritableThreadLocal`，线程池复用也不会按每次任务重新继承。

- ❌ **新建线程**：不能依赖实现细节自动继承，必须显式复制上下文
- ❌ **线程池复用**：复用的线程可能带着**上一次任务**的 MDC，或者是空的

结果：`@Async` 方法、`ThreadPoolExecutor.submit()`、`CompletableFuture.supplyAsync()` 里的日志**要么无 traceId，要么带着别的请求的 traceId**（数据串号，比无 traceId 还危险）。

---

## Java 修复方案

### 方案 A：Spring `TaskDecorator`（推荐，最简单）

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    @Bean("mdcAwareExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(10);
        exec.setMaxPoolSize(50);
        exec.setQueueCapacity(200);
        exec.setThreadNamePrefix("async-");

        // 关键：TaskDecorator 在提交任务时快照 MDC，在执行时还原
        exec.setTaskDecorator(new MdcTaskDecorator());
        exec.initialize();
        return exec;
    }
}

public class MdcTaskDecorator implements TaskDecorator {
    @Override
    public Runnable decorate(Runnable runnable) {
        // 在提交线程快照 MDC
        Map<String, String> ctx = MDC.getCopyOfContextMap();
        return () -> {
            // 在执行线程还原 MDC
            if (ctx != null) MDC.setContextMap(ctx);
            try {
                runnable.run();
            } finally {
                // 必须清理，防止线程复用串号
                MDC.clear();
            }
        };
    }
}
```

使用：

```java
@Async("mdcAwareExecutor")
public void sendNotify(Long orderId) {
    log.info("[异步通知] send notify, orderId={}", orderId);   // ✅ traceId 正确带出
}
```

### 方案 B：`TransmittableThreadLocal`（阿里 TTL，跨线程池首选）

适合更复杂的场景（多级线程池嵌套、`ForkJoinPool`）。

```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>transmittable-thread-local</artifactId>
    <version>2.14.5</version>
</dependency>
```

```java
// 用 TTL 包装 Executor，MDC 自动透传
Executor pool = TtlExecutors.getTtlExecutor(originalPool);

// 或用 TtlRunnable 包装单个任务
executor.submit(TtlRunnable.get(() -> {
    log.info("[异步任务] in async task");   // ✅ MDC 保留
}));
```

**注意**：TTL 需要配合 slf4j-mdc 的 TTL 桥接（`ttl-mdc-adapter`）或自己实现 MDC 快照钩子。

### `CompletableFuture` 的坑

```java
// ❌ 反例：默认用 ForkJoinPool.commonPool()，MDC 丢失
CompletableFuture.supplyAsync(() -> queryStock());

// ✅ 正例：传入配好 TaskDecorator 的 executor
CompletableFuture.supplyAsync(() -> queryStock(), mdcAwareExecutor);
```

---

## Go 方案：`context.Context` 就是天然透传

Go 用 context 传递上下文，不需要 MDC。**只要方法签名带 `ctx context.Context` 并逐层传下去，日志器就能带上**。

```go
// 顶层设置
ctx := log.With().Str("traceId", traceID).Logger().WithContext(baseCtx)

// 传给 goroutine
go func(ctx context.Context) {
    log.Ctx(ctx).Info().Msg("[异步任务] in goroutine")   // ✅ 自动带 traceId
}(ctx)
```

**Go 的反面**：任何地方用 `context.Background()` 或漏掉 `ctx` 参数 = 丢失上下文。Review 检查 `go func()` 是否吃到了外层 ctx。

---

## Python 方案：`contextvars`

Python 3.7+ 的 `contextvars` 会自动传播到 `asyncio` 任务，但普通 `ThreadPoolExecutor` 必须显式复制当前 context。

```python
import contextvars, structlog

trace_id_var = contextvars.ContextVar("trace_id")

# 设置
trace_id_var.set("abc123")
structlog.contextvars.bind_contextvars(trace_id="abc123")

# asyncio 任务自动继承
async def handler():
    log = structlog.get_logger()
    log.info("[异步任务] in async")   # ✅ 自动带 trace_id

# ThreadPoolExecutor 使用 copy_context 显式传播
ctx = contextvars.copy_context()
with ThreadPoolExecutor() as pool:
    pool.submit(ctx.run, worker)   # ✅ 在复制的 context 中执行
```

并发提交多个任务时，每个任务分别调用一次 `copy_context()`；同一个 `Context` 不能同时进入多个线程。

**Python 的反面**：老代码用 `threading.local()` 手动管理 —— 会遇到和 Java MDC 一样的问题，改用 `contextvars`。

---

## Node.js 方案：`AsyncLocalStorage`

Node.js 12.17+ 的 `AsyncLocalStorage` 自动在 async / promise 链中传播，无需手动透传。

```javascript
const { AsyncLocalStorage } = require('async_hooks');
const store = new AsyncLocalStorage();

// 顶层设置
app.use((req, res, next) => {
    store.run({ traceId: req.headers['x-trace-id'] }, () => next());
});

// 任何异步链路都能拿到
async function handler() {
    const ctx = store.getStore();
    log.info({ traceId: ctx.traceId }, "[异步任务] in handler");   // ✅ 自动带出
}
```

**Node.js 的反面**：用 `setImmediate` + 老回调风格可能断链，async/await + Promise 是安全的。

---

## Review 时的自动检查清单

Review 时看到以下代码，必须**当场验证 MDC 透传**：

| 语言 | 危险模式 | 修复 |
|------|---------|------|
| Java | `@Async` 无 executor | 配 `TaskDecorator` |
| Java | `Executors.newFixedThreadPool` 裸创建 | 用 TTL 包装 |
| Java | `CompletableFuture.xxxAsync(supplier)` 无 executor | 传入 mdc-aware executor |
| Java | `new Thread(runnable).start()` | 手动 `MDC.getCopyOfContextMap` + 传入 |
| Go | goroutine 没接收 ctx | 传入 ctx |
| Go | `context.Background()` 出现在业务代码 | 检查是否应从上游继承 |
| Python | `ThreadPoolExecutor.submit(worker)` | 用 `copy_context().run` 包装每个任务 |
| Python | 使用 `threading.local()` | 改用 `contextvars` |
| Node.js | 老回调风格深层嵌套 | 用 AsyncLocalStorage + async/await |

---

## 验证方法：一个测试用例

不管什么语言，加一个测试都能验证 MDC 透传是否生效：

```java
@Test
void mdcMustBePropagatedToAsync() throws Exception {
    MDC.put("traceId", "test-trace-123");

    CompletableFuture<String> future = CompletableFuture.supplyAsync(
        () -> MDC.get("traceId"),   // 在异步线程读 MDC
        mdcAwareExecutor
    );

    assertEquals("test-trace-123", future.get());
}
```

**这个测试挂了 → 生产必然丢 traceId**。建议每个用了自定义 executor 的项目都加。

---

## Checklist

- [ ] `@Async` 使用的 executor 都配置了 `TaskDecorator`（或用 TTL 包装）
- [ ] `CompletableFuture.xxxAsync` 显式传入 mdc-aware executor
- [ ] 项目里没有裸的 `new Thread` 或 `Executors.newXxx`
- [ ] Go 项目所有 goroutine 都接收上游 ctx
- [ ] Python 项目使用 `contextvars`，进入普通线程池时显式 `copy_context`
- [ ] 有单元测试验证 MDC/context 透传
