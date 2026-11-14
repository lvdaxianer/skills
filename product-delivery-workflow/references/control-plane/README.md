# 控制平面服务

这是 `product-delivery-workflow` 的本地 Node 控制平面，提供健康检查、运行绑定、文件事实源、PRD Worker 编排、知识治理 API 和人工管理控制台。

## 运行约束

- 仅允许绑定本地回环地址：`127.0.0.1`、`::1` 或 `localhost`。
- 服务启动前必须提供有效的项目目录和公共知识目录。
- `/healthz` 只表示 HTTP 服务进程存活。
- `/readyz` 会实时检查项目目录和公共知识目录是否可访问。
- 就绪检查失败时返回 HTTP `503`，不会暴露堆栈或内部异常。

## API

| 路径 | 方法 | 成功状态 | 说明 |
| --- | --- | --- | --- |
| `/healthz` | `GET` | `200` | 返回服务存活状态。 |
| `/readyz` | `GET` | `200` 或 `503` | 返回目录依赖和项目绑定是否就绪。 |
| `/` | `GET` | `200` | 服务端渲染的 EJS 风格知识归属控制台。 |
| `/api/knowledge` | `GET` | `200` | 返回可人工管理的知识事件。 |
| `/api/knowledge/:eventId` | `PATCH` | `200` | 保存人工归属、严重级别、解决方案和审计原因。 |
| `/api/knowledge/:eventId/exclude` | `POST` | `200` | 排除问题但保留原始事件和证据。 |
| `/api/knowledge/:eventId/publish` | `POST` | `200` 或 `422` | 通过公共晋升门禁后发布 Guardrail。 |
| 其他路径 | `GET` | `404` | 返回稳定错误码 `CONTROL_PLANE_ROUTE_NOT_FOUND`。 |

本 API 只监听本机回环地址，不作为外部 REST API 暴露；外部 REST API 文档门禁在本任务中不适用。

控制台主页面是 `ui/index.ejs`，由内置安全模板渲染器处理 `<%= key %>` 和 `<%- key %>` 插值，不执行模板任意 JavaScript；`app.js` 只负责筛选、编辑和渐进增强。

## 启动与复用

总控流程应调用 `src/ensure-control-plane.mjs` 的 `ensureControlPlane`，而不是直接杀掉或替换已有进程。启动器会：

1. 先探测 `/readyz` 和运行元数据；项目、公共知识目录、版本、PID、端口均匹配时返回 `reused`。
2. 没有可用服务时启动 `src/start.mjs` 子进程，等待就绪后返回 `started`。
3. 发现其他项目或未知服务占用端口时抛出稳定阻塞错误，不终止未知进程。

运行元数据写入调用方提供的运行目录 `runtime.json`，包含 `projectRoot`、`sharedKnowledgeRoot`、`serviceVersion`、`pid`、`host`、`port`、`managedBy` 和 `startedAt`。该文件是可恢复线索，不替代项目文件事实源。

## 文件事实源

`FileFactStore` 将权威数据写入项目 `.product/runs/<runId>/`：

- `run.json`：运行快照和入口档位。
- `interaction.jsonl`：追加式 Worker 消息账本，状态变化追加新事件，不覆盖历史。
- `audit.jsonl`：人工和系统审计事件。

`control-plane/cache/index.json` 只保存可重建索引，删除后可通过 `rebuildIndex()` 从 `run.json` 重新生成。服务重启或新 Worker 上下文建立时，应从这些文件恢复运行和目标 Worker 的待执行消息。

## PRD 三 Worker 门禁

`runPrdWorkflow()` 使用主 Worker 生成固定结构 PRD，再为 `product-review` 和 `engineering-review` 写入各自的不可变快照并并行执行。快照不包含另一个复检 Worker 的结果；只有两个结果均为 `status=succeeded`、`verdict=pass` 且不存在 `blocked` 假设时，才会写入 `prd-verified.json`、`tasks.json`、`handoff.json` 并进入 `DEVELOPMENT_READY`。

## 错误与知识治理

`KnowledgeStore` 在错误、近失误、测试失败或人工修订发生时立即写入项目 `.product/knowledge/events/`，初始状态固定为 `scope=unknown`、`classificationStatus=pending`。后台分类只写建议；人工决策写入版本和审计，并可归属 `project`、`common` 或 `hybrid`。

公共 Guardrail 只能通过脱敏、可移植、复现/规范依据和两名独立复检人的晋升门禁，写入配置的共享根目录。Worker 通过 `createLessonSnapshot({ maxItems })` 读取有限条目和证据引用，不直接读取全部历史事件；`excluded` 和未晋升候选不会进入快照。

## 本地测试

```bash
npm test --prefix product-delivery-workflow/references/control-plane
```
