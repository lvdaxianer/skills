---
name: code-review-spec
description: Use when performing or requesting code review, code formatting, or code edits in any language (Java, Python, Go, TypeScript, Vue, etc.). Enforces code specifications, comments, naming, security, exception handling, logging, database/API rules, git commit format, dependency management, complexity limits, null safety, parameter limits, duplication, constants, collection capacity, string concatenation, and equals/hashCode. Trigger automatically when code is modified or formatted.
---

# code-review-spec.md

## 角色定义

> 你是一位经验丰富的架构师，从整体视角审视代码质量，重点关注可维护性、可扩展性与性能。

---

## 0. Skill 冲突处理原则（元规则）

> **原则**：本 skill 与 `backend-reliability-guidelines`、`frontend-interaction-guidelines`、`logging-boundaries`、`ddd` 等其他 skill **不能相互冲突**。当出现字面冲突时，按下表定位权威 skill，本 skill 不再重复约束该领域。

| 领域 | 权威 skill |
|------|------------|
| 后端可靠性（幂等、事务、并发、迁移、环境隔离、fail-fast、审计） | `backend-reliability-guidelines` |
| 前端交互（防重、乐观更新、状态一致性、破坏性操作确认） | `frontend-interaction-guidelines` |
| 生产日志治理（级别、traceId、脱敏、MDC 透传、Actuator 热开） | `logging-boundaries` |
| DDD 战术/战略设计（聚合、领域事件、Repository 边界、四层架构） | `ddd` |
| 代码级红线（注释、命名、方法长度、空值、参数、重复、魔法数字等） | **本 skill** |

**冲突处置流程**：

1. 在本 skill 中命中某条规则时，若同时属于其他 skill 的权威领域，以另一 skill 为准
2. 本 skill 相关条款须显式引用另一 skill，不得复述其细则
3. 若两条 skill 均未覆盖某边界情况，视为可讨论空间，须在 code review 报告中标注"跨 skill 未定义"

---

# 第一部分：规范类（必须遵守的底线）

> **特别重要**：以下规范不区分语言，适用于 Java、Python、Go、TypeScript、Vue 等。规范约束的是行为和格式，不是语法；注释风格按语言惯例选择。

## 1. 代码修改范围

> 有 git 的项目执行 `git diff`，仅优化修改部分；无 git 的项目则全局修改。

## 2. 作者标识

仅**新添加的方法或类**需要填写 `@author`，且**禁止写死任何固定作者**。作者标识按以下优先级解析：

1. **用户明确指定**：本轮会话或需求中用户给定的作者（最高优先级）
2. **默认作者**：用户说"默认"或要求使用默认值时，使用 `lvdaxianer@yeah.net`
3. **项目既有约定**：当前仓库已有代码中使用的 `@author` 值（取占主导或最近使用的）
4. **Git 配置**：`git config user.email`（或 `user.name`）
5. **提问确认**：以上渠道都无法确定时，**必须先向用户提问作者写谁，得到答复后再继续**，不得擅自填写

> 已存在的方法或类，无需修改原有 `@author`。

## 3. 代码规范

### 3.1. 方法注释规范

每个方法必须包含完整文档注释，风格随语言而变。

> **代码示例**：详见 [references/method-comments.md](references/method-comments.md)

### 3.2. 类注释规范

每个类必须包含完整文档注释。

> **代码示例**：详见 [references/class-comments.md](references/class-comments.md)

### 3.3. 条件分支注释规范

每个 if-else 分支必须包含清晰注释。

> **代码示例**：详见 [references/if-else-comments.md](references/if-else-comments.md)

**注意**：优先使用 if-else，而非 switch-case；如必须使用 switch-case，每个 case 都必须有 default。

### 3.3.1. if-else 分支处理规范（强制）

> **强制要求**：if 语句必须覆盖所有需要处理的分支；当 else 分支有明确处理逻辑时必须写出。若 else 分支确实没有可执行逻辑、无需设置默认值或降级值，且不会造成未初始化、空值、状态不一致、资源泄漏、缺少关键日志等风险，可以省略 else。

**核心原则**：
- if 分支有对应的异常、默认、降级、状态设置或日志处理时，必须写出 else
- 如果 if 分支是**设置值**，else 必须设置**合理值**；可为初期值、默认值、空值、备选值、降级值等
- 如果 else 分支没有实际业务含义，仅为空代码块、重复注释或占位语句，可以省略
- 该规范用于确保所有分支路径都被正确处理，提升健壮性

> **代码示例（正确/错误示例及合理值类型表）**：详见 [references/if-else-pairing.md](references/if-else-pairing.md)

### 3.4. 代码注释要求

注释行数应占代码文件总行数约 **60%**，最低不得低于 **40%**（40%–60% 均可接受）。

### 3.5. 方法行数限制

每个方法不得超过 **20 行**。超过必须立即重构，将复杂逻辑提取为独立私有方法。

**重构原则**：每个方法只做一件事，方法名应清晰表达其功能。

### 3.6. 批量处理规范

> 能用批量处理的场景，禁止使用 for 循环逐条处理。

批量处理优势：
- 减少数据库/网络往返次数
- 提升系统吞吐量
- 降低资源占用

> **代码示例（Java/Python/TypeScript）**：详见 [references/batch-processing.md](references/batch-processing.md)

### 3.7. 循环内禁止调用远程服务或数据库

> 禁止在 for、map、forEach、filter 等循环结构中直接调用远程服务或连接数据库。

**核心危害**：
- **性能崩塌**：远程调用形成 O(n) 网络开销，响应时间随数据量线性增长
- **资源耗尽**：快速耗尽数据库连接池，导致超时或崩溃
- **服务雪崩**：下游服务承受海量并发请求，易触发限流或熔断
- **事务风险**：循环内数据库操作可能导致长事务与锁竞争

> **代码示例（正确/错误示例及滑动窗口批处理）**：详见 [references/loop-remote-calls.md](references/loop-remote-calls.md)

**正确做法**：
1. **批量接口**：提供批量查询 API，如 `findAllById(ids)`、`getUsersByIds(ids)`
2. **内存操作**：循环只做内存数据转换、聚合等无副作用操作
3. **异步批处理**：如必须分批，使用滑动窗口或并发批处理，如每批 100 条
4. **缓存预热**：热点数据提前加载到缓存，减少循环内远程调用

**豁免条款**：循环内远程/DB 调用的可靠性判定由 `backend-reliability-guidelines` 管辖（`Idempotency` / `Concurrency control` / `Transactions and consistency` / `Performance and scalability` / `Background jobs and queues` 五个维度）。当该 skill 判定为通过时，本条视为豁免，但仍需在代码或 OpenSpec 变更中记录豁免理由；未经该 skill 覆盖或判定未通过时，仍按强制项判定。

### 3.8. Java 线程池规范

> **仅适用于 Java**：禁止使用已定义线程池（如 `ExecutorService`、`@Async` 默认线程池），必须使用自定义线程池。
> **隔离要求**：不同业务必须使用不同线程池，禁止多个核心业务长期共用同一线程池。

#### 3.8.1. 线程池定义要求

- 必须定义有意义的 `threadName`，使用 `ThreadFactory` 设置
- 必须使用有业务含义的日志标识
- 线程池名称应体现业务用途
- 不同业务必须使用独立线程池，避免相互争抢资源导致排队、超时或雪崩
- 线程池队列、拒绝策略、超时控制必须与业务吞吐量匹配

> **代码示例（正确/错误示例及命名规范表）**：详见 [references/thread-pool.md](references/thread-pool.md)

#### 3.8.2. 线程持有风险规范（强制）

> **强制要求**：线程池任务不得无控制地长时间持有线程，避免线程池打满。

以下行为必须重点审查：
- `Thread.sleep`、定时等待、重试等待等主动等待
- 轮询状态、阻塞等待锁、阻塞等待异步结果
- 阻塞 IO、慢第三方接口调用、长事务或长时间数据库操作
- 在线程池任务中同步调用 HTTP、RPC、SDK 或其他阻塞远程服务

如果业务确实需要长时间持有线程，必须具备独立业务线程池、明确超时控制、合理队列容量、拒绝策略、监控日志，并优先考虑任务拆分、定时调度或异步化。在线程中同步调用 HTTP、RPC、SDK 或其他阻塞远程服务时，专用线程池必须与核心请求线程池和其他业务线程池隔离，且同时配置连接超时、读取超时和整体调用超时；否则下游阻塞可能耗尽核心线程并阻塞后续请求。异步非阻塞客户端可使用事件循环，但必须提供等价的并发上限和超时控制证据。

### 3.9. 空值处理规范（Null Safety）

> **强制要求**：禁止直接返回 `null`，必须使用语言提供的空值安全机制。

**核心原则**：
- 返回值可能不存在时，使用 `Optional`、`T | undefined`、`T | None` 显式声明
- 调用方必须处理空值，提供默认值或明确异常
- 参数传递时不使用 Optional 包装，直接传对象并在方法内处理

> **代码示例（Java/TypeScript/Python/Go 各语言规范、返回值/参数/检查规范表）**：详见 [references/null-safety.md](references/null-safety.md)

### 3.10. 函数参数数量限制

> **强制要求**：函数参数数量必须严格控制，超过限制必须重构。

| 参数数量 | 处理方式 |
|----------|----------|
| 1-3 个 | 直接传参，清晰简洁 |
| 4-5 个 | 使用配置对象/结构体/字典 |
| 6+ 个 | **必须重构**：拆分函数或封装参数类 |

> **代码示例（各语言正确/错误示例、参数对象设计原则）**：详见 [references/function-parameters.md](references/function-parameters.md)

### 3.11. 代码重复检测

> **强制要求**：相同或相似代码出现多次时，必须提取为公共方法/函数。

| 重复程度 | 处理要求 |
|----------|----------|
| 相同代码块 ≥ 3 处 | **必须**提取为公共方法 |
| 相似代码块 ≥ 2 处 | **应该**提取，并用参数区分差异 |
| 结构相似但逻辑不同 | 考虑抽象模板方法模式 |

> **代码示例（各语言提取公共方法、模板方法模式、检测方法）**：详见 [references/code-duplication.md](references/code-duplication.md)

### 3.12. 常量与魔法数字规范

> **强制要求**：禁止直接使用魔法数字、魔法字符串，必须定义为常量或枚举。

**魔法数字定义**：代码中直接出现、含义不明确的数字或字符串。

**常量定义原则**：
- 使用 UPPER_SNAKE_CASE 命名（Go 可用 CamelCase）
- 按业务领域分组组织常量
- 固定选项优先使用枚举，单值阈值使用常量

> **代码示例（各语言常量/枚举示例、命名规范、组织方式）**：详见 [references/magic-numbers.md](references/magic-numbers.md)

### 3.13. 集合初始化容量规范

> **强制要求**：创建集合时必须指定合理初始容量，避免不必要扩容。

**扩容影响**：
- 每次扩容都要创建新数组并复制旧数据
- 多次扩容会带来额外内存分配和 CPU 消耗
- HashMap 需考虑 loadFactor（默认 0.75）

> **代码示例（各语言集合容量规范、默认容量表、容量计算公式）**：详见 [references/collection-capacity.md](references/collection-capacity.md)

### 3.14. 字符串拼接规范

> **强制要求**：禁止在循环内使用 `+` 或 `concat` 拼接字符串，必须使用 StringBuilder/StringBuffer 或语言提供的字符串连接方式。

**性能影响**：
- 字符串不可变，每次拼接都会创建新对象
- 循环内拼接性能会退化到 O(n²)
- 大量临时对象会增加 GC 压力

> **代码示例（各语言正确/错误示例、拼接方法选择指南、性能对比）**：详见 [references/string-concatenation.md](references/string-concatenation.md)

### 3.15. equals/hashCode 规范

> **强制要求**：重写 `equals` 时**必须**同时重写 `hashCode`，否则会导致 Map/Set 行为异常。

**契约关系**：
- 相等对象必须有相同哈希值
- 哈希值相同不一定相等（哈希冲突）
- 多次调用 hashCode 必须返回相同值

> **代码示例（各语言正确实现、IDE生成/Lombok、实现清单）**：详见 [references/equals-hashcode.md](references/equals-hashcode.md)

## 4. 命名规范

### 4.1. 文件命名
- 类文件使用 PascalCase，如 `UserService.java`、`UserService.ts`
- Vue 组件文件使用 PascalCase 或 kebab-case，如 `UserCard.vue`
- 变量和方法使用 camelCase
- 配置文件使用 kebab-case
- 常量使用 UPPER_SNAKE_CASE
- Python 文件使用 snake_case，如 `user_service.py`

### 4.2. 变量命名
- 布尔变量使用 `is`、`has`、`can`、`should` 前缀
- 集合变量使用复数形式
- 避免单字母名称（循环变量除外）

### 4.3. 方法命名
- `get`/`set`：属性访问
- `find`/`search`：查询
- `create`/`update`/`delete`：增删改操作
- `validate`/`check`：验证
- `handle`/`process`：处理逻辑

## 5. 安全规范

- 不硬编码密码、密钥或令牌
- 使用环境变量或配置中心管理 secrets
- 日志中不记录敏感信息
- 所有外部输入必须验证
- SQL 使用参数化查询
- XSS 过滤和清理

> **深化引用**：本条只列代码级红线。以下由 `backend-reliability-guidelines` 管辖，本 skill 不重复：
>
> - 输入验证的类型/长度/枚举/格式/金额精度/白名单字段（防 mass assignment）→ `Validation`
> - Command injection / path traversal / SSRF / 反序列化风险 → `Security`
> - Secret manager 强制、身份证/银行卡等敏感字段的完整枚举 → `Security`
> - 日志脱敏字段清单与实现层次 → `logging-boundaries`

## 6. 异常处理规范（扩展）

### 6.1. OAuth2 认证登录异常日志规范（强制）

> **适用场景**：OAuth2、JWT、SSO 等认证登录流程。

**强制要求**：认证登录流程中，所有异常情况及可能导致退出认证的 if 分支**必须打印 WARN 日志**。

| 场景 | 日志级别 | 示例 |
|------|----------|------|
| Token 过期/无效 | WARN | `[OAuth2认证] Token无效或已过期, tokenId={}` |
| 签名验证失败 | WARN | `[OAuth2认证] Token签名验证失败, error={}` |
| 认证信息缺失 | WARN | `[OAuth2认证] 认证信息缺失, missingField={}` |
| 权限不足/拒绝访问 | WARN | `[OAuth2认证] 权限不足, userId={}, requiredRole={}` |
| 认证服务不可用 | WARN | `[OAuth2认证] 认证服务调用失败, error={}` |
| Token 被吊销 | WARN | `[OAuth2认证] Token已被吊销, tokenId={}` |
| 第三方认证失败 | WARN | `[OAuth2认证] 第三方认证失败, provider={}, error={}` |
| 会话失效/过期 | WARN | `[OAuth2认证] 会话已失效或过期, sessionId={}` |

> **代码示例**：详见 [references/oauth2-auth-logging.md](references/oauth2-auth-logging.md)

### 6.2. 异常类型选择
- **RuntimeException / Error**：程序员错误（逻辑 Bug）
- **CheckedException / IOError**：外部依赖失败（IO、网络）
- **自定义异常**：业务错误

### 6.2. 异常抛出原则
- 不要捕获而不处理，至少记录日志
- 不要捕获 `Throwable` / `Exception` / `Error`
- 不要在 finally 块中抛出异常

> **代码示例（Java/Go/TypeScript/Python）**：详见 [references/exception-handling.md](references/exception-handling.md)

**豁免条款——全局异常兜底**：以下场景可捕获 `Throwable`/`Exception`/`Error` 作为**唯一**兜底层，但必须转成稳定的错误契约后返回，不得静默吞掉：

- Spring `@ControllerAdvice` + `@ExceptionHandler(Exception.class)` 全局异常处理器
- Node/Express `app.use((err, req, res, next) => …)` 错误处理中间件
- Python FastAPI/Django `exception_handler`、全局 middleware
- Go `defer recover()` 位于 HTTP handler 最外层
- MQ 消费者、定时任务、线程池任务的最外层 catch（用于避免线程死亡 + 转入死信/重试记录）

> 稳定错误契约的字段、状态码、脱敏、可恢复性由 `backend-reliability-guidelines` 的 `Error handling` 维度定义，本 skill 不重复。

## 7. 日志规范

### 7.1. 统一 HTTP 请求入口审计日志规范（强制）

> **适用场景**：Controller、Handler、REST/GraphQL 端点及其 Gateway、Filter、Middleware、AOP 等统一请求入口。

**强制要求**：每个 HTTP 请求必须由一个统一入口审计机制覆盖。该机制在 INFO 级别记录请求标识、开始时间、结束时间、总耗时（毫秒）、最终结果状态和 traceId。Controller/Handler 只负责转发，不得在已覆盖的情况下重复记录请求审计日志。

| 审计阶段 | 日志级别 | 必须记录的内容 |
|----------|----------|----------------|
| 请求开始 | INFO | 请求标识、开始时间、请求方法、路径、traceId |
| 请求结束 | INFO | 请求标识、结束时间、总耗时（`durationMs`）、最终结果状态、traceId |

请求与响应详情如有必要只能记录统一脱敏、限长后的安全快照；不得原样输出未受控 body、密码、Token、Cookie 或 API Key。

> **代码示例**：详见 [references/logging.md](references/logging.md)

**分层说明——本条仅约束 HTTP 请求层**：

- 本条只覆盖"一次 HTTP 请求进出"的入口审计（开始/结束/耗时），"不得重复"约束的是**同一层的重复打点**（例如 Filter 已打了，Controller 再打一次开始/结束）。
- Service/Domain 层针对**关键业务操作**（金额、库存、配额、权限、发布、删除、批量导入等）的审计日志（含 `actor / target / action / time / result`）不受本条约束，由 `backend-reliability-guidelines` 的 `Observability` 维度管辖，两者**必须**共存。
- 日志级别、traceId 透传、MDC 传递、脱敏细则由 `logging-boundaries` 管辖，本 skill 不重复。

### 7.2. 服务间调用日志规范（强制）

> **适用场景**：HTTP/REST、gRPC、GraphQL 等服务间调用。

**强制要求**：调用其他服务时，必须记录调用目标、响应状态和耗时；请求参数、Header、响应体仅允许记录统一脱敏、限长后的安全快照。

| 调用阶段 | 日志级别 | 必须记录的内容 |
|----------|----------|----------------|
| 发起请求 | DEBUG | 请求 URL、HTTP 方法、开始时间、Header（脱敏）、安全请求快照 |
| 收到响应 | DEBUG | 响应状态码、结束时间、响应耗时、受控安全响应快照 |
| 调用失败 | WARN | 错误信息、异常堆栈、请求上下文 |

**日志格式规范**：

```text
[服务间调用] 阶段|服务名称|接口|状态码|耗时ms
[服务间调用] 阶段|服务名称|接口|状态码|耗时ms|详情(JSON格式)
```

> **代码示例（Java / TypeScript）**：详见 [references/service-call-logging.md](references/service-call-logging.md)

### 7.3. 日志级别
| 级别 | 使用场景 |
|------|----------|
| ERROR | 需要立即处理的系统级错误 |
| WARN | 不影响运行但存在潜在问题 |
| INFO | 业务流程中的关键里程碑 |
| DEBUG | 开发和调试信息 |

### 7.4. 日志格式
```text
timestamp [thread-name] level class-name:line-number - message
```

### 7.5. 日志输出规范
- 不使用 `System.out.println`、`print`、`fmt.Println` 等直接输出
- 使用占位符记录日志
- 日志文件必须配置轮转策略
- **必须带业务标识**，格式：`[业务标识] 消息内容`

> **代码示例（业务标识日志、常见业务标识表、占位符使用）**：详见 [references/logging.md](references/logging.md)

### 7.6. 第三方接口调用日志规范（强制）

> **适用场景**：调用外部第三方 HTTP/REST 接口，包括 GET、POST、PUT、DELETE、PATCH 等。

**强制要求**：调用第三方接口时，正常调用必须在 DEBUG 记录调用目标、开始时间、结束时间和耗时。请求方法、请求 URL、请求参数、必要 Header 和返回值如需记录，只能使用统一脱敏、限长后的安全快照。

**请求参数范围**（包括但不限于）：
- URL 路径参数（path variable）
- URL 查询参数（query string / request params）
- 请求体（request body）
- 必要 Header（用于接口联调、请求复现或链路追踪的 Header）

| 调用阶段 | 日志级别 | 必须记录的内容 |
|----------|----------|----------------|
| 发起请求 | DEBUG | 请求方法、请求 URL、开始时间、必要 Header、安全请求快照 |
| 收到响应 | DEBUG | 响应状态码、结束时间、响应耗时、受控安全响应快照、返回值摘要 |
| 调用异常 | WARN | 异常信息、请求方法、请求 URL、请求参数快照、必要 Header、响应内容（如有） |

> **代码示例**：详见 [references/third-party-api-logging.md](references/third-party-api-logging.md)

## 8. 数据库规范

- 使用参数化查询，不拼接字符串
- SQL 关键字大写，每条查询都要使用 LIMIT
- 事务范围尽可能小，避免长事务
- 不全表扫描，索引列限制（≤ 5）

> **代码示例（SQL查询、Git提交格式）**：详见 [references/database-and-git.md](references/database-and-git.md)

> **深化引用**：本条只列代码级红线。以下由 `backend-reliability-guidelines` 管辖，本 skill 不重复：
>
> - 事务边界不含慢外部调用、状态机跳转合法性校验、补偿路径 → `Transactions and consistency`
> - 迁移的锁表评估、大数据量回填、上线并存兼容、软删除策略、data repair 审计 → `Database and migrations`
> - 乐观锁/悲观锁/CAS/版本列/有序 worker 等并发保护 → `Concurrency control`
> - 幂等键设计与去重记录 → `Idempotency`

## 12. 代码复杂度约束

| 类型 | 限制 |
|------|------|
| 普通类/模块 | ≤ 350 行 |
| Controller / Handler | ≤ 100 行 |
| Service / Service 层 | ≤ 300 行 |
| 单文件 | ≤ 350 行 |
| 方法/函数行数 | ≤ 20 行 |
| 方法圈复杂度 | ≤ 10 |

### 12.1. 策略模式替代多重 if 判断

> **强制要求**：当代码中存在多个 `if` 分支使用**相等判断**（如 `if (type == "A")`、`if (status === 1)`）时，必须使用**策略模式**替代。

**核心原则**：
- 相等判断的多分支 if-else 会提高复杂度、降低可维护性
- 策略模式将每个分支逻辑封装为独立策略类，符合单一职责原则
- 新增分支时只需新增策略类，无需修改原有代码，符合开闭原则

> **代码示例（正确/错误示例、适用场景判断表、实现方式表）**：详见 [references/strategy-pattern.md](references/strategy-pattern.md)

## 13. 代码审查清单

> **强制执行**：以下清单均为强制项，AI 审查时必须逐项检查并报告结果；**任何一项不通过，审查结果即为不通过。**
>
> **修改范围确认**：每次代码审查前，必须与用户确认审查范围（全部文件/特定文件/变更部分）。

### 13.1. 注释与文档（强制）

- [✅/❌/不适用] **作者标识**：**新添加**的方法/类的 `@author` 必须按 §2 的解析顺序确定（用户指定 → 默认作者 `lvdaxianer@yeah.net` → 项目既有约定 → git 配置 → 提问确认），禁止写死固定值（老方法/类无需修改）
- [✅/❌/不适用] **方法注释**：所有方法都有完整注释（@param、@return、@author、@date）
- [✅/❌/不适用] **类注释**：所有类都有 Javadoc 风格文档注释
- [✅/❌/不适用] **分支注释**：所有 if-else 分支都有条件说明注释
- [✅/❌/不适用] **注释比例**：注释行数约占总行数的 **60%**，最低不得低于 **40%**（40%–60% 均可接受）

### 13.2. 代码质量（强制）

- [✅/❌/不适用] **方法行数**：每个方法不超过 **20 行**
- [✅/❌/不适用] **方法职责单一**：每个方法只能做一件事；涉及多件事必须拆分
- [✅/❌/不适用] **类行数限制**：每个类不超过 **350 行**，超过必须拆分
- [✅/❌/不适用] **文件行数限制**：单文件不超过 **350 行**，超过必须拆分
- [✅/❌/不适用] **命名规范**：变量和方法使用 camelCase，常量使用 UPPER_SNAKE_CASE
- [✅/❌/不适用] **无硬编码**：无硬编码值（密码、密钥、令牌、魔法数字）
- [✅/❌/不适用] **布尔命名**：布尔变量使用 `is`、`has`、`can`、`should` 前缀
- [✅/❌/不适用] **策略模式**：存在 **4+ 个** if 相等判断分支时，必须使用策略模式替代
- [✅/❌/不适用] **空值处理**：禁止直接返回 `null`，必须使用 `Optional`/`T | undefined`/`T | None` 等空值安全机制
- [✅/❌/不适用] **参数数量**：函数参数 ≤ 3 个直接传参，4-5 个使用配置对象，6+ 个必须重构
- [✅/❌/不适用] **代码重复**：相同代码块 ≥ 3 处必须提取公共方法，相似代码 ≥ 2 处应考虑提取
- [✅/❌/不适用] **魔法数字**：禁止直接使用魔法数字/字符串，必须定义为常量或枚举
- [✅/❌/不适用] **集合容量**：创建集合时指定合理初始容量，避免多次扩容
- [✅/❌/不适用] **字符串拼接**：循环内禁止使用 `+` 拼接，使用 StringBuilder/join 等方法
- [✅/❌/不适用] **equals/hashCode**：重写 equals 必须同时重写 hashCode，保持契约一致
- [✅/❌/不适用] **无未使用导入**：所有 import 必须被使用，无冗余导入
- [✅/❌/不适用] **无未使用变量**：所有局部变量、成员变量必须被使用，无冗余声明

### 13.3. 批量处理（强制）

- [✅/❌/不适用] **禁止 for 循环**：能用批量处理的场景（如 `saveAll()`、`findAllById()`）必须使用批量 API，禁止 for 循环逐条处理
- [✅/❌/不适用] **批量查询**：多次数据库查询必须合并为批量查询
- [✅/❌/不适用] **循环内禁止远程/DB调用**：禁止在 for、map、forEach、filter 等循环内直接调用远程服务或连接数据库

### 13.4. Java 线程池（强制，仅 Java）

- [✅/❌/不适用] **自定义线程池**：禁止使用 `ExecutorService` 默认线程池或 `@Async` 默认线程池，必须使用自定义线程池
- [✅/❌/不适用] **有意义名称**：线程池必须定义有意义的 `threadName`（如 `user-handler-%d`）
- [✅/❌/不适用] **线程日志**：线程池执行时必须打印业务日志，包含开始/成功/失败状态
- [✅/❌/不适用] **线程池隔离**：不同业务必须使用不同线程池，禁止核心业务长期共用同一线程池
- [✅/❌/不适用] **线程持有风险**：线程池任务不得无控制地长时间持有线程，存在 sleep、轮询、阻塞等待、慢外部调用等场景时必须有超时控制、队列容量和拒绝策略，避免线程池打满
- [✅/❌/不适用] **同步 HTTP 调用隔离**：线程中同步调用 HTTP、RPC、SDK 或其他阻塞远程服务时，必须使用与核心请求线程池及其他业务线程池隔离的专用线程池
- [✅/❌/不适用] **远程调用超时边界**：同步阻塞远程调用必须配置连接超时、读取超时和整体调用超时，并使用有界队列和明确拒绝策略

### 13.5. 日志规范（强制）

- [✅/❌/不适用] **业务标识**：所有日志必须带业务标识，格式为 `[业务标识] 消息内容`
- [✅/❌/不适用] **占位符**：日志必须使用占位符 `{}` 或 `%s`，禁止字符串拼接
- [✅/❌/不适用] **禁止直接输出**：禁止使用 `System.out.println`、`print`、`fmt.Println`
- [✅/❌/不适用] **敏感信息**：日志中不记录密码、密钥、令牌等敏感信息
- [✅/❌/不适用] **统一请求入口审计**：Controller/Handler 请求由 Gateway、Filter、Middleware 或 AOP 等统一入口覆盖，INFO 记录请求标识、开始时间、结束时间、总耗时、结果状态和 traceId
- [✅/❌/不适用] **端点日志去重**：统一入口已审计时，Controller/Handler 不重复记录开始、结束和耗时日志

### 13.6. 异常处理（强制）

- [✅/❌/不适用] **特定异常**：捕获特定异常类型，禁止捕获 `Throwable`/`Exception`（全局异常兜底层豁免，见 §6.2）
- [✅/❌/不适用] **异常链**：抛出新异常时必须包含原始异常
- [✅/❌/不适用] **日志记录**：捕获异常后至少记录日志，不允许静默吞掉异常
- [✅/❌/不适用] **全局兜底稳定契约**：全局异常处理器（`@ControllerAdvice`、错误中间件、`recover()`、MQ/任务最外层）必须转成 `backend-reliability-guidelines` 定义的稳定错误契约

### 13.6.1. OAuth2 认证登录日志（强制）

- [✅/❌/不适用] **认证异常 WARN 日志**：OAuth2/JWT 认证流程中，Token 过期、无效、签名失败、权限不足等异常分支必须打印 WARN 日志
- [✅/❌/不适用] **认证退出分支日志**：所有可能导致退出认证的 if 分支都必须有完整 WARN 日志记录
- [✅/❌/不适用] **日志上下文完整**：认证相关日志必须包含足够上下文（tokenId、userId、error、过期时间等）

### 13.6.2. 服务间调用日志（强制）

- [✅/❌/不适用] **请求参数日志**：调用其他服务时，DEBUG 级别记录请求 URL、方法、Header、参数/请求体
- [✅/❌/不适用] **响应日志**：DEBUG 级别记录响应状态码、耗时、响应体
- [✅/❌/不适用] **错误日志**：调用失败时 WARN 级别记录错误信息、异常堆栈、请求上下文
- [✅/❌/不适用] **敏感信息脱敏**：日志中的 Token、Password、CreditCard 等敏感信息必须脱敏

### 13.6.3. 第三方接口调用日志（强制）

- [✅/❌/不适用] **请求信息完整**：调用第三方接口时 DEBUG 级别记录请求方法、请求 URL、请求参数（body、params、path）和必要 Header
- [✅/❌/不适用] **调用耗时**：正常第三方调用使用 DEBUG 记录调用目标、开始时间、结束时间和耗时
- [✅/❌/不适用] **返回值完整**：DEBUG 级别记录响应状态码、响应耗时、受控安全响应快照和返回值摘要
- [✅/❌/不适用] **异常记录**：调用失败时 WARN 级别记录异常信息、请求方法、请求 URL、请求参数快照、必要 Header 及响应内容（如有）

### 13.7. 数据库规范（强制）

- [✅/❌/不适用] **参数化查询**：使用参数化查询，禁止字符串拼接 SQL
- [✅/❌/不适用] **LIMIT**：所有查询必须使用 LIMIT
- [✅/❌/不适用] **事务范围**：事务范围尽可能小，避免长事务

### 13.8. 安全规范（强制）

- [✅/❌/不适用] **输入验证**：所有外部输入必须验证
- [✅/❌/不适用] **SQL 注入**：使用参数化查询防注入
- [✅/❌/不适用] **XSS**：用户输入必须过滤或转义

### 13.9. if-else 分支处理规范（强制）

- [✅/❌/不适用] **else 必要性**：if 语句必须覆盖所有需要处理的分支；else 无实际逻辑且无风险时可省略
- [✅/❌/不适用] **合理值设置**：如果 if 分支是设置值操作，else 必须设置合理值（初期值、默认值、空值、备选值、降级值等）

### 13.10. 未使用导入与变量清理规范（强制）

- [✅/❌/不适用] **无未使用导入**：所有 import 语句必须被使用，不得存在冗余导入
- [✅/❌/不适用] **无未使用变量**：所有局部变量、成员变量必须被使用，不得存在冗余声明

> **代码示例（正确/错误示例）**：详见 [references/unused-imports-variables.md](references/unused-imports-variables.md)

---

### 审查报告格式

进行代码审查时，必须按以下格式输出，每项检查都要给出明确结果：

```text
## 代码审查报告

### 修改范围
[用户确认的审查范围：全部文件/特定文件/变更部分]

### 13.1 注释与文档
- [✅/❌/不适用] 作者标识：新添加的方法/类是否按 §2 解析顺序确定 `@author`（禁止写死；无法确定时须先向用户提问）
- [✅/❌/不适用] 方法注释：具体说明
- [✅/❌/不适用] 类注释：具体说明
- [✅/❌/不适用] 分支注释：具体说明
- [✅/❌/不适用] 注释比例：具体说明（约 60%，最低 40%，40%–60% 均可接受）

### 13.2 代码质量
- [✅/❌/不适用] 方法行数：具体说明
- [✅/❌/不适用] 方法职责单一：具体说明
- [✅/❌/不适用] 类行数限制：具体说明（不超过 350 行）
- [✅/❌/不适用] 文件行数限制：具体说明（不超过 350 行）
- [✅/❌/不适用] 命名规范：具体说明
- [✅/❌/不适用] 无硬编码：具体说明
- [✅/❌/不适用] 布尔命名：具体说明
- [✅/❌/不适用] 策略模式：具体说明（4+ 个 if 相等判断分支是否使用策略模式）
- [✅/❌/不适用] 空值处理：具体说明（是否使用空值安全机制）
- [✅/❌/不适用] 参数数量：具体说明（参数是否超过限制）
- [✅/❌/不适用] 代码重复：具体说明（是否有重复代码未提取）
- [✅/❌/不适用] 魔法数字：具体说明（是否有魔法数字未定义常量）
- [✅/❌/不适用] 集合容量：具体说明（是否指定初始容量）
- [✅/❌/不适用] 字符串拼接：具体说明（循环内是否正确拼接）
- [✅/❌/不适用] equals/hashCode：具体说明（是否同时重写）

### 13.9 if-else 分支处理
- [✅/❌/不适用] else 必要性：具体说明
- [✅/❌/不适用] 合理值设置：具体说明

### 总体评价
[通过/不通过]

### 需要修复的问题
1. ...
2. ...
```

**任何一项检查不通过，审查结果即为不通过。**
