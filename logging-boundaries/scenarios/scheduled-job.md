# 场景：定时任务 / 批处理

> `@Scheduled`、Quartz、XXL-Job、Airflow DAG、批处理脚本共用同一套日志规则。

---

## 独有规则

1. **默认静默**：正常成功执行不固定输出开始/结束 INFO；任务结果由 Metrics 和执行记录承载
2. **循环内绝对禁止逐条业务 log**：改用**汇总日志 + 失败采样**；按时间或百分比收敛的进度心跳除外
3. **长任务按条件心跳**：> 1 分钟的任务仅在诊断开启或达到超时/异常条件时按时间或百分比输出进度
4. **任务开始必须建立本次执行的 traceId**：有受控诊断上下文时校验并复用，没有上游时生成
5. **特定条件才输出**：失败、超时、状态变化、失败率超阈值或人工诊断时才输出日志
6. **单条失败 WARN 收敛**，**整体失败率超阈值 ERROR**

定时任务入口必须先建立本次执行的 trace context。调度器提供有效 traceId 时校验并
复用；没有入站请求或有效 ID 时生成新的 traceId。任务没有入站 Header 的要求，只有
调用下游 HTTP/RPC 时才把当前 traceId 注入出站请求。`jobName` 和调度器的
`jobRunId` 与 traceId 分开记录，便于从任务执行记录反查链路。

默认成功执行不打印固定的开始、结束或每次进度日志。需要排查某次任务时，必须在
执行前指定诊断 traceId，或开启受访问控制、限时、限量的目标任务诊断开关；执行期间
没有产生日志的内容，事后不能仅凭 traceId 补回。

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
        // 任务是链路起点：校验调度上下文或生成本次执行的 traceId
        String traceId = traceContext.resolveOrCreateRootTraceId();
        MDC.put("traceId", traceId);
        MDC.put("jobName", "orderCleanup");
        MDC.put("jobRunId", scheduler.currentExecutionId());
        long start = System.currentTimeMillis();
        boolean diagnostic = diagnosticPolicy.enabled("orderCleanup", traceId);

        try {
            if (diagnostic) {
                log.info("[订单清理] job start, name=orderCleanup, cron='0 0 2 * * ?'");
            }

            List<Order> expired = orderRepo.findExpired();
            BatchResult result = processBatch(expired);

            long cost = System.currentTimeMillis() - start;
            if (diagnostic || result.hasStateChange()) {
                log.info("[订单清理] job done, name=orderCleanup, cost={}ms, total={}, success={}, fail={}, failSample={}",
                         cost, result.total(), result.success(), result.fail(), result.failSample());
            }
            if (result.fail() > 0) {
                log.warn("[订单清理] job partial failure, name=orderCleanup, total={}, success={}, fail={}, failSample={}",
                         result.total(), result.success(), result.fail(), result.failSample());
            }

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
            if (diagnostic && System.currentTimeMillis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
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

    diagnostic := diagnosticPolicy.Enabled("orderCleanup", traceID)
    if diagnostic {
        logger.Info().Msg("[订单清理] job start")
    }
    result := j.processBatch(ctx, orders)
    cost := time.Since(start).Milliseconds()

    if diagnostic || result.StateChanged {
        logger.Info().Int("total", result.Total).Int("success", result.Success).
            Int("fail", result.Fail).Int64("cost", cost).Msg("[订单清理] job done")
    }
    if result.Fail > 0 {
        logger.Warn().Int("total", result.Total).Int("success", result.Success).
            Int("fail", result.Fail).Msg("[订单清理] job partial failure")
    }
}
```

### Python（APScheduler + structlog）

```python
@scheduler.scheduled_job("cron", hour=2)
def cleanup_expired_orders():
    trace_id = trace_context.resolve_or_create_root_trace_id()
    log = structlog.get_logger().bind(trace_id=trace_id, job="orderCleanup")
    diagnostic = diagnostic_policy.enabled("orderCleanup", trace_id)
    start = time.time()

    try:
        if diagnostic:
            log.info("[订单清理] job start")
        result = process_batch(orders, log)
        if diagnostic or result.state_changed:
            log.info("[订单清理] job done", cost_ms=int((time.time()-start)*1000),
                     total=result.total, success=result.success, fail=result.fail,
                     fail_sample=result.fail_sample[:10])
        if result.fail:
            log.warning("[订单清理] job partial failure", total=result.total,
                        success=result.success, fail=result.fail,
                        fail_sample=result.fail_sample[:10])
    except JobExecutionError as e:
        log.error("[订单清理] job failed", exc_info=e)
        raise
```

---

## Checklist

- [ ] 任务入口校验或生成 traceId，并 put 到 MDC / logger context
- [ ] 正常成功执行默认不输出固定开始/结束 INFO
- [ ] 失败、超时、状态变化、阈值告警或人工诊断时才输出日志
- [ ] 诊断在执行前开启，并限制任务范围、时间窗口和日志数量
- [ ] 没有产生日志的过程不会被描述为可由 traceId 事后补回
- [ ] 循环内无逐条 `log.info`
- [ ] 汇总日志带 total/success/fail/failSample
- [ ] 诊断或异常长任务有受控的 30s 或 10% 粒度进度心跳
- [ ] 整体异常有 ERROR + stack
- [ ] 失败率超阈值触发 ERROR（可告警）
- [ ] finally 里 `MDC.clear()`
