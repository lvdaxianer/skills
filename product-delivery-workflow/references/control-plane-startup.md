# 控制平面启动与复用

## 每次运行的预检

`product-delivery-workflow` 每次开始前都要确保本地控制平面可用，顺序固定：

1. 确定项目根目录和公共知识根目录。
2. 使用固定回环地址和端口检查 `/healthz`、`/readyz`。
3. 读取运行元数据，核对项目根目录、公共知识根目录、服务版本、PID 和端口。
4. 未监听时调用 `ensureControlPlane` 启动受控 Node 子进程。
5. 已绑定同一项目时复用；绑定其他项目或被未知进程占用时阻塞，不发送终止信号。
6. `/readyz` 通过后，才创建 run 和 `interaction.jsonl`。

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
