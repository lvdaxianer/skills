# 全局知识目录 REST API

## 1. 模块概览与覆盖范围

| 项目 | 内容 |
| --- | --- |
| 业务模块 | 全局知识目录（`global-knowledge`） |
| 文档路径 | `apis/global-knowledge.md` |
| 模块职责 | 跨项目查询、问题治理、归属移动/复用、项目规则和 SQLite 同步状态 |
| 基础 URL / 版本 | `http://127.0.0.1:<port>`；当前无独立版本前缀 |
| 通用认证与约定 | 仅 loopback 控制平面；无 Cookie；请求和响应使用 `application/json`；时间为 ISO 8601 |

### 1.1 对外 route 覆盖表

| Controller / route 归属 | 对外端点 | 文档章节 | 覆盖状态 |
| --- | --- | --- | --- |
| `global-knowledge-api` | `/api/global/problems`、`/api/global/projects` | 2.1、2.2 | 已覆盖 |
| `global-knowledge-api` | `/api/global/problems/{itemId}/*` | 2.3 | 已覆盖 |
| `global-knowledge-api` | `/api/global/projects/{projectId}/rules`、`/api/global/rules/diff` | 2.4 | 已覆盖 |
| `global-knowledge-api` | `/api/global/sync`、`/api/global/sync/rebuild` | 2.5 | 已覆盖 |

## 2.1 全局问题列表和创建

### 请求

```http
GET http://127.0.0.1:<port>/api/global/problems?projectId=PROJECT-A&scope=project
POST http://127.0.0.1:<port>/api/global/problems
Content-Type: application/json
```

GET query 参数：`itemId`、`projectId`、`scope`、`lifecycle`、`severity` 均可选。POST body 必须包含 `projectId`、`problem`、`operator`、`reason`；`problem.eventId` 可选，未提供时由服务生成。

```json
{
  "projectId": "PROJECT-A",
  "problem": { "eventId": "EVENT-001", "title": "构建失败", "solution": "清理缓存" },
  "operator": "alice",
  "reason": "录入事实问题"
}
```

创建成功返回 `201`，包含 `operationId`、`item`、`projection` 和 `syncStatus`。列表返回 `items`、`syncStatus`、`checkpoint`、`isComplete`；`isComplete=false` 时结果可能滞后。

## 2.2 项目注册

```http
POST http://127.0.0.1:<port>/api/global/projects
Content-Type: application/json
```

请求体：`projectId`、`projectRoot`、`name` 均必填。成功返回 `201`，包含项目注册事实、`operationId`、投影结果和同步状态。项目 ID 只能绑定一个规范化路径。

## 2.3 问题 CRUD、生命周期、归属和历史

| 方法 | URL | 用途 | 请求体 |
| --- | --- | --- | --- |
| `GET` | `/api/global/problems/{itemId}` | 查询单个问题 | 不适用 |
| `PATCH` | `/api/global/problems/{itemId}` | 编辑标题、方案、严重级别和归属 | 允许字段 + `operator`、`reason` |
| `DELETE` | `/api/global/problems/{itemId}` | 可恢复软删除 | `operator`、`reason` |
| `POST` | `/api/global/problems/{itemId}/restore` | 恢复问题 | `operator`、`reason` |
| `POST` | `/api/global/problems/{itemId}/exclude` | 排除问题 | `operator`、`reason` |
| `POST` | `/api/global/problems/{itemId}/move` | 移动权威归属 | `scope`、可选 `projectId`、审计字段 |
| `POST` | `/api/global/problems/{itemId}/reuse` | 复制公共规则为项目 hybrid 适配 | `projectId`、审计字段 |
| `POST` | `/api/global/problems/{itemId}/publish` | 通过门禁发布公共规则 | `review`、审计字段 |
| `GET` | `/api/global/problems/{itemId}/history` | 查询追加式归属/CRUD 历史 | 不适用 |

所有写操作先写 JSON 事实文件，再执行 SQLite 投影；成功响应包含 `operationId` 和 `syncStatus`。不存在问题返回 `404 KNOWLEDGE_NOT_FOUND`；缺少审计返回 `400 KNOWLEDGE_AUDIT_REQUIRED`；公共门禁失败返回 `422 KNOWLEDGE_PROMOTION_BLOCKED`。请求 Cookie：不适用。

## 2.4 项目规则和跨项目差异

```http
GET http://127.0.0.1:<port>/api/global/projects/PROJECT-A/rules
GET http://127.0.0.1:<port>/api/global/rules/diff?projects=PROJECT-A,PROJECT-B
```

规则结果包含 `items`、`relation`（`inherited`、`overridden`、`project`、`hybrid`）和 `syncStatus`。有效规则优先级为 `project > hybrid > common`。差异结果包含 `shared`、`differences` 和参与比较的项目视图；至少需要两个项目。

## 2.5 同步状态和重建

```http
GET http://127.0.0.1:<port>/api/global/sync
POST http://127.0.0.1:<port>/api/global/sync/rebuild
```

同步状态为 `synced`、`pending`、`error` 或 `conflict`，返回 checkpoint、缺失来源、冲突来源和 `isComplete`。重建使用临时 SQLite；失败保留旧投影并返回 `replaced=false`。请求体、请求 Cookie 和幂等 Header：不适用；操作 ID 由服务生成并写入文件事实。

## 2.6 错误响应

```json
{
  "errorCode": "KNOWLEDGE_AUDIT_REQUIRED",
  "message": "操作者和原因不能为空",
  "traceId": "TRACE-example"
}
```

未知内部异常只返回 `CONTROL_PLANE_INTERNAL_ERROR` 和安全消息；不会向调用方暴露堆栈、SQLite 列名或文件路径。

## 2.7 curl 示例

```bash
curl --request POST 'http://127.0.0.1:<port>/api/global/problems' \
  --header 'Content-Type: application/json' \
  --data '{"projectId":"PROJECT-A","problem":{"title":"构建失败","solution":"清理缓存"},"operator":"alice","reason":"录入事实问题"}'
```
