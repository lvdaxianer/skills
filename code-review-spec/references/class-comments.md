# 类注释规范示例

> **说明**：示例中的 `{author}` 为占位符，实际值按 [../spec.md](../spec.md) 第 2 节"作者标识"的解析顺序确定（用户指定 → 项目既有约定 → git 配置 → 提问确认），禁止写死固定值。

## Java

```java
/**
 * 类描述，说明核心功能和职责
 *
 * @author {author}
 * @date 创建日期（格式：yyyy-MM-dd）
 */
public class ClassName {

}
```

## Go

```go
// PackageName 类/模块描述，说明核心功能和职责
//
// Author: {author}
// Date: 2024-01-15
package service
```

## TypeScript / Vue

```typescript
/**
 * 类/模块描述，说明核心功能和职责
 *
 * @author {author}
 * @date 2024-01-15
 */
export class UserService {

}

/**
 * Vue 组件描述，说明核心功能和职责
 *
 * @author {author}
 * @date 2024-01-15
 */
export default defineComponent({

});
```

## Python

```python
"""
类/模块描述，说明核心功能和职责

Author: {author}
Date: 2024-01-15
"""
class UserService:

    pass
```

```python
"""
Vue 组件模块描述，说明核心功能和职责

Author: {author}
Date: 2024-01-15
"""
```