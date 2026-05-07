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
 * @author lvdaxianerplus
 * @date 2024-01-15
 */
@Slf4j
@Component
public class ThirdPartyTokenClient {

    /** 授权码换取 Token 的接口地址 */
    private static final String TOKEN_URL = "https://third-party.example.com/oauth2/token";
    /** 客户端 ID */
    private static final String CLIENT_ID = "your-client-id";
    /** 客户端密钥 */
    private static final String CLIENT_SECRET = "your-client-secret";
    /** 回调地址 */
    private static final String REDIRECT_URI = "https://your-app.example.com/callback";
    /** 授权类型 */
    private static final String GRANT_TYPE_AUTH_CODE = "authorization_code";

    /**
     * 用授权码换取 access_token
     *
     * @param code OAuth2 授权码
     * @return access_token，使用 Optional 包装
     */
    public Optional<String> exchangeCodeForToken(String code) {
        // 记录请求接口地址
        log.info("【OAuth2认证】请求 token 接口: {}", TOKEN_URL);

        // 记录完整请求参数
        log.info("【OAuth2认证】请求参数: grant_type={}, code={}, client_id={}, client_secret={}, redirect_uri={}",
                GRANT_TYPE_AUTH_CODE, code, CLIENT_ID, maskSecret(CLIENT_SECRET), REDIRECT_URI);

        String response = sendTokenRequest(code);

        // 记录响应值
        if (response == null || response.isEmpty()) {
            // 响应为空
            log.error("【OAuth2认证】token 接口响应为空，请求参数: code={}", code);
            return Optional.empty();
        }

        log.info("【OAuth2认证】token 接口响应成功，响应内容={}", response);
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

    /**
     * 敏感信息脱敏
     *
     * @param secret 原始密钥
     * @return 脱敏后的密钥
     */
    private String maskSecret(String secret) {
        if (secret == null || secret.length() <= 6) {
            return "***";
        }
        return secret.substring(0, 3) + "***" + secret.substring(secret.length() - 3);
    }
}
```

## 日志输出示例

```
INFO  【OAuth2认证】请求 token 接口: https://third-party.example.com/oauth2/token
INFO  【OAuth2认证】请求参数: grant_type=authorization_code, code=abc123, client_id=your-client-id, client_secret=you***ret, redirect_uri=https://your-app.example.com/callback
INFO  【OAuth2认证】token 接口响应成功，响应内容={"access_token":"token_value","expires_in":3600}
ERROR 【OAuth2认证】token 接口响应为空，请求参数: code=abc123
```

## 核心原则

- 任何第三方接口调用都必须保留"请求参数 + 响应值"的完整日志
- 便于问题排查、接口联调和责任界定
- 敏感信息（Token、Password 等）必须脱敏后记录
