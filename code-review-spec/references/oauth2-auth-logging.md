# OAuth2 认证登录异常日志示例

## Java 示例

```java
// OAuth2 认证流程中的 WARN 日志示例
public class OAuth2AuthenticationHandler {

    public AuthenticationResult authenticate(String token) {
        // 场景1: Token 为空
        if (token == null || token.isEmpty()) {
            log.warn("[OAuth2认证] Token为空或缺失, requestIp={}", requestIp);
            return AuthenticationResult.fail("Token不能为空");
        }

        // 场景2: Token 格式错误
        if (!isValidTokenFormat(token)) {
            log.warn("[OAuth2认证] Token格式无效, token={}", maskToken(token));
            return AuthenticationResult.fail("Token格式错误");
        }

        try {
            // 认证逻辑
            Claims claims = jwtParser.parseClaimsJws(token).getBody();
            // ...
        } catch (ExpiredJwtException e) {
            log.warn("[OAuth2认证] Token已过期, expiredAt={}", e.getClaims().getExpiration());
            return AuthenticationResult.fail("Token已过期");
        } catch (JwtException e) {
            log.warn("[OAuth2认证] Token解析失败, error={}", e.getMessage());
            return AuthenticationResult.fail("Token无效");
        }

        // 场景3: 用户被禁用
        if (user.isDisabled()) {
            log.warn("[OAuth2认证] 用户已被禁用, userId={}", user.getId());
            return AuthenticationResult.fail("用户已被禁用");
        }

        // 场景4: 权限不足
        if (!hasRequiredRole(user, requiredRole)) {
            log.warn("[OAuth2认证] 权限不足, userId={}, requiredRole={}", user.getId(), requiredRole);
            return AuthenticationResult.fail("权限不足");
        }

        return AuthenticationResult.success(user);
    }
}
```

## 核心原则

- 认证登录流程中的**任何异常分支**都必须记录 WARN 日志
- 日志需包含足够的上下文信息（tokenId、userId、error、过期时间等）
- 不得在认证流程中静默吞掉异常或只记录 DEBUG 级别
- WARN 日志帮助快速定位认证失败原因，降低安全事件排查成本
