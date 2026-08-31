# 场景：HTTP 同步接口

> Controller → Service → HTTP Client 全链路日志约束。适用 REST/GraphQL 同步请求。

---

## 独有规则（与其他场景的差异）

1. **分层职责必须严格分开**：Gateway 打 access，Service 打业务里程碑，Client 打依赖调用
2. **HTTP Client 拦截器必须智能分级**：正常 DEBUG / 慢或失败 WARN 安全快照
3. **Controller 层禁止业务日志**：只处理转发，日志留给 Service
4. **每个请求 INFO 上限 3 条**（入口 + 出口 + 至多 1 个关键跃迁）
5. **小型安全请求 DTO 允许 INFO 受控全量**：必须字段受控、低频，并经过统一脱敏和限长；否则只打摘要

---

## 完整参考实现（Java/Spring）

### 1. TraceFilter：MDC 注入（每个请求开头必装）

```java
@Component
public class TraceFilter extends OncePerRequestFilter {
    private static final String HEADER = "X-Trace-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp,
                                    FilterChain chain) throws IOException, ServletException {
        String traceId = Optional.ofNullable(req.getHeader(HEADER))
                                 .filter(s -> !s.isEmpty())
                                 .orElse(UUID.randomUUID().toString().replace("-", ""));
        MDC.put("traceId", traceId);
        MDC.put("userId", UserContext.getUserIdOrAnon());
        try {
            chain.doFilter(req, resp);
        } finally {
            MDC.clear();
        }
    }
}
```

### 2. Controller：日志零污染

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    // ✅ 不打日志；method/path/status 由 Gateway 记录，业务参数由 Service 记录
    @PostMapping
    public Result<OrderVO> create(@Valid @RequestBody CreateOrderReq req) {
        return Result.ok(orderService.create(req));
    }
}
```

### 3. Service：里程碑 + 异常现场

```java
@Slf4j
public class OrderService {
    public OrderVO create(CreateOrderReq req) {
        // CreateOrderReq 小且字段受控；safeLog 统一脱敏并限制长度
        log.info("[订单创建] createOrder request={}", safeLog(req));

        ProductDTO product = productClient.get(req.getSkuId());
        if (product.getStock() < req.getQty()) {
            log.warn("[订单创建] stock not enough, skuId={}, need={}, remain={}",
                     req.getSkuId(), req.getQty(), product.getStock());
            throw new BizException(ErrorCode.STOCK_NOT_ENOUGH);
        }

        Order order = orderRepo.save(build(req, product));
        log.info("[订单创建] createOrder done, orderId={}, amount={}", order.getId(), order.getAmount());
        return OrderVO.from(order);
    }
}
```

### 4. SmartHttpLogInterceptor：智能分级（本场景的杀手锏）

```java
@Slf4j
public class SmartHttpLogInterceptor implements ClientHttpRequestInterceptor {
    private static final int SLOW_MS = 500;
    private static final int BODY_MAX = 2048;

    @Override
    public ClientHttpResponse intercept(HttpRequest req, byte[] body,
                                        ClientHttpRequestExecution exec) throws IOException {
        long start = System.currentTimeMillis();
        ClientHttpResponse resp = exec.execute(req, body);
        long cost = System.currentTimeMillis() - start;
        BufferedResponse buf = new BufferedResponse(resp);

        boolean abnormal = buf.getStatusCode().isError() || cost > SLOW_MS;
        if (abnormal) {
            log.warn("[HTTP客户端] HTTP {} {} status={} cost={}ms reqBody={} respBody={}",
                     req.getMethod(), req.getURI(), buf.getStatusCode().value(), cost,
                     truncate(mask(new String(body)), BODY_MAX),
                     truncate(mask(buf.bodyAsString()), BODY_MAX));
        } else if (log.isDebugEnabled()) {
            log.debug("[HTTP客户端] HTTP {} {} status={} cost={}ms",
                      req.getMethod(), req.getURI(), buf.getStatusCode().value(), cost);
        }
        return buf;
    }
}
```

---

## 多语言实现

### Go（gin + zerolog）

```go
func TraceMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        traceID := c.GetHeader("X-Trace-Id")
        if traceID == "" {
            traceID = uuid.NewString()
        }
        ctx := log.With().Str("traceId", traceID).Logger().WithContext(c.Request.Context())
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}

// Service 层
func (s *OrderService) Create(ctx context.Context, req CreateReq) (*Order, error) {
    log.Ctx(ctx).Info().Str("skuId", req.SkuID).Int("qty", req.Qty).Msg("[订单创建] createOrder start")
    // ...
}
```

### Python（FastAPI + structlog）

```python
@app.middleware("http")
async def trace_middleware(request: Request, call_next):
    trace_id = request.headers.get("x-trace-id") or uuid4().hex
    structlog.contextvars.bind_contextvars(trace_id=trace_id)
    try:
        return await call_next(request)
    finally:
        structlog.contextvars.clear_contextvars()

# Service 层
log = structlog.get_logger()
def create_order(req: CreateOrderReq):
    log.info("[订单创建] createOrder start", sku_id=req.sku_id, qty=req.qty)
```

### Node.js（Express + pino + AsyncLocalStorage）

```javascript
const store = new AsyncLocalStorage();
app.use((req, res, next) => {
    const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
    store.run({ traceId, userId: req.user?.id }, () => next());
});
const log = pino({ mixin: () => store.getStore() || {} });
```

---

## Checklist

Review HTTP 接口时逐项检查：

- [ ] 入口 Filter 是否注入 MDC（traceId / userId）
- [ ] Controller 是否没有日志（只有转发）
- [ ] Service 每个方法 INFO 日志 ≤ 3 条
- [ ] INFO 完整请求是否满足字段受控、低频、统一脱敏和限长；否则是否退回摘要
- [ ] 异常分支是否带够复现字段
- [ ] HTTP Client 是否装了智能拦截器（慢/失败自动 WARN）
- [ ] Client 日志有没有脱敏 + 截断
- [ ] `log.error` 是否传了 exception 参数（不是 `getMessage`）
- [ ] `@Async` 或线程池调用是否透传 MDC（跳去 [`async-mdc.md`](async-mdc.md) 验证）
