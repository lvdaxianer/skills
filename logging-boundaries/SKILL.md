---
name: logging-boundaries
description: "Use when writing or reviewing backend production logs for HTTP handlers, services, scheduled jobs, MQ consumers, RPC clients, AOP, or async tasks; when code uses log levels, MDC, traceId, Actuator loggers, Logback, Slf4j, Zap, Zerolog, structlog, pino, or winston; or when diagnosing log volume, hot DEBUG, sensitive-data leakage, redaction, and production debuggability."
---

# logging-boundaries

生产日志的**边界与纪律**。适用后端全语言（Java/Go/Python/Node）。

> **一句话定位**：Metrics 管数值，Trace 管链路，audit 管合规，本 skill 管**「什么事件在什么级别打什么字段」**这一件事。

---

## 触发条件

在以下任一情况自动使用本 skill：

- 新增或修改 Controller / Service / `@Scheduled` / MQ Consumer / RPC Client
- 代码中出现 `log.info` / `log.warn` / `log.error` / `log.debug` / `logger.` / `MDC.` / `traceId`
- 出现 `Slf4j`、`Logback`、`zap`、`zerolog`、`structlog`、`pino`、`winston` 等日志库
- 用户提到「日志、log、可观测性、observability、生产调试、DEBUG 热开、日志爆炸、traceId、脱敏」
- Code review 时发现下列反模式（详见 [`references/anti-patterns.md`](references/anti-patterns.md)）：
  - `log.info(req)` / `log.info(resp)` 未经安全序列化直接打整个 body
  - 循环内每次迭代打日志
  - `log.error("失败: " + e.getMessage())` 无 stack
  - 明文敏感字段（phone / password / token / idCard）
  - 业务上下文内的日志缺 traceId

---

## 5 条铁律（违反任一条 = CRITICAL）

任何时候，代理在写日志或 review 日志时，必须逐条对照下表：

| # | 铁律 | 判定 |
|---|------|------|
| 1 | **DEBUG 必须支持不重启热开** | 项目必须启用受访问控制保护的 Actuator `/loggers`（Java）或等价机制（Go/Python 用配置中心 + 监听），粒度到「包」或「类」 |
| 2 | **INFO 摘要或受控全量 / DEBUG 安全快照** | 小型、安全、字段受控且低频的请求 DTO，经统一脱敏和限长后，INFO 允许完整记录；其他请求 INFO 只打业务摘要，DEBUG 只打脱敏、限长的诊断快照。任何级别都禁止原样序列化未受控 body |
| 3 | **业务上下文内必带 traceId** | HTTP 请求、MQ 消费、定时任务、RPC 调用 —— 所有业务上下文内的日志必须自动带 traceId；存在认证或租户上下文时再带 userId / tenantId。系统级日志（启动、GC、框架初始化）豁免 |
| 4 | **敏感字段全局脱敏** | 手机号、身份证、银行卡、password、token 必须由日志框架层（Logback Converter / zerolog Hook / structlog processor）统一脱敏，不依赖业务代码自觉 |
| 5 | **异步/线程池必须透传 MDC** | `@Async`、`ExecutorService`、`CompletableFuture` 一律要求验证 MDC 传播（Java 用 TTL 或 TaskDecorator；Go 用 context；Python 用 contextvars） |

**5 条铁律不是"最佳实践建议"，是硬性红线**。Review 时任一条违反直接标为 `必须修复 (CRITICAL)`。

---

## 决策矩阵（速查）

**在什么事件打什么级别** —— 打开 [`references/decision-matrix.md`](references/decision-matrix.md) 查完整表。核心口诀：

```
业务里程碑 → INFO 摘要或受控全量（常开）
异常分支   → WARN + 安全上下文（常开）
未预期异常 → ERROR + stack（常开）
过程细节   → DEBUG 安全诊断快照（默认关，热开）
高频数值   → 不打日志，走 Metrics
```

**级别决策 3 步法**：

1. 这条日志**是否影响业务判断/告警**？
   - 是 → INFO 或以上
   - 否 → DEBUG
2. 是否代表**异常或值得关注**的分支？
   - 业务预期内异常（校验失败、库存不足、幂等命中）→ WARN
   - 未预期异常（NPE、超时、OOM）→ ERROR
   - 正常业务流转 → INFO
3. **生产会不会爆炸**？
   - 高频（>100 QPS）→ 降级到 DEBUG 或用 Metrics
   - 低频关键 → INFO 保留

---

## 场景细则

按场景加载对应的约束文档（**只加载相关场景，避免上下文膨胀**）：

- [`scenarios/http-api.md`](scenarios/http-api.md) — Controller / Service / HTTP Client 拦截器
- [`scenarios/scheduled-job.md`](scenarios/scheduled-job.md) — 定时任务 / 批处理 / 循环收敛
- [`scenarios/mq-consumer.md`](scenarios/mq-consumer.md) — Kafka / RocketMQ / RabbitMQ 消费者
- [`scenarios/aop-loggable.md`](scenarios/aop-loggable.md) — `@Loggable` 通用切面，业务零侵入
- [`scenarios/async-mdc.md`](scenarios/async-mdc.md) — 异步/线程池 MDC 透传（跨场景共用）

---

## Review 输出格式

在 review 模式下按此格式输出：

```
## 日志治理审查

### 必须修复 (CRITICAL)
- [file:line] 违反铁律 #X：<具体问题>
  正例：<修改建议代码片段>

### 应该修复 (HIGH/MEDIUM)
- [file:line] <场景不匹配 / 级别不当 / 字段缺失>

### 可优化 (LOW)
- <可读性 / 格式统一 / MDC 上下文丰富度>

### 遵守情况汇总
- 铁律 1 (DEBUG 热开):     ✅/❌
- 铁律 2 (INFO/DEBUG 分层): ✅/❌
- 铁律 3 (traceId 全覆盖):  ✅/❌
- 铁律 4 (敏感脱敏):        ✅/❌
- 铁律 5 (异步 MDC 透传):   ✅/❌
```

---

## 边界之外（本 skill 不处理）

明确不管的领域，如果 review 时发现相关问题，**引导用户去对应工具**而不是把它塞进日志：

| 领域 | 该用什么 | 常见误用 |
|------|---------|---------|
| 高频数值统计（QPS、latency 分布） | Prometheus / Micrometer | `log.info("QPS={}", qps)` |
| 跨服务链路追踪 | OpenTelemetry / SkyWalking | `log.info("step1")` `log.info("step2")` 靠人肉串 |
| 合规审计（谁做了什么） | 独立 audit log 表 / audit skill | 写到业务 log 里，被日志轮转策略删除 |
| 前端错误上报 | Sentry / 前端观测方案 | 后端 `log` 兜前端错误 |

---

## 通用后端多语言支持

**5 条铁律 = 语言无关**。代码示例按语言分开：

- Java/Spring：Slf4j + Logback + Actuator + `@Loggable` AOP
- Go：zerolog / zap + middleware + context
- Python：structlog + FastAPI middleware + contextvars
- Node.js：pino + async_hooks / AsyncLocalStorage

按项目实际技术栈只加载对应示例，参见各 `scenarios/*.md` 的「多语言实现」小节。
