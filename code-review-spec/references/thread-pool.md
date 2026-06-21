# Java 线程池规范示例

> **仅适用于 Java**：禁止使用已定义的线程池，必须使用自定义线程池。
> **隔离要求**：不同业务必须使用不同线程池，避免订单、用户、消息等核心链路互相争抢资源。
> **线程持有要求**：线程池任务不得无控制地长时间持有线程，避免线程池打满。

## 正确示例

```java
// 定义用户业务线程池
private static final ThreadFactory USER_THREAD_FACTORY = new ThreadFactoryBuilder()
    .setNameFormat("user-handler-%d")
    .setUncaughtExceptionHandler((t, e) -> {
        log.error("[用户处理] 线程 {} 异常", t.getName(), e);
    })
    .build();

private final ExecutorService userExecutor = new ThreadPoolExecutor(
    10, 20, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(1000),
    USER_THREAD_FACTORY,
    new ThreadPoolExecutor.CallerRunsPolicy()
);

// 定义订单业务线程池，避免与用户业务共用
private static final ThreadFactory ORDER_THREAD_FACTORY = new ThreadFactoryBuilder()
    .setNameFormat("order-handler-%d")
    .setUncaughtExceptionHandler((t, e) -> {
        log.error("[订单处理] 线程 {} 异常", t.getName(), e);
    })
    .build();

private final ExecutorService orderExecutor = new ThreadPoolExecutor(
    8, 16, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(1000),
    ORDER_THREAD_FACTORY,
    new ThreadPoolExecutor.CallerRunsPolicy()
);

// 定义报表轮询业务线程池，长时间等待场景必须独立隔离
private final ExecutorService reportPollingExecutor = new ThreadPoolExecutor(
    2, 4, 30L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(100),
    new ThreadFactoryBuilder().setNameFormat("report-polling-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy()
);

// 线程池执行时必须打印日志
public void processUserTask(User user) {
    userExecutor.execute(() -> {
        log.info("[用户处理] 开始处理用户: {}", user.getId());
        try {
            // 业务逻辑
            log.info("[用户处理] 用户处理成功: {}", user.getId());
        } catch (Exception e) {
            log.error("[用户处理] 用户处理失败: {}", user.getId(), e);
        }
    });
}

// 长时间持有线程的任务必须有超时控制、独立线程池和日志
public void pollReportUntilReady(String reportId) {
    reportPollingExecutor.execute(() -> {
        long deadline = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(30);
        log.info("[报表轮询] 开始轮询报表: {}", reportId);
        while (System.currentTimeMillis() < deadline) {
            if (isReportReady(reportId)) {
                log.info("[报表轮询] 报表已生成: {}", reportId);
                return;
            }
            sleepBriefly();
        }
        log.warn("[报表轮询] 报表轮询超时: {}", reportId);
    });
}
```

## 错误示例

```java
// 错误：使用匿名线程池，无有意义名称
ExecutorService executor = Executors.newFixedThreadPool(10);

// 错误：使用 @Async 默认线程池
@Async
public void process() {
    // 无法追踪线程
}

// 错误：多个核心业务长期共用同一个线程池
private final ExecutorService sharedExecutor = new ThreadPoolExecutor(
    10, 20, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(1000),
    USER_THREAD_FACTORY,
    new ThreadPoolExecutor.CallerRunsPolicy()
);

public void processOrderTask(Order order) {
    sharedExecutor.execute(() -> {
        // 订单和用户等不同核心业务共用线程池，容易相互影响
        doOrderWork(order);
    });
}

// 错误：长时间持有线程，无超时控制，容易导致线程池打满
public void waitPartnerResult(String taskId) {
    sharedExecutor.execute(() -> {
        while (!isPartnerDone(taskId)) {
            Thread.sleep(1000);
        }
        handlePartnerResult(taskId);
    });
}

// 错误：阻塞等待异步结果，占用工作线程且无拒绝策略兜底
public void blockOnFuture(Future<Result> future) {
    sharedExecutor.execute(() -> {
        Result result = future.get();
        handleResult(result);
    });
}

// 错误：缺少日志
executor.execute(() -> {
    doSomething();
});
```

## 常见业务线程池命名

| 业务场景 | 线程池名称示例 |
|----------|---------------|
| 用户处理 | `user-handler-%d`、`user-processor-%d` |
| 订单处理 | `order-handler-%d`、`order-processor-%d` |
| 消息发送 | `msg-sender-%d`、`notification-sender-%d` |
| 数据同步 | `data-sync-%d`、`sync-worker-%d` |
| 文件处理 | `file-processor-%d`、`file-handler-%d` |
| 支付处理 | `payment-handler-%d`、`payment-processor-%d` |

## 长时间持有线程审查点

- 不同业务必须使用不同线程池，不能让多个核心业务共用一个工作队列
- 存在 `Thread.sleep`、轮询、阻塞等待、阻塞 IO、慢第三方接口调用时，必须评估长时间持有线程风险
- 长时间持有线程的任务必须配置独立线程池、明确超时控制、合理队列容量和拒绝策略
- 如果任务会持续等待外部状态，应优先使用定时调度、事件回调、任务拆分或异步化，避免线程池打满
