# 控制平面启动与复用

## 每次运行的预检

`prodflow` 每次开始前都要确保本地控制平面可用，顺序固定：

1. 确定项目根目录和公共知识根目录。
2. 使用固定回环地址和端口检查 `/healthz`、`/readyz`。
3. 读取运行元数据，核对项目根目录、公共知识根目录、服务版本、PID 和端口。
4. 未监听时调用 `ensureControlPlane` 启动受控 Node 子进程。
5. 已绑定同一项目时复用；绑定其他项目或被未知进程占用时阻塞，不发送终止信号。
6. `/readyz` 通过后，才创建 run 和 `interaction.jsonl`。
7. 创建 run 后准备第一份 RSI 快照；把 `snapshotId`、`sourceHash` 和 `contentHash` 写入运行审计，供后续 Worker 恢复。

## 手动启动

在控制平面目录执行：

```bash
node src/start.mjs \
  --host 127.0.0.1 \
  --port 43100 \
  --projectRoot /absolute/path/to/project \
  --sharedKnowledgeRoot /absolute/path/to/shared-knowledge \
  --runtimeRoot /absolute/path/to/project/.product/control-plane/run \
  --serviceVersion 0.1.0
```

运行目录会写入 `runtime.json`。服务只监听本机回环地址，控制台通过 `http://127.0.0.1:43100/` 访问。

## 独立 MCP 启动

MCP 不占用 HTTP 端口，也不需要覆盖 `CLAUDE.md` 或 `AGENTS.md`。需要 MCP 的客户端启动独立 stdio 进程：

```bash
npm run mcp --prefix prodflow/references/control-plane -- \
  --projectRoot /absolute/path/to/project \
  --sharedKnowledgeRoot /absolute/path/to/shared-knowledge
```

客户端通过 stdin 发送 JSON-RPC，stdout 只包含 JSON-RPC 响应。控制平面注入接口返回的 `mcp.command` 和 `mcp.args` 可以直接作为客户端配置；`status=available` 只代表配置可用，注册动作仍由客户端完成。

## 启动后的全局治理核验

```bash
curl --fail http://127.0.0.1:43100/healthz
curl --fail http://127.0.0.1:43100/readyz
curl --fail http://127.0.0.1:43100/api/global/sync
```

首次使用全局控制台时，先通过 `POST /api/global/projects` 注册项目，再使用控制台或 `POST /api/global/problems` 写入问题。注册两个项目后可以使用规则差异接口确认公共继承、项目覆盖和 hybrid 适配。

SQLite 不是事实源。`sharedKnowledgeRoot/control-plane/catalog.sqlite` 删除、损坏或检测到 `conflict` 时，执行：

```bash
curl --fail -X POST http://127.0.0.1:43100/api/global/sync/rebuild
curl --fail http://127.0.0.1:43100/api/global/sync
```

只有重建响应为 `status=synced` 且同步接口返回 `isComplete=true`，才把全局查询结果当作最新；重建失败时保留旧投影并进入人工排查，不直接编辑 SQLite。

## 总控调用

总控代码应传入固定端口和运行目录：

```js
import { ensureControlPlane } from './references/control-plane/src/ensure-control-plane.mjs';

const result = await ensureControlPlane({
  host: '127.0.0.1',
  port: 43100,
  projectRoot: '/absolute/path/to/project',
  sharedKnowledgeRoot: '/absolute/path/to/shared-knowledge',
  runtimeRoot: '/absolute/path/to/project/.product/control-plane/run',
  serviceVersion: '0.1.0'
});
```

返回 `started` 表示新启动，返回 `reused` 表示安全复用。未知端口占用、项目错绑、启动超时和目录不可用都必须保留稳定错误码并停止当前总控运行。

## RSI 注入时机

- 会话启动或新 run 创建：调用 `POST /api/rsi/snapshots`，生成 global、project、current 三层初始快照。
- 任务开始和 Worker 创建：沿用同一个快照；需要当前任务事实时重新准备快照，并把新 ID 写入对应交互消息。
- 开发、测试和重试：没有新事实时使用 `GET /api/rsi/snapshots/:snapshotId` 恢复；出现失败、near miss、人工修订或新证据时先调用 `POST /api/rsi/feedback`，再准备增量快照。
- 运行结束：反馈必须落项目事实源，公共晋升仍由知识治理和人工复检门禁负责；不会把未确认候选直接注入下一次默认上下文。
