# 控制平面服务

这是 `product-delivery-workflow` 的本地 Node 控制平面。当前实现只提供健康检查、就绪检查和项目绑定元数据，不承担 Worker 编排或知识归属写入。

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
| 其他路径 | `GET` | `404` | 返回稳定错误码 `CONTROL_PLANE_ROUTE_NOT_FOUND`。 |

本 API 只监听本机回环地址，不作为外部 REST API 暴露；外部 REST API 文档门禁在本任务中不适用。

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

## 本地测试

```bash
npm test --prefix product-delivery-workflow/references/control-plane
```
