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
    /** 客户端 ID */
    private static final String CLIENT_ID = "your-client-id";
    /** 回调地址 */
    private static final String REDIRECT_URI = "https://your-app.example.com/callback";
    /** 授权类型 */
    private static final String GRANT_TYPE_AUTH_CODE = "authorization_code";
    /** 请求方法 */
    private static final String REQUEST_METHOD_POST = "POST";
    /** 必要 Header */
    private static final String CONTENT_TYPE_FORM = "application/x-www-form-urlencoded";

    /**
     * 用授权码换取 access_token
     *
     * @param code OAuth2 授权码
     * @return access_token，使用 Optional 包装
     */
    public Optional<String> exchangeCodeForToken(String code) {
        // 记录第三方接口请求方法、请求 URL、请求参数和必要 Header
        log.debug("【OAuth2认证】第三方接口请求, method={}, url={}, header.Content-Type={}, grant_type={}, code={}, client_id={}, redirect_uri={}",
                REQUEST_METHOD_POST, TOKEN_URL, CONTENT_TYPE_FORM, GRANT_TYPE_AUTH_CODE, code, CLIENT_ID, REDIRECT_URI);

        long startTime = System.currentTimeMillis();
        String response = sendTokenRequest(code);
        long duration = System.currentTimeMillis() - startTime;

        // 记录响应状态、响应体和返回值
        if (response == null || response.isEmpty()) {
            // 响应为空
            log.warn("【OAuth2认证】第三方接口返回值为空, method={}, url={}, durationMs={}, requestCode={}",
                    REQUEST_METHOD_POST, TOKEN_URL, duration, code);
            return Optional.empty();
        }

        log.debug("【OAuth2认证】第三方接口响应成功, method={}, url={}, status={}, durationMs={}, responseBody={}, 返回值={}",
                REQUEST_METHOD_POST, TOKEN_URL, 200, duration, response, response);
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
DEBUG 【OAuth2认证】第三方接口请求, method=POST, url=https://third-party.example.com/oauth2/token, header.Content-Type=application/x-www-form-urlencoded, grant_type=authorization_code, code=abc123, client_id=your-client-id, redirect_uri=https://your-app.example.com/callback
DEBUG 【OAuth2认证】第三方接口响应成功, method=POST, url=https://third-party.example.com/oauth2/token, status=200, durationMs=125, responseBody={"access_token":"token_value","expires_in":3600}, 返回值={"access_token":"token_value","expires_in":3600}
WARN  【OAuth2认证】第三方接口返回值为空, method=POST, url=https://third-party.example.com/oauth2/token, durationMs=125, requestCode=abc123
```

## 核心原则

- 任何第三方接口调用都必须保留"请求方法 + 请求 URL + 请求参数 + 必要 Header + 返回值"的完整日志
- 返回日志必须包含响应状态码、响应耗时、响应体和返回值
- 本规则不新增脱敏要求；若项目安全规范禁止记录某类敏感字段，应按安全规范处理
- 便于问题排查、接口联调和责任界定
