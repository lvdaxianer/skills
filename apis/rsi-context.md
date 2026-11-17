# RSI 上下文控制 API

## 1. 模块概览与覆盖范围

| 项目 | 内容 |
| --- | --- |
| 业务模块 | RSI 上下文快照与反馈（`rsi-context`） |
| 文档路径 | `apis/rsi-context.md` |
| 模块职责 | 为本地产品交付控制平面准备、恢复和反馈 RSI 快照 |
| 基础 URL / 版本 | `http://127.0.0.1:<port>`；当前无 URL 版本前缀 |
| 通用认证与约定 | 仅回环地址访问；认证、Cookie、限流和跨租户访问不适用；请求和响应使用 `application/json; charset=utf-8` |

### 1.1 对外 Controller/route 覆盖表

| Controller / 路由归属 | 对外端点 | 文档章节 | 覆盖状态 |
| --- | --- | --- | --- |
| `rsi-api.mjs` | `POST /api/rsi/snapshots` | [准备快照](#21-准备快照) | 已覆盖 |
| `rsi-api.mjs` | `GET /api/rsi/snapshots/{snapshotId}` | [恢复快照](#31-恢复快照) | 已覆盖 |
| `rsi-api.mjs` | `POST /api/rsi/snapshots/{snapshotId}/inject/{provider}` | [执行 Provider 注入](#41-执行-provider-注入) | 已覆盖 |
| `rsi-api.mjs` | `POST /api/rsi/feedback` | [写入反馈](#51-写入反馈) | 已覆盖 |
| `rsi-api.mjs` | `POST /api/rsi/feedback` | [写入反馈](#51-写入反馈) | 已覆盖 |

## 2. 准备快照

### 2.1 接口概览

| 项目 | 内容 |
| --- | --- |
| 接口名称 | 准备 RSI 上下文快照 |
| 接口用途 | 从全局、项目和当前任务事实生成统一快照并原子落盘 |
| 业务场景 | 会话或任务开始时由 `prodflow` 调用 |
| 权限要求 | 仅本机控制平面调用；外部网络访问不适用 |
| 幂等性 | 不保证重复请求复用同一 `snapshotId`；调用方应保存返回的 ID，重试时使用恢复接口或重新准备 |
| 版本 | `schemaVersion=1` |

### 2.2 请求定义

#### 2.2.1 Method and URL

```http
POST http://127.0.0.1:<port>/api/rsi/snapshots
```

| 项目 | 内容 |
| --- | --- |
| Method | `POST` |
| URL | 本地控制平面 `/api/rsi/snapshots` |
| Content-Type | `application/json`；最大请求体 128 KiB |
| Accept | `application/json` |

#### 2.2.2 param

Path parameters：不适用。Query parameters：不适用。Form parameters：不适用。

#### 2.2.3 Request headers

| Header | 必填 | 类型/格式 | 示例 | 用途 | 缺失或非法时 |
| --- | --- | --- | --- | --- | --- |
| `Content-Type` | 是 | MIME type | `application/json` | 请求体编码 | 返回 `400 RSI_REQUEST_INVALID` |
| `Accept` | 否 | MIME type | `application/json` | 响应媒体类型 | 默认返回 JSON |
| `Authorization` | 不适用 | - | - | 服务只监听回环地址 | 不适用 |

#### 2.2.4 Request cookies

请求 Cookie：不适用。

#### 2.2.5 requestBody

```json
{
  "projectId": "demo-project",
  "runId": "RUN-003",
  "provider": "claude",
  "task": "验证浏览器截图",
  "currentFacts": [],
  "maxItems": 20,
  "maxBytes": 32768,
  "sourceHash": "可选的上一次来源哈希"
}
```

| 字段路径 | 类型 | 必填 | 默认值 | 格式/范围/枚举 | 示例 | 业务说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `projectId` | string | 否 | `current-project` | 1-128 字符 | `demo-project` | 当前项目标识 |
| `runId` | string/null | 否 | `null` | 1-128 字符 | `RUN-003` | 运行关联标识 |
| `provider` | string | 否 | `generic` | Provider 标识 | `claude` | 记录注入目标，不改变事实源 |
| `task` | string | 否 | 空字符串 | 最多 4000 字符 | `验证浏览器截图` | 当前任务事实 |
| `currentFacts` | array<object> | 否 | `[]` | 最多读取 100 条 | `[]` | 当前运行证据或要求 |
| `currentFacts[].factId` | string | 否 | 自动生成 | 项目内标识 | `CURRENT-001` | 当前事实 ID |
| `currentFacts[].title` | string | 否 | `当前任务事实` | 最多 200 字符 | `验收要求` | 当前事实标题 |
| `currentFacts[].content` | string | 否 | - | 最多 2000 字符 | `必须保存截图` | 当前事实内容 |
| `currentFacts[].evidenceRefs` | array<string> | 否 | `[]` | 每条最多 512 字符，最多 20 条 | `[...]` | 证据引用 |
| `maxItems` | integer | 否 | `20` | `1`-`500` | `20` | 总条目上限 |
| `maxBytes` | integer | 否 | `32768` | `256`-`1048576` | `32768` | Markdown 上下文字节预算 |
| `sourceHash` | string | 否 | 无 | 上次快照来源哈希 | `stale-source-hash` | 不一致时返回 `409` 并携带新快照 |

### 2.3 响应定义

#### 2.3.1 Response overview

| HTTP 状态码 | 业务含义 | 触发条件 | 调用方处理 |
| --- | --- | --- | --- |
| `201 Created` | 快照准备成功 | 已读取事实并完成原子落盘 | 保存 `snapshotId` 和 manifest |
| `400 Bad Request` | 参数非法 | 预算、标识或 JSON 无效 | 修正请求后重试 |
| `409 Conflict` | 来源冲突 | `sourceHash` 与当前事实不一致 | 使用响应中的新快照引用 |
| `500 Internal Server Error` | 控制平面内部错误 | 未预期文件或依赖异常 | 保留错误并按运行策略重试 |

#### 2.3.2 Response headers

| Header | 出现条件 | 示例 | 用途 |
| --- | --- | --- | --- |
| `content-type` | 所有响应 | `application/json; charset=utf-8` | JSON 响应媒体类型 |

响应 Cookie：不适用。

#### 2.3.3 Success response

```json
{
  "schemaVersion": 1,
  "snapshotId": "RSI-SNAPSHOT-<UUID>",
  "projectId": "demo-project",
  "runId": "RUN-003",
  "provider": "claude",
  "layers": [{"name": "global", "items": []}, {"name": "project", "items": []}, {"name": "current", "items": []}],
  "budget": {"maxItems": 20, "maxBytes": 32768, "selectedItems": 0, "requestedItems": 0, "omittedItems": 0, "truncated": false},
  "sourceHash": "<SHA256>",
  "contentHash": "<SHA256>",
  "manifest": {"schemaVersion": 1, "snapshotId": "RSI-SNAPSHOT-<UUID>", "sources": []},
  "paths": {"json": "/absolute/project/.product/rsi/snapshots/<id>.json", "markdown": "/absolute/project/.product/rsi/snapshots/<id>.md"}
}
```

| 字段路径 | 类型 | 必有/可选 | 示例 | 说明 |
| --- | --- | --- | --- | --- |
| `snapshotId` | string | 必有 | `RSI-SNAPSHOT-<UUID>` | 恢复和反馈关联 ID |
| `layers[]` | array<object> | 必有 | `global/project/current` | 固定三层顺序 |
| `layers[].items[]` | array<object> | 必有 | `PROJECT-001` | 已验证且未排除条目 |
| `budget` | object | 必有 | `truncated=false` | 预算和省略摘要 |
| `sourceHash` | string | 必有 | `<SHA256>` | 来源内容哈希 |
| `contentHash` | string | 必有 | `<SHA256>` | 快照内容哈希 |
| `manifest` | object | 必有 | `sources=[]` | Provider 无关来源清单 |
| `paths` | object | 必有 | `json/markdown` | 本地落盘路径 |

### 2.4 Complete example

```bash
curl --request POST 'http://127.0.0.1:<port>/api/rsi/snapshots' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data '{"projectId":"demo-project","runId":"RUN-003","provider":"claude","task":"验证浏览器截图"}'
```

### 2.5 Common conventions checklist

- 认证：不适用；服务必须保持回环监听。
- 幂等：本接口不复用新快照；重复准备产生新 `snapshotId`，恢复使用 GET 接口。
- 分页/排序/过滤：不适用；条目通过 `maxItems` 和相关性排序受限。
- 时间：manifest 使用 UTC ISO 8601；示例省略具体时间字段。
- 错误：调用方必须区分 `RSI_SOURCE_CONFLICT` 与输入错误。

## 3. 恢复快照

### 3.1 接口概览

| 项目 | 内容 |
| --- | --- |
| 接口名称 | 按 ID 恢复 RSI 快照 |
| 接口用途 | 在 Worker、开发、测试或重试阶段读取已落盘快照 |
| 业务场景 | 调用方已有 `snapshotId` 时避免重复生成 |
| 权限要求 | 仅本机控制平面调用 |
| 幂等性 | 幂等只读 |
| 版本 | `schemaVersion=1` |

### 3.2 请求定义

```http
GET http://127.0.0.1:<port>/api/rsi/snapshots/{snapshotId}
```

Path parameters：`snapshotId` 必填，必须是 `RSI-SNAPSHOT-...`；Query、Form、requestBody、Cookie：不适用。Request Header：`Accept` 可选；`Authorization` 不适用。

### 3.3 响应定义

| HTTP 状态码 | 业务含义 | 调用方处理 |
| --- | --- | --- |
| `200 OK` | 恢复成功 | 使用响应中的同一 `snapshotId` |
| `400 Bad Request` | ID 非法 | 停止并修正引用 |
| `404 Not Found` | 快照不存在 | 重新准备快照或检查项目目录 |
| `500 Internal Server Error` | 文件无法读取 | 保留错误并人工排查 |

成功响应体与“准备快照”的快照对象相同。错误响应体如下：

```json
{"errorCode":"RSI_SNAPSHOT_NOT_FOUND","message":"RSI 快照不存在"}
```

### 3.4 Complete example

```bash
curl --request GET 'http://127.0.0.1:<port>/api/rsi/snapshots/RSI-SNAPSHOT-<UUID>' \
  --header 'Accept: application/json'
```

## 4. 执行 Provider 注入

### 4.1 接口概览

| 项目 | 内容 |
| --- | --- |
| 接口名称 | 将已落盘 RSI 快照注入指定 Provider |
| 接口用途 | 通过文件、Prompt 或 MCP 方式提供真实可验证的运行时入口 |
| 业务场景 | 快照生成后、Worker/开发/测试启动前 |
| 权限要求 | 仅本机控制平面调用 |
| 幂等性 | 文件方式覆盖同一 Provider 的 current 文件；每次尝试都追加注入审计 |

### 4.2 请求定义

```http
POST http://127.0.0.1:<port>/api/rsi/snapshots/{snapshotId}/inject/{provider}
```

```json
{
  "mode": "file",
  "maxPromptBytes": 16384
}
```

`mode` 可取 `file`、`prompt`、`mcp`。缺省为 `file`；未知方式不会伪装成功，而是返回 `status=fallback` 并明确选择 `prompt`。文件方式只写 `.product/rsi/providers/<provider>/current.md` 和 manifest，不覆盖 `CLAUDE.md`、`AGENTS.md`。

### 4.3 成功响应

文件或 Prompt 示例：
```json
{
  "status": "injected",
  "injectionMethod": "file",
  "provider": "claude",
  "snapshotId": "RSI-SNAPSHOT-<UUID>",
  "paths": {"markdown": "/absolute/project/.product/rsi/providers/claude/current.md"},
  "manifest": {"schemaVersion": 1, "provider": "claude", "snapshotId": "RSI-SNAPSHOT-<UUID>"}
}
```

MCP 示例返回 `status=available`、`injectionMethod=mcp` 和 `{ "mcp": { "command": "node", "args": [...] } }`。这表示已生成可执行配置，不表示已经替第三方客户端自动注册。

每次尝试追加到项目 `.product/rsi/audit.jsonl`，记录 `projectId`、`runId`、`provider`、`snapshotId`、`injectionMethod`、`status`、时间和错误码（如有）。

### 4.4 Complete example

```bash
curl --request POST 'http://127.0.0.1:<port>/api/rsi/snapshots/RSI-SNAPSHOT-<UUID>/inject/claude' \
  --header 'Content-Type: application/json' \
  --data '{"mode":"file"}'
```

独立 MCP 进程也可以直接启动：

```bash
npm run mcp --prefix prodflow/references/control-plane -- \
  --projectRoot /absolute/path/to/project \
  --sharedKnowledgeRoot /absolute/path/to/shared-knowledge
```

stdout 只输出 JSON-RPC 响应；启动错误写 stderr 并以非零状态退出。

## 5. 写入反馈

### 5.1 接口概览

| 项目 | 内容 |
| --- | --- |
| 接口名称 | 写入 RSI 运行反馈 |
| 接口用途 | 把失败、near miss、修复前成功或人工反馈追加到项目事实源 |
| 业务场景 | 验收、测试、重试、人工修订或运行结束时调用 |
| 权限要求 | 仅本机控制平面调用；反馈默认进入项目范围并等待治理 |
| 幂等性 | `eventId` 是幂等键；相同内容重复返回 `200`，不同内容返回 `409` |
| 版本 | 项目知识事实协议 |

### 5.2 请求定义

```http
POST http://127.0.0.1:<port>/api/rsi/feedback
```

Path、Query、Form parameters：不适用。Request Header 与 Cookie 约定同“准备快照”。

```json
{
  "eventId": "RSI-FEEDBACK-001",
  "snapshotId": "RSI-SNAPSHOT-<UUID>",
  "provider": "claude",
  "feedbackType": "failure",
  "runId": "RUN-004",
  "featureId": "FEATURE-001",
  "title": "浏览器截图缺失",
  "description": "验收时没有保存截图",
  "phase": "verification",
  "evidenceRefs": ["run://RUN-004/verification"]
}
```

| 字段 | 类型 | 必填 | 格式/范围/枚举 | 说明 |
| --- | --- | --- | --- | --- |
| `eventId` | string | 是 | 1-256 字符，幂等键 | 项目事件 ID |
| `snapshotId` | string | 是 | 已存在 RSI 快照 | 绑定上下文版本 |
| `provider` | string | 是 | 1-256 字符 | 反馈来源工具 |
| `feedbackType` | string | 是 | `failure`、`near_miss`、`success_before_fix`、`human_feedback` | 反馈分类 |
| `runId` | string | 是 | 1-256 字符 | 运行 ID |
| `featureId` | string | 是 | 1-256 字符 | 功能或任务 ID |
| `title` | string | 是 | 1-256 字符 | 问题标题 |
| `description` | string | 是 | 1-256 字符 | 反馈描述 |
| `phase` | string | 是 | 1-256 字符 | 发生阶段 |
| `evidenceRefs` | array<string> | 是 | 可为空数组 | 证据引用 |

### 5.3 响应定义

| HTTP 状态码 | 业务含义 | 调用方处理 |
| --- | --- | --- |
| `201 Created` | 首次写入成功 | 保存返回的项目事件 |
| `200 OK` | 幂等重复 | 不重复创建事件 |
| `400 Bad Request` | 类型、字段或 JSON 非法 | 修正后重试 |
| `404 Not Found` | 快照不存在 | 先恢复或重新准备快照 |
| `409 Conflict` | eventId 或来源冲突 | 停止自动覆盖，人工处理 |
| `500 Internal Server Error` | 项目事实源写入失败 | 保留失败状态并重试 |

成功响应：

```json
{
  "idempotent": false,
  "event": {
    "eventId": "RSI-FEEDBACK-001",
    "scope": "unknown",
    "classificationStatus": "pending",
    "lifecycle": "active",
    "rsiSnapshotId": "RSI-SNAPSHOT-<UUID>",
    "rsiProvider": "claude"
  }
}
```

### 5.4 Complete example

```bash
curl --request POST 'http://127.0.0.1:<port>/api/rsi/feedback' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data '{"eventId":"RSI-FEEDBACK-001","snapshotId":"RSI-SNAPSHOT-<UUID>","provider":"claude","feedbackType":"failure","runId":"RUN-004","featureId":"FEATURE-001","title":"浏览器截图缺失","description":"验收时没有保存截图","phase":"verification","evidenceRefs":["run://RUN-004/verification"]}'
```

响应 Cookie：不适用。错误响应结构统一为 `{"errorCode":"...","message":"..."}`，不返回堆栈、内部路径或原始异常。
