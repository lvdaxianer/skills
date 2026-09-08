# <业务模块> REST API 接口文档模板

本模板对应目标项目根目录下的单个模块文档：`apis/<module>.md`。一个文件覆盖一个
业务模块，模块内的多个对外 Controller/路由以独立端点章节连续编写；不得复制为
一个接口一个文件。

删除不适用的说明并明确写“不适用”。所有内容必须以路由、实现、Schema/DTO、测试、配置或用户资料为依据。无法确认的内容写“待确认”，不要猜测。

## 1. 模块概览与覆盖范围

| 项目 | 内容 |
| --- | --- |
| 业务模块 | 例如：订单（`orders`） |
| 文档路径 | `apis/orders.md` |
| 模块职责 | 模块解决的业务问题与调用方 |
| 基础 URL / 版本 | 例如：`https://api.example.com/v1` |
| 通用认证与约定 | 认证方式、时间格式、响应包裹、分页等；端点差异在对应章节说明 |

### 1.1 对外 Controller/route 覆盖表

| Controller / 路由归属 | 对外端点 | 文档章节 | 覆盖状态 |
| --- | --- | --- | --- |
| `OrderController` | `POST /v1/orders` | [创建订单](#21-创建订单) | 已覆盖 |
| `OrderQueryController` | `GET /v1/orders/{orderId}` | [查询订单](#31-查询订单) | 已覆盖 |

每个对外 Controller 必须至少有一行。一个 Controller 包含多个路由时逐一列出，或在
同一单元格中列出完整路由集合并指向所有对应章节。未覆盖 Controller/route 不得交付。

## 2. 创建订单

以下“接口章节”是模块内一个端点的完整模板。为同一业务模块下的每个端点复制从
“接口概览”到“通用约定检查”之间的内容，并连续编号，例如“3. 查询订单”。

### 2.1 接口概览

| 项目 | 内容 |
| --- | --- |
| 接口名称 | 用户可读的接口名称 |
| 接口用途 | 这个接口解决什么业务问题，何时调用 |
| 业务场景 | 调用方、触发时机、前置条件和数据影响 |
| 权限要求 | 认证方式、所需角色/权限、租户或资源归属限制 |
| 幂等性 | 是否幂等；重复请求如何处理；幂等键名称和有效期 |
| 版本 | API 版本或兼容性要求 |

本示例接口用途：已认证客户提交商品明细创建订单，服务校验商品和数量后返回订单 ID 与初始状态。调用方应在用户确认购买后调用，并使用 `Idempotency-Key` 防止网络重试造成重复订单。

### 2.2 请求定义

#### 2.2.1 Method and URL

```http
POST https://api.example.com/v1/orders
```

| 项目 | 内容 |
| --- | --- |
| Method | `GET` / `POST` / `PUT` / `PATCH` / `DELETE` |
| URL | 完整 URL；说明 base URL、版本和路径占位符 |
| Content-Type | 请求媒体类型；无请求体时写“不适用” |
| Accept | 客户端期望的响应媒体类型 |

#### 2.2.2 param

分别列出参数位置，不要把路径参数、查询参数和请求体字段混在一张表里。

##### Path parameters

| 参数名 | 类型 | 必填 | 格式/范围 | 示例 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `{resourceId}` | string | 是 | UUID | `ord_01HXYZ` | 资源唯一标识 |

##### Query parameters

| 参数名 | 类型 | 必填 | 默认值 | 格式/范围/枚举 | 示例 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `includeItems` | boolean | 否 | `false` | `true` / `false` | `true` | 是否返回明细 |

##### Form or other parameters

记录 `application/x-www-form-urlencoded`、`multipart/form-data` 或其他不属于 JSON `requestBody` 的参数；无则写“不适用”。上传文件时说明字段名、媒体类型、大小限制和文件名规则。

| 参数名 | 位置 | 类型 | 必填 | 约束 | 示例 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `file` | form-data | binary | 是 | PDF，最大 10 MB | `invoice.pdf` | 上传文件 |

#### 2.2.3 Request headers

| Header | 必填 | 类型/格式 | 示例 | 用途 | 缺失或非法时 |
| --- | --- | --- | --- | --- | --- |
| `Authorization` | 是 | `Bearer <token>` | `Bearer <ACCESS_TOKEN>` | 身份认证 | 返回 `401` |
| `Content-Type` | 是 | MIME type | `application/json` | 请求体编码 | 返回 `415` 或按实现处理 |
| `Idempotency-Key` | 按实现 | string | `idem_01HXYZ` | 防止重试造成重复写入 | 说明是否拒绝或降级 |

#### 2.2.4 Request cookies

| Cookie | 必填 | 示例 | 用途 | 作用域/有效期 | 缺失或非法时 |
| --- | --- | --- | --- | --- | --- |
| `session_id` | 否 | `SESSION_PLACEHOLDER` | 浏览器会话识别 | 按实现填写 | 未登录时返回 `401` 或“不适用” |

没有 Cookie 时明确写“请求 Cookie：不适用”。不要把 Cookie 当作普通 header 或 query 参数描述。

#### 2.2.5 requestBody

说明请求体媒体类型、编码、是否必填、顶层类型和完整结构。

```json
{
  "customerId": "cus_01HXYZ",
  "items": [
    {
      "sku": "SKU-1001",
      "quantity": 2
    }
  ],
  "remark": "Deliver after 18:00"
}
```

| 字段路径 | 类型 | 必填 | 默认值 | 格式/范围/枚举 | 示例 | 业务说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `customerId` | string | 是 | 无 | `cus_` 前缀 | `cus_01HXYZ` | 下单客户 |
| `items` | array<object> | 是 | 无 | 至少 1 项 | `[...]` | 订单商品 |
| `items[].sku` | string | 是 | 无 | 已上架 SKU | `SKU-1001` | 商品编号 |
| `items[].quantity` | integer | 是 | 无 | `1`-`99` | `2` | 购买数量 |
| `remark` | string/null | 否 | `null` | 最长 200 字符 | `Deliver after 18:00` | 备注 |

补充嵌套对象、数组元素、可空性、字段间条件约束、未知字段处理和校验失败行为。`requestBody` 不适用时写“请求体：不适用”。

### 2.3 响应定义

#### 2.3.1 Response overview

| HTTP 状态码 | 业务含义 | 触发条件 | 调用方处理 |
| --- | --- | --- | --- |
| `201 Created` | 创建成功 | 请求通过校验并创建资源 | 保存返回的资源 ID |
| `400 Bad Request` | 参数错误 | 字段缺失或格式非法 | 修正请求后重试 |
| `401 Unauthorized` | 未认证 | token/session 缺失或失效 | 重新认证 |
| `403 Forbidden` | 无权限 | 身份有效但无资源权限 | 不要重试相同请求 |
| `409 Conflict` | 资源冲突 | 幂等键或业务状态冲突 | 按错误码处理 |
| `500 Internal Server Error` | 服务端错误 | 服务内部异常 | 按重试策略处理并带 trace ID 报障 |

只列出实际支持或已确认的状态码；未确认的状态码标记“待确认”。

#### 2.3.2 Response headers

| Header | 出现条件 | 示例 | 用途 |
| --- | --- | --- | --- |
| `Content-Type` | 所有有响应体的响应 | `application/json` | 响应媒体类型 |
| `Location` | `201 Created` | `/v1/orders/ord_01HXYZ` | 新资源地址 |

#### 2.3.3 Response cookies

| Cookie | 出现条件 | 示例 | 属性 | 用途 |
| --- | --- | --- | --- | --- |
| `session_id` | 登录或会话更新时 | `SESSION_PLACEHOLDER` | `HttpOnly; Secure` | 更新会话 |

没有响应 Cookie 时写“响应 Cookie：不适用”。

#### 2.3.4 Success response

```json
{
  "code": "OK",
  "message": "created",
  "data": {
    "orderId": "ord_01HXYZ",
    "status": "PENDING",
    "createdAt": "2026-09-08T10:00:00Z"
  },
  "traceId": "trace_example_001"
}
```

| 字段路径 | 类型 | 必有/可选 | nullable | 示例 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `code` | string | 必有 | 否 | `OK` | 业务结果码 |
| `message` | string | 必有 | 否 | `created` | 面向调用方的消息 |
| `data.orderId` | string | 必有 | 否 | `ord_01HXYZ` | 新订单 ID |
| `data.status` | string | 必有 | 否 | `PENDING` | 订单状态 |
| `data.createdAt` | string | 必有 | 否 | ISO 8601 | 创建时间 |
| `traceId` | string | 按实现 | 否 | `trace_example_001` | 排障关联 ID |

说明响应体为空、列表、分页对象或文件流时的具体形态。分页接口还要说明 `page`/`size` 或 cursor 的含义、边界、排序稳定性和总数是否准确。

#### 2.3.5 Error response

```json
{
  "code": "ORDER_ITEM_INVALID",
  "message": "quantity must be greater than zero",
  "details": [
    {
      "field": "items[0].quantity",
      "reason": "must be at least 1"
    }
  ],
  "traceId": "trace_example_002"
}
```

| 字段路径 | 类型 | 必有/可选 | 示例 | 说明 |
| --- | --- | --- | --- | --- |
| `code` | string | 必有 | `ORDER_ITEM_INVALID` | 稳定业务错误码 |
| `message` | string | 必有 | `quantity must be greater than zero` | 安全且可读的错误消息 |
| `details[].field` | string | 按实现 | `items[0].quantity` | 出错字段路径 |
| `details[].reason` | string | 按实现 | `must be at least 1` | 校验或业务原因 |
| `traceId` | string | 按实现 | `trace_example_002` | 排障关联 ID |

### 2.4 Complete example

#### 2.4.1 curl request

```bash
curl --request POST 'https://api.example.com/v1/orders?includeItems=true' \
  --header 'Authorization: Bearer <ACCESS_TOKEN>' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --header 'Idempotency-Key: idem_01HXYZ' \
  --cookie 'session_id=SESSION_PLACEHOLDER' \
  --data '{
    "customerId": "cus_01HXYZ",
    "items": [{"sku": "SKU-1001", "quantity": 2}],
    "remark": "Deliver after 18:00"
  }'
```

#### 2.4.2 Raw HTTP request

```http
POST /v1/orders?includeItems=true HTTP/1.1
Host: api.example.com
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json
Idempotency-Key: idem_01HXYZ
Cookie: session_id=SESSION_PLACEHOLDER

{"customerId":"cus_01HXYZ","items":[{"sku":"SKU-1001","quantity":2}],"remark":"Deliver after 18:00"}
```

#### 2.4.3 Success response

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/orders/ord_01HXYZ

{"code":"OK","message":"created","data":{"orderId":"ord_01HXYZ","status":"PENDING","createdAt":"2026-09-08T10:00:00Z"},"traceId":"trace_example_001"}
```

响应 Cookie：不适用（该创建订单接口不会更新浏览器会话）。

#### 2.4.4 Typical failure response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"code":"ORDER_ITEM_INVALID","message":"quantity must be greater than zero","details":[{"field":"items[0].quantity","reason":"must be at least 1"}],"traceId":"trace_example_002"}
```

### 2.5 Common conventions checklist

- 认证：说明 token/session 的来源、传递位置、过期、刷新和 `401`/`403` 区别。
- 幂等：说明哪些写操作必须携带幂等键、重复请求返回什么、键的作用域和有效期。
- 分页/排序/过滤：说明参数、默认值、上限、排序稳定性、cursor 失效和空结果。
- 时间：说明时区、格式、精度和输入/输出是否统一使用 UTC。
- 错误：错误码要稳定；不要把堆栈、SQL、内部路径、token 或敏感数据返回给调用方。
- 安全：示例只使用占位凭据；文档不要复制真实 Cookie、手机号、邮箱、身份证号或生产 URL。
