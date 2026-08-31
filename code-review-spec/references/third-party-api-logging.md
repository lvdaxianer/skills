# 第三方接口调用日志示例

## 完整文件示例

`ThirdPartyTokenClient.java`

```java
package com.example.oauth2.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 第三方 OAuth2 Token 客户端
 * <p>
 * 负责与第三方认证服务交互，获取 access_token。
 *
 * @author lvdaxianer@yeah.net
 * @date 2024-01-15
 */
@Slf4j
@Component
public class ThirdPartyTokenClient {

    /** 授权码换取 Token 的接口地址 */
    private static final String TOKEN_URL = "https://third-party.example.com/oauth2/token";
    /** 请求方法 */
    private static final String REQUEST_METHOD_POST = "POST";

    /**
     * 用授权码换取 access_token
     *
     * @param code OAuth2 授权码
     * @return access_token，使用 Optional 包装
     */
    public Optional<String> exchangeCodeForToken(String code) {
        long startTime = System.currentTimeMillis();
        // 正常第三方调用在 DEBUG 记录安全目标和开始时间。
        log.debug("【OAuth2认证】第三方接口开始, method={}, url={}, startTime={}", REQUEST_METHOD_POST, TOKEN_URL, startTime);
        String response = sendTokenRequest(code);
        long endTime = System.currentTimeMillis();
        long durationMs = endTime - startTime;
        // 根据响应结果记录安全摘要和耗时。
        if (response == null || response.isEmpty()) {
            // 响应为空
            log.warn("【OAuth2认证】第三方接口返回值为空, method={}, url={}, startTime={}, endTime={}, durationMs={}", REQUEST_METHOD_POST, TOKEN_URL, startTime, endTime, durationMs);
            return Optional.empty();
        }
        log.debug("【OAuth2认证】第三方接口响应成功, method={}, url={}, status={}, startTime={}, endTime={}, durationMs={}", REQUEST_METHOD_POST, TOKEN_URL, 200, startTime, endTime, durationMs);
        return parseTokenResponse(response);
    }

    /**
     * 发送 Token 请求
     *
     * @param code 授权码
     * @return 响应字符串
     */
    private String sendTokenRequest(String code) {
        // 实际 HTTP 调用逻辑
        return "";
    }

    /**
     * 解析 Token 响应
     *
     * @param response 响应字符串
     * @return access_token
     */
    private Optional<String> parseTokenResponse(String response) {
        // 解析逻辑
        return Optional.ofNullable(response);
    }

}
```

## 日志输出示例

```
DEBUG 【OAuth2认证】第三方接口开始, method=POST, url=https://third-party.example.com/oauth2/token, startTime=1723795200000
DEBUG 【OAuth2认证】第三方接口响应成功, method=POST, url=https://third-party.example.com/oauth2/token, status=200, startTime=1723795200000, endTime=1723795200125, durationMs=125
WARN  【OAuth2认证】第三方接口返回值为空, method=POST, url=https://third-party.example.com/oauth2/token, startTime=1723795200000, endTime=1723795200125, durationMs=125
```

## 核心原则

- 正常第三方调用必须在 DEBUG 记录调用目标、开始时间、结束时间和耗时
- 慢调用、失败或超时必须在 WARN 记录安全上下文和可用耗时
- 请求、响应和返回值如需记录，只允许记录统一脱敏、限长后的安全快照
- 不得记录授权码、Token、Cookie、密码、API Key 或原始未受控请求/响应体
- 便于问题排查、接口联调和责任界定
