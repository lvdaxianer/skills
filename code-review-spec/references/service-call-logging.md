# 服务间调用日志示例

## 线程池隔离边界

在线程中执行同步 HTTP、RPC、SDK 或其他阻塞远程调用时，调用必须运行在与核心请求线程池及其他业务线程池隔离的专用线程池中。连接超时、读取超时和整体调用超时必须同时配置，并使用有界队列和明确拒绝策略；否则下游阻塞会占满核心线程，导致后续请求排队。

```java
// 正确：同步 HTTP 调用使用独立线程池，并设置有界队列和拒绝策略
private static final int USER_HTTP_CORE_THREADS = 8;
private static final int USER_HTTP_MAX_THREADS = 16;
private static final long USER_HTTP_KEEP_ALIVE_SECONDS = 60L;
private static final int USER_HTTP_QUEUE_CAPACITY = 200;

private final ExecutorService userHttpExecutor = new ThreadPoolExecutor(
    USER_HTTP_CORE_THREADS, USER_HTTP_MAX_THREADS, USER_HTTP_KEEP_ALIVE_SECONDS, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(USER_HTTP_QUEUE_CAPACITY),
    new ThreadFactoryBuilder().setNameFormat("user-http-%d").build(),
    new ThreadPoolExecutor.AbortPolicy()
);

// HTTP 客户端还必须配置连接、读取和整体调用超时。

// 错误：同步 HTTP 调用占用核心请求线程池
coreRequestExecutor.execute(() -> httpClient.send(request, BodyHandlers.ofString()));
```

## Java 示例

```java
// HTTP 服务调用日志示例
public class HttpServiceClient {

    private static final Logger log = LoggerFactory.getLogger(HttpServiceClient.class);

    public UserResponse getUser(Long userId) {
        // 构建请求
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/users/" + userId))
            .header("Authorization", "Bearer " + maskToken(token))
            .header("Content-Type", "application/json")
            .GET()
            .build();

        // 记录请求日志 (DEBUG)
        log.debug("[服务间调用] REQUEST|用户服务|/users/{}|GET|X-Request-Id={}, Authorization=Bearer ***",
            userId, request.headers().firstValue("X-Request-Id").orElse("N/A"));

        long startTime = System.currentTimeMillis();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            long duration = System.currentTimeMillis() - startTime;

            // 记录响应日志 (DEBUG)
            log.debug("[服务间调用] RESPONSE|用户服务|/users/{}|{}|{}ms|X-Request-Id={}",
                userId, response.statusCode(), duration,
                response.headers().firstValue("X-Request-Id").orElse("N/A"));

            // 脱敏处理后记录响应体
            if (log.isTraceEnabled()) {
                log.trace("[服务间调用] RESPONSE_BODY|用户服务|/users/{}|{}",
                    userId, maskSensitiveData(response.body()));
            }

            if (response.statusCode() >= 400) {
                log.warn("[服务间调用] ERROR|用户服务|/users/{}|{}|{}ms|错误: {}",
                    userId, response.statusCode(), duration, response.body());
            }

            return parseResponse(response);
        } catch (HttpServiceException e) {
            long duration = System.currentTimeMillis() - startTime;
            log.warn("[服务间调用] EXCEPTION|用户服务|/users/{}|{}|{}ms|服务调用失败: {}",
                userId, "TIMEOUT", duration, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 脱敏处理 - 隐藏敏感信息
     */
    private String maskToken(String token) {
        if (token == null || token.length() <= 8) {
            return "***";
        }
        return token.substring(0, 4) + "***" + token.substring(token.length() - 4);
    }

    /**
     * 脱敏处理 - 隐藏响应体中的敏感字段
     */
    private String maskSensitiveData(String body) {
        if (body == null) {
            return "null";
        }
        return body
            .replaceAll("\"password\"\\s*:\\s*\"[^\"]*\"", "\"password\":\"***\"")
            .replaceAll("\"token\"\\s*:\\s*\"[^\"]*\"", "\"token\":\"***\"")
            .replaceAll("\"secret\"\\s*:\\s*\"[^\"]*\"", "\"secret\":\"***\"")
            .replaceAll("\"creditCard\"\\s*:\\s*\"[^\"]*\"", "\"creditCard\":\"***\"")
    }
}
```

## TypeScript 示例

```typescript
// TypeScript 服务调用日志示例
export class ApiService {
    private readonly logger: Logger;

    async getUser(userId: number): Promise<UserResponse> {
        const requestId = generateRequestId();
        const headers = {
            'Authorization': `Bearer ${maskToken(this.token)}`,
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
        };

        // 记录请求日志 (DEBUG)
        this.logger.debug(`[服务间调用] REQUEST|用户服务|/users/${userId}|GET|X-Request-Id=${requestId}`);

        const startTime = Date.now();
        try {
            const response = await fetch(`https://api.example.com/users/${userId}`, {
                method: 'GET',
                headers,
            });

            const duration = Date.now() - startTime;
            const responseBody = await response.text();

            // 记录响应日志 (DEBUG)
            this.logger.debug(`[服务间调用] RESPONSE|用户服务|/users/${userId}|${response.status}|${duration}ms`);

            if (this.logger.isTraceEnabled()) {
                this.logger.trace(`[服务间调用] RESPONSE_BODY|用户服务|/users/${userId}|${maskSensitiveData(responseBody)}`);
            }

            if (!response.ok) {
                this.logger.warn(`[服务间调用] ERROR|用户服务|/users/${userId}|${response.status}|${duration}ms|错误: ${responseBody}`);
            }

            return JSON.parse(responseBody);
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.warn(`[服务间调用] EXCEPTION|用户服务|/users/${userId}|ERROR|${duration}ms|服务调用失败: ${error.message}`);
            throw error;
        }
    }
}
```

## 核心原则

- 请求和响应日志必须在 **DEBUG** 级别记录
- 错误响应必须在 **WARN** 级别记录
- 敏感信息（Token、Password、CreditCard 等）必须脱敏后记录
- Header 中的 Authorization 字段必须脱敏或省略
- 日志需包含 X-Request-Id 以便链路追踪
- 响应体记录应使用 TRACE 级别，避免影响生产环境日志量
