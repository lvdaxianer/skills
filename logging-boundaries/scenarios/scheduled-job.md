# 场景：定时任务 / 批处理

> `@Scheduled`、Quartz、XXL-Job、Airflow DAG、批处理脚本共用同一套日志规则。

---

## 独有规则

1. **必须有开始/结束日志**：没有开始/结束日志的定时任务 = 黑盒
2. **循环内绝对禁止逐条业务 log**：改用**汇总日志 + 失败采样**；按时间或百分比收敛的进度心跳除外
3. **长任务必须有进度心跳**：> 1 分钟的任务应按时间或百分比输出进度
4. **任务开始必须生成新 traceId**：不像 HTTP 有上游透传，定时任务是链路起点
5. **单条失败 WARN 收敛**，**整体失败率超阈值 ERROR**

---

## 完整参考（Java/Spring）

```java
@Component
@Slf4j
public class OrderCleanupJob {
    private static final int FAIL_SAMPLE_LIMIT = 10;
    private static final long HEARTBEAT_INTERVAL_MS = 30_000L;
    private static final double HIGH_FAILURE_RATE = 0.05D;

    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanExpiredOrders() {
        // 任务起点：必须生成 traceId 和 jobId
        MDC.put("traceId", "job-" + UUID.randomUUID().toString().replace("-", ""));
        MDC.put("jobName", "orderCleanup");
        long start = System.currentTimeMillis();

        try {
            log.info("[订单清理] job start, name=orderCleanup, cron='0 0 2 * * ?'");

            List<Order> expired = orderRepo.findExpired();
            BatchResult result = processBatch(expired);

            long cost = System.currentTimeMillis() - start;
            log.info("[订单清理] job done, name=orderCleanup, cost={}ms, total={}, success={}, fail={}, failSample={}",
                     cost, result.total(), result.success(), result.fail(), result.failSample());

            // 失败率超阈值：升级 ERROR 触发告警
            if (result.failRate() > HIGH_FAILURE_RATE) {
                log.error("[订单清理] job high failure rate, name=orderCleanup, failRate={}%",
                          result.failRate() * 100);
            }
        } catch (JobExecutionException e) {
            log.error("[订单清理] job failed, name=orderCleanup, cost={}ms",
                      System.currentTimeMillis() - start, e);
            throw e;
        } finally {
            MDC.clear();
        }
    }

    /**
     * 批处理核心：汇总 + 采样，绝不逐条 log
     */
    private BatchResult processBatch(List<Order> orders) {
        int success = 0, fail = 0;
        List<String> failSample = new ArrayList<>(FAIL_SAMPLE_LIMIT);
        long lastHeartbeat = System.currentTimeMillis();

        for (int i = 0; i < orders.size(); i++) {
            try {
                cleanOne(orders.get(i));
                success++;
            } catch (OrderCleanupException e) {
                fail++;
                if (failSample.size() < FAIL_SAMPLE_LIMIT) {
                    failSample.add(orders.get(i).getId() + ":" + e.getClass().getSimpleName());
                }
            }

            // 进度心跳：每 30 秒或每 10% 输出一次
            if (System.currentTimeMillis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
                log.info("[订单清理] job progress, name=orderCleanup, done={}/{}", i + 1, orders.size());
                lastHeartbeat = System.currentTimeMillis();
            }
        }
        return new BatchResult(orders.size(), success, fail, failSample);
    }

    // ❌ 反例（绝不能这么写）
    // private void badBatch(List<Order> orders) {
    //     for (Order o : orders) {
    //         log.info("processing order {}", o.getId());   // 10 万条 = 10 万条日志
    //         cleanOne(o);
    //     }
    // }
}
```

---

## 多语言实现

### Go（cron + zerolog）

```go
func (j *OrderCleanupJob) Run(ctx context.Context) {
    traceID := "job-" + uuid.NewString()
    logger := log.With().Str("traceId", traceID).Str("job", "orderCleanup").Logger()
    ctx = logger.WithContext(ctx)
    start := time.Now()

    logger.Info().Msg("[订单清理] job start")
    result := j.processBatch(ctx, orders)
    cost := time.Since(start).Milliseconds()

    logger.Info().Int("total", result.Total).Int("success", result.Success).
        Int("fail", result.Fail).Int64("cost", cost).Msg("[订单清理] job done")
}
```

### Python（APScheduler + structlog）

```python
@scheduler.scheduled_job("cron", hour=2)
def cleanup_expired_orders():
    trace_id = f"job-{uuid4().hex}"
    log = structlog.get_logger().bind(trace_id=trace_id, job="orderCleanup")
    start = time.time()

    try:
        log.info("[订单清理] job start")
        result = process_batch(orders, log)
        log.info("[订单清理] job done", cost_ms=int((time.time()-start)*1000),
                 total=result.total, success=result.success, fail=result.fail,
                 fail_sample=result.fail_sample[:10])
    except JobExecutionError as e:
        log.error("[订单清理] job failed", exc_info=e)
        raise
```

---

## Checklist

- [ ] 任务开始/结束都有日志
- [ ] 任务开头生成 traceId 并 put 到 MDC / logger context
- [ ] 循环内无逐条 `log.info`
- [ ] 汇总日志带 total/success/fail/failSample
- [ ] 长任务有 30s 或 10% 粒度的进度心跳
- [ ] 整体异常有 ERROR + stack
- [ ] 失败率超阈值触发 ERROR（可告警）
- [ ] finally 里 `MDC.clear()`
