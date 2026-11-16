# product-delivery-workflow

这是产品需求到工程交付的中文总控 Skill。它负责分流需求、在需要时生成并复检 PRD、维护三 Worker 交互事实源、交给 `development-workflow` 开发、收集可回放验收证据，并在最终阶段询问是否交给 `service-deployment` 部署。

## 什么时候生成 PRD

- `quick-action`：简单格式、局部说明和不改变行为的修改，只生成最小任务与验证记录。
- `content`：文章、README、接口文档，生成内容 brief 和审阅证据。
- `bugfix`：复现和预期明确的 Bug，生成 Bug Record、回归测试和证据。
- `feature`：新流程、API、数据模型或业务规则，必须走完整 PRD。
- `high-risk`：权限、敏感数据、支付、迁移和生产发布，必须走完整 PRD 与高风险门禁。

用户输入很短时，主 Worker 会补齐目标、角色、流程、规则、验收、测试意图、假设和风险；每个补充项标记 `explicit`、`inferred`、`default` 或 `project-context`。产品复检和研发复检使用独立冻结快照，两个都 PASS 才能进入 `DEVELOPMENT_READY`。

## 启动控制平面

先读 [控制平面启动说明](./references/control-plane-startup.md)，再执行：

```bash
cd product-delivery-workflow/references/control-plane
npm test
node src/start.mjs \
  --host 127.0.0.1 \
  --port 43100 \
  --projectRoot /absolute/path/to/project \
  --sharedKnowledgeRoot /absolute/path/to/shared-knowledge \
  --runtimeRoot /absolute/path/to/project/.product/control-plane/run \
  --serviceVersion 0.1.0
```

总控运行时优先调用 `ensureControlPlane` 自动启动或复用。控制台地址为 `http://127.0.0.1:43100/`；首页使用 `ui/index.ejs` 服务端模板，不依赖独立 `index.html`。

## 一次完整运行

1. 控制平面通过 `/healthz`、`/readyz` 后创建 `.product/runs/<runId>/`。
2. 主 Worker 写入 PRD，两个独立复检 Worker 读取各自快照；所有消息追加到 `interaction.jsonl`。
3. 双复检通过后生成 `prd-verified.json`、`tasks.json` 和 `handoff.md`，向 `development-workflow` 写入 `action=execute` 请求。
4. 每条验收标准生成契约，保存命令/API/浏览器/冒烟证据；缺少必要证据只能得到 `FAILED` 或 `INCONCLUSIVE`。
5. 所有任务和验收完成、最终审计通过后生成部署 dry-run，并询问用户是否部署。
6. 用户选择不部署时记录 `VERIFIED_NOT_DEPLOYED`；没有明确授权时保持 `DEPLOYMENT_DECISION_REQUIRED`；明确授权并提供完整参数后，才向 `service-deployment` 写入执行请求。

## 运行与事实源

权威事实源位于项目 `.product/`：

- `.product/runs/<runId>/run.json`：状态和入口档位；
- `.product/runs/<runId>/interaction.jsonl`：Worker/Skill 追加式交互账本；
- `.product/runs/<runId>/audit.jsonl`：人工和系统审计；
- `.product/knowledge/`：项目知识和错误回流；
- `.product/rsi/`：三层 RSI 快照、Provider 导入文件和 manifest；
- 共享知识根目录：只接收通过脱敏、可移植、依据和独立复检门禁的公共 Guardrail。

知识控制台支持 `unknown/project/common/hybrid` 筛选、人工编辑、排除和公共发布。排除只改变生命周期，不删除原始错误、证据或审计链。

## 全局知识治理控制台

启动服务后访问 `http://127.0.0.1:43100/`，首页是 EJS 服务端模板控制台，提供：

- 全局问题列表、筛选、新增、编辑、归属调整、排除/恢复和公共发布；每次写操作都要求操作者和原因。
- 项目有效规则视图，以及 project、hybrid、common 规则的继承和覆盖关系。
- 两个项目的规则差异比较，以及 `synced`、`pending`、`error`、`conflict` 等同步状态提示。

全局 API 只监听回环地址，常用接口如下：

```bash
curl http://127.0.0.1:43100/api/global/problems
curl http://127.0.0.1:43100/api/global/projects/PROJECT-A/rules
curl 'http://127.0.0.1:43100/api/global/rules/diff?projects=PROJECT-A,PROJECT-B'
curl -X POST http://127.0.0.1:43100/api/global/sync/rebuild
```

`sharedKnowledgeRoot/control-plane/catalog.sqlite` 只是 SQLite 查询投影。删除或损坏它不会删除事实；重建接口会从已注册项目的 `.product/knowledge/` 和共享 `common/guardrails/` 原子重建。发现 `conflict` 时先检查 checkpoint 和来源文件，再执行重建并确认 `/api/global/sync` 返回 `isComplete=true`。

## 故障排查

| 现象 | 处理 |
| --- | --- |
| `CONTROL_PLANE_PORT_CONFLICT` | 检查端口占用者；不要杀未知进程，改用固定空闲端口后重试。 |
| `CONTROL_PLANE_PROJECT_MISMATCH` | 读取 `runtime.json` 核对项目绑定；停止总控并人工处理旧实例，不自动接管。 |
| `/readyz` 返回 503 | 检查项目根目录和公共知识根目录是否存在且可访问。 |
| `PRD_BLOCKED` 或 `PRD_REVISE_REQUIRED` | 查看独立复检结果和 blocked 假设，修订后重新生成 PRD 版本。 |
| `DEVELOPMENT_HANDOFF_BLOCKED` | 检查 `prd-verified.json`、`tasks.json`、验收引用、双复检引用和假设状态。 |
| `INCONCLUSIVE` | 补齐截图、URL、API 摘要、命令退出码或当前 commit/release 绑定，再重新评估。 |
| `DEPLOYMENT_DECISION_REQUIRED` | 这是安全等待状态；用户未明确授权前不会执行部署。 |
| `DEPLOYMENT_INPUT_REQUIRED` | 按 [部署交接协议](./references/service-deployment-adapter.md) 补齐部署根目录、服务名、artifact、配置、生命周期和迁移参数。 |
| 全局列表显示结果可能滞后 | 读取 `/api/global/sync`；确认 checkpoint 无 `error/conflict`，必要时执行 `/api/global/sync/rebuild`。 |
| SQLite 不存在或无法打开 | 不手工创建或编辑 SQLite，确认共享目录可写后由控制平面重建。 |

## 相关协议

- [入口分流](./references/intake-routing.md)
- [三 Worker 协议](./references/worker-protocol.md)
- [知识模型](./references/knowledge-model.md)
- [RSI 上下文注入与 Provider Adapter](./references/rsi-provider-adapters.md)
- [开发交接](./references/development-workflow-adapter.md)
- [部署交接](./references/service-deployment-adapter.md)
- [控制平面 README](./references/control-plane/README.md)
