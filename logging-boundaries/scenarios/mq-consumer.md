# 场景：MQ 消费者

> Kafka / RocketMQ / RabbitMQ / Pulsar 消费端日志约束。发送端参考 [`http-api.md`](http-api.md)（同步）或本文附录（异步发送）。

---

## 独有规则

1. **成功日志按频次决定级别**：低频关键消息 INFO；高频消息 DEBUG（配合 metric 观察）
2. **traceId 必须从消息 header 中透传**：上游生产者应放入 header；消费者从 header 提取到 MDC
3. **重试次数必须打**：`retryCount` 是排查生产问题的关键
4. **进死信必须 ERROR + 全量脱敏 payload**：这是最后一根救命稻草
5. **幂等命中 INFO**：不是异常，但值得看见（说明有重复投递）

---

## 完整参考（Java/Spring Kafka）

```java
@Slf4j
@Component
public class OrderConsumer {

    @KafkaListener(topics = "order-events", groupId = "order-service")
    public void consume(ConsumerRecord<String, String> record,
                        Acknowledgment ack,
                        @Header(KafkaHeaders.DELIVERY_ATTEMPT) Integer attempt) {
        // 从 header 提取 traceId 透传，没有就生成新的
        String traceId = header(record, "X-Trace-Id", () -> "mq-" + UUID.randomUUID());
        MDC.put("traceId", traceId);
        MDC.put("msgId", record.key());

        long start = System.currentTimeMillis();
        try {
            // 高频消息：DEBUG；低频关键消息：改成 INFO
            log.debug("[MQ消费] mq received, topic={}, key={}, attempt={}",
                      record.topic(), record.key(), attempt);

            if (idempotent.check(record.key())) {
                // 幂等命中：INFO，说明有重复投递值得关注
                log.info("[MQ消费] mq idempotent hit, key={}, attempt={}", record.key(), attempt);
                ack.acknowledge();
                return;
            }

            orderService.handle(record.value());
            ack.acknowledge();
            log.debug("[MQ消费] mq done, key={}, cost={}ms", record.key(), System.currentTimeMillis() - start);
        } catch (RetryableException e) {
            // 可重试异常：WARN + 重试次数 + 原因
            log.warn("[MQ消费] mq retry, key={}, attempt={}, cause={}",
                     record.key(), attempt, e.getMessage());
            throw e;   // 交给框架重试
        } catch (NonRetryableMessageException e) {
            // 不可重试：ERROR + 全量 payload（进 DLQ 前的最后现场）
            log.error("[MQ消费] mq unrecoverable, key={}, attempt={}, payload={}",
                      record.key(), attempt,
                      truncate(mask(record.value()), 4096), e);
            // 视框架而定：抛出让框架路由到 DLQ，或手动发 DLQ
            throw new NonRetryableException(e);
        } finally {
            MDC.clear();
        }
    }
}

/**
 * 死信队列消费者：进入这里必打 ERROR
 */
@KafkaListener(topics = "order-events.DLT", groupId = "order-dlq")
public void consumeDlq(ConsumerRecord<String, String> record) {
    log.error("[MQ死信] mq DLQ received, key={}, payload={}",
              record.key(), truncate(mask(record.value()), 8192));
    // 通常需要落库 + 触发告警，等人工介入
}
```

---

## 生产者侧（简要）

发送端也要遵守：

```java
// ✅ 发送时把 traceId 放到 header，让消费者能续上链路
producer.send(new ProducerRecord<>(topic, null, key, value,
    List.of(new RecordHeader("X-Trace-Id", MDC.get("traceId").getBytes()))));

log.info("[MQ生产] mq sent, topic={}, key={}", topic, key);   // INFO 关键节点

// 发送失败回调
callback -> {
    if (ex != null) {
        log.error("[MQ生产] mq send failed, topic={}, key={}", topic, key, ex);
    }
}
```

**注意**：发送 body 不要打 INFO，同 HTTP 规则。

---

## 多语言实现

### Go（sarama/segmentio）

```go
func (c *Consumer) Handle(ctx context.Context, msg kafka.Message) error {
    traceID := headerVal(msg, "X-Trace-Id", uuid.NewString)
    logger := log.With().Str("traceId", traceID).Str("msgId", string(msg.Key)).Logger()

    logger.Debug().Str("topic", msg.Topic).Msg("[MQ消费] mq received")
    if err := process(ctx, msg); err != nil {
        logger.Warn().Err(err).Msg("[MQ消费] mq retry")
        return err
    }
    return nil
}
```

### Python（aiokafka + structlog）

```python
async def consume(msg):
    trace_id = next((v.decode() for k, v in msg.headers if k == "X-Trace-Id"), f"mq-{uuid4().hex}")
    log = structlog.get_logger().bind(trace_id=trace_id, msg_id=msg.key)
    log.debug("[MQ消费] mq received", topic=msg.topic)
    try:
        await process(msg.value)
    except RetryableError as e:
        log.warn("[MQ消费] mq retry", cause=str(e))
        raise
```

---

## Checklist

- [ ] 消息 header 中透传了 traceId（生产者 + 消费者两侧）
- [ ] 成功日志按消息频次选级别（高频 DEBUG / 低频 INFO）
- [ ] 幂等命中打 INFO 且带 msgId
- [ ] 每次重试打 WARN 且带 retryCount + cause
- [ ] 死信打 ERROR 且带完整脱敏 payload
- [ ] MDC 在 finally 中清理（避免消费线程复用串号）
- [ ] payload 有大小截断（防止大消息撑爆日志）
