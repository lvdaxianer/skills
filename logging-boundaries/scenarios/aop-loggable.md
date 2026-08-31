# 场景：AOP 切面日志（`@Loggable`）

> 通用横切：方法进入/退出/异常/耗时全自动记录，业务代码零污染。适合团队"一次配置全局生效"。

---

## 独有规则

1. **`logArgs / logResult` 默认 false**：明确开启才打，防止手滑泄露敏感字段或打大对象
2. **切面日志不代替 Service 里程碑**：切面打「方法进出+耗时」，Service 打「业务决策」，二者并存不重复
3. **DAO / Repository 层禁用**：即使加了 `@Loggable` 也应在切面配置里排除
4. **超阈值自动升级 WARN**：慢方法自动打 WARN，不用业务代码显式判断
5. **必须支持粒度控制**：包级 / 类级 / 方法级注解都能生效，优先级由细到粗

---

## `@Loggable` 注解定义

```java
/**
 * 通用日志切面注解
 * 可加在类或方法上；类上表示所有方法都启用
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Loggable {
    /** 正常日志级别 */
    LogLevel level() default LogLevel.INFO;

    /** 异常日志级别 */
    LogLevel errorLevel() default LogLevel.WARN;

    /** 是否打印参数（默认关，防敏感泄露） */
    boolean logArgs() default false;

    /** 是否打印返回值（默认关，防大对象） */
    boolean logResult() default false;

    /** 慢方法阈值（毫秒），超过自动 WARN */
    long slowThresholdMs() default 500;
}
```

## 切面实现

```java
@Slf4j
@Aspect
@Component
public class LoggableAspect {

    @Around("@annotation(loggable) || @within(loggable)")
    public Object around(ProceedingJoinPoint pjp, Loggable loggable) throws Throwable {
        String method = pjp.getSignature().toShortString();
        long start = System.currentTimeMillis();

        // 入口日志：默认只有方法名，不带参数
        logEntry(method, loggable, pjp.getArgs());

        try {
            Object result = pjp.proceed();
            long cost = System.currentTimeMillis() - start;

            // 出口：慢方法自动 WARN
            if (cost > loggable.slowThresholdMs()) {
                log.warn("[方法调用] {} slow, cost={}ms", method, cost);
            } else {
                logExit(method, loggable, result, cost);
            }
            return result;

        } catch (Throwable e) {
            long cost = System.currentTimeMillis() - start;
            // 异常：按注解 errorLevel（默认 WARN），带方法名 + 摘要参数
            logException(method, loggable, pjp.getArgs(), cost, e);
            throw e;
        }
    }

    private void logEntry(String method, Loggable ann, Object[] args) {
        if (ann.logArgs()) {
            log.info("[方法调用] {} enter, args={}", method, truncate(mask(Arrays.toString(args)), 512));
        } else {
            log.debug("[方法调用] {} enter", method);   // 默认 DEBUG，不侵扰生产
        }
    }

    private void logExit(String method, Loggable ann, Object result, long cost) {
        if (ann.logResult()) {
            log.info("[方法调用] {} exit, cost={}ms, result={}", method, cost,
                     truncate(mask(String.valueOf(result)), 512));
        } else {
            log.debug("[方法调用] {} exit, cost={}ms", method, cost);
        }
    }

    private void logException(String method, Loggable ann, Object[] args, long cost, Throwable e) {
        log.warn("[方法调用] {} throw {} after {}ms, argsSummary={}",
                 method, e.getClass().getSimpleName(), cost,
                 truncate(mask(Arrays.toString(args)), 256));
    }
}
```

## 使用示例

```java
// 方式 1：加在方法上
@Loggable(slowThresholdMs = 300)
public OrderVO create(CreateOrderReq req) {
    // ...
}

// 方式 2：加在类上，所有方法默认启用
@Loggable
@Service
public class OrderService {
    public OrderVO create(...) { }
    public void cancel(...) { }
}

// 方式 3：需要看参数时显式开启（谨慎，注意脱敏）
@Loggable(logArgs = true, logResult = true)
public InternalReport buildReport(ReportQuery q) { }
```

---

## 切面 vs Service 日志：如何不重复

**切面负责的**：
- 方法进入/退出（DEBUG，热开）
- 耗时（DEBUG，慢方法自动 WARN）
- 异常传播（WARN + 方法名）

**Service 负责的**（切面代替不了）：
- 业务里程碑（`createOrder start/done`）
- 业务决策原因（`stock not enough, need=5, remain=1`）
- 业务实体 ID（`orderId=O001`）

**判断标准**：如果这条日志**只在这个业务方法有意义**，写在 Service；如果**任何方法都可能用**，交给切面。

---

## 多语言实现

### Python（decorator）

```python
def loggable(slow_ms=500, log_args=False):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            log = structlog.get_logger()
            start = time.time()
            if log_args:
                log.debug("[方法调用] enter", func=func.__name__, args=mask(str(args)))
            try:
                result = func(*args, **kwargs)
                cost = (time.time() - start) * 1000
                if cost > slow_ms:
                    log.warning("[方法调用] slow", func=func.__name__, cost_ms=cost)
                return result
            except Exception as e:
                log.warning("[方法调用] throw", func=func.__name__, exc=type(e).__name__)
                raise
        return wrapper
    return decorator

@loggable(slow_ms=300)
def create_order(req): ...
```

### Go（middleware/handler wrapper）

Go 没有装饰器语法，通常通过 middleware 或函数包装实现类似效果，粒度到 HTTP handler 层。

---

## Checklist

- [ ] `@Loggable` 默认 `logArgs=false / logResult=false`
- [ ] DAO / Repository 层被切面 pointcut 排除
- [ ] 慢阈值有合理默认值（建议 500ms）
- [ ] 异常分支不吞异常（记录后 throw）
- [ ] 打印的参数/结果经过 mask + truncate
- [ ] 切面日志和 Service 里程碑不重复
- [ ] 项目里明确文档：**Service 里程碑仍需手动打**，切面不代替
