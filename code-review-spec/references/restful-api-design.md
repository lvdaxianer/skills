# RESTful 接口设计规范 — 代码示例

> 对应主规范 `spec.md` §9。核心原则：路径表达资源，HTTP 方法表达动作；资源标识放 path，分页/排序/筛选放 query params，body 仅承载资源数据。

---

## 1. 资源命名与路径

### 错误示例（RPC 风格，动词进 URL）

```text
GET  /getUser?id=1
POST /user/create
POST /user/update
POST /user/delete
GET  /user/list
POST /order/queryById
```

问题：

- URL 中出现动词，HTTP 方法语义被架空（全部用 POST）
- 资源标识 `id` 通过 query 传递，未体现资源定位
- 接口风格不统一，无法通过 URL 推断语义

### 正确示例（RESTful 风格）

```text
GET    /users/{id}            # 查询单个用户
GET    /users                 # 查询用户列表
POST   /users                 # 创建用户
PUT    /users/{id}            # 全量更新用户
PATCH  /users/{id}            # 部分更新用户
DELETE /users/{id}            # 删除用户
GET    /users/{userId}/orders # 查询某用户的订单（层级关系，嵌套不超过两层）
```

---

## 2. 参数位置规范

### 错误示例

```java
// 资源标识放 query
@GetMapping("/users")
public User getUser(@RequestParam Long id) { ... }

// 分页信息放 body
@PostMapping("/users/list")
public Page<User> listUsers(@RequestBody UserPageQuery query) { ... }

// GET 携带 body
@GetMapping("/orders")
public List<Order> listOrders(@RequestBody OrderQuery query) { ... }
```

### 正确示例（Java / Spring Boot）

```java
/**
 * 分页查询用户列表
 *
 * @param pageNum  页码，从 1 开始
 * @param pageSize 每页条数
 * @param keyword  筛选关键字（可选）
 * @return 用户分页结果
 * @author lvdaxianer@yeah.net
 * @date 2026-09-08
 */
@GetMapping("/users")
public Page<User> listUsers(@RequestParam Integer pageNum,
                            @RequestParam Integer pageSize,
                            @RequestParam(required = false) String keyword) {
    // 分页与筛选参数全部来自 query params
    return userService.page(pageNum, pageSize, keyword);
}

/**
 * 查询单个用户
 *
 * @param id 用户标识，位于路径中
 * @return 用户信息
 * @author lvdaxianer@yeah.net
 * @date 2026-09-08
 */
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    // 资源标识通过路径参数传递
    return userService.getById(id);
}

/**
 * 创建用户
 *
 * @param request 用户资源数据，位于请求体
 * @return 创建后的用户
 * @author lvdaxianer@yeah.net
 * @date 2026-09-08
 */
@PostMapping("/users")
public User createUser(@RequestBody @Valid UserCreateRequest request) {
    // body 仅承载资源数据本身
    return userService.create(request);
}
```

### 正确示例（TypeScript / Express）

```typescript
// 资源标识在 path，分页与筛选在 query，资源数据在 body
router.get('/users/:id', (req, res) => {
  const user = userService.getById(req.params.id);
  res.json(user);
});

router.get('/users', (req, res) => {
  const { pageNum, pageSize, keyword } = req.query;
  res.json(userService.page(Number(pageNum), Number(pageSize), keyword));
});

router.post('/users', (req, res) => {
  res.status(201).json(userService.create(req.body));
});

router.delete('/users/:id', (req, res) => {
  userService.delete(req.params.id);
  res.status(204).end();
});
```

---

## 3. 例外场景（必须在接口文档中说明理由）

### 复杂查询条件放 body

当查询条件过多、过长（超出 URL 长度限制，通常约 2000 字符）或包含数组/嵌套结构时，允许使用专用查询端点：

```text
POST /users/search
Body: { "ids": [1, 2, 3], "filters": { "status": ["ACTIVE", "PENDING"] }, "dateRange": { "start": "...", "end": "..." } }
```

注意：这是查询操作，禁止复用 `POST /users`（创建语义）；必须使用明确的子路径（如 `/search`）区分。

### 批量操作

资源标识数量较多（如批量删除几十上百个 id）无法放入 path 时：

```text
POST /users/batch-delete
Body: { "ids": [1, 2, 3, ...] }
```

### 禁止的偏离

```text
GET /users/delete?id=1   # 禁止：GET 做写操作，存在被预取/爬虫/缓存误触发的风险
GET /users/update        # 禁止：同上
```

---

## 4. 审查要点速查

| 检查项 | 通过标准 |
|--------|----------|
| URL 风格 | 名词复数、小写连字符、无动词 |
| 资源标识 | 在 path 中（`@PathVariable` / `:id`），不在 query 或 body |
| 分页/排序/筛选 | 在 query params 中，不混入 body |
| GET/DELETE | 无 body，无副作用（GET） |
| POST/PUT/PATCH | body 仅含资源数据 |
| 例外接口 | 有明确子路径（`/search`、`/batch-delete`），文档说明理由 |
