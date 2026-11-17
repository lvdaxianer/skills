# prodflow

`prodflow` 是“产品需求 → PRD（按需）→ 开发 → 测试/验收 → 可选部署”的中文总控 Skill。

它负责把用户的一句话需求变成可执行、可验证、可回放的交付过程，并把失败、近失误和人工修订沉淀为下一次运行可读取的 RSI 上下文。

`prodflow` 是编排层，不替代领域 Skill：

- 工程实现交给 `development-workflow`。
- 服务部署交给 `service-deployment`。
- 代码质量、可靠性、日志、前端交互、REST 文档等遵循对应权威 Skill。
- `prodflow` 只负责分流、状态推进、Worker 交互、证据门禁、知识回流和交接。

## 一、先理解一条完整链路

```text
用户需求
   │
   ▼
控制平面预检 ──► 创建 run / interaction.jsonl / 初始 RSI 快照
   │
   ▼
需求分流
   ├── quick-action ──► 最小任务 + 最小验证
   ├── content      ──► 内容 brief + 审阅证据
   ├── bugfix       ──► Bug Record + 回归测试
   ├── feature      ──► PRD + 双 Worker 复检
   └── high-risk    ──► PRD + 风险门禁 + 人工决策
   │
   ▼
PRD 门禁（仅 feature / high-risk）
   ├── 主 Worker 生成 PRD
   ├── 产品复检 Worker（独立上下文）
   └── 研发复检 Worker（独立上下文）
   │
   ▼
DEVELOPMENT_READY
   │
   ▼
development-workflow 执行任务
   │
   ▼
每条验收标准独立验证并保存证据
   │
   ▼
FINAL_AUDIT_PASSED
   │
   ▼
询问是否部署
   ├── 不部署 ──► VERIFIED_NOT_DEPLOYED
   ├── 参数不足 ─► DEPLOYMENT_INPUT_REQUIRED
   └── 明确授权 ─► service-deployment ─► DEPLOYED / FAILED / ROLLED_BACK
```

核心原则：没有证据，不得把“应该成功”写成“已经成功”；没有用户授权，不执行部署。

## 二、什么时候需要 PRD

不是每个需求都需要 PRD。入口先根据行为风险和范围分流：

| 档位 | 适用场景 | 是否完整 PRD | 主要产物 |
| --- | --- | --- | --- |
| `quick-action` | 改文字、改 README、简单格式、不改变行为 | 否 | 最小任务、范围、验证记录 |
| `content` | 写文章、接口文档、说明文档 | 否 | 内容 brief、审阅记录、引用 |
| `bugfix` | 复现路径和预期明确的 Bug | 通常否 | Bug Record、回归测试、证据 |
| `feature` | 新流程、API、数据模型、业务规则 | 是 | PRD、双复检结果、任务、交接 |
| `high-risk` | 权限、敏感数据、支付、迁移、生产发布 | 是 | PRD、高风险门禁、人工决策 |

如果用户明确说“不要 PRD”，且需求不属于高风险或新业务规则，可以跳过完整 PRD，但仍然要保留任务范围、验证方式和结果证据。高风险需求不能因为输入简短就跳过门禁。

用户只输入一句话时，主 Worker 可以补齐目标、角色、流程、规则、验收、测试意图、假设、风险和依赖，但每项必须标注来源：

- `explicit`：用户明确说过。
- `inferred`：根据需求和项目上下文推断。
- `default`：采用系统默认行为。
- `project-context`：来自项目事实或既有规则。

推断内容不能伪装成用户确认内容；高风险推断必须进入阻塞或人工确认。

## 三、各环境分别负责什么

这里的“环境”既包括运行阶段，也包括承载该阶段事实的执行边界。每个环境都有自己的输入、输出和禁止事项。

| 环境/角色 | 负责什么 | 输入 | 输出/证据 | 不负责什么 |
| --- | --- | --- | --- | --- |
| 用户与产品输入环境 | 提供目标、背景、约束和优先级 | 用户消息、附件、已有项目事实 | 原始需求、显式决策、补充说明 | 不直接修改代码或部署 |
| 本地 Control Plane | 提供 HTTP API、运行绑定、事实源、SQLite 投影和控制台 | 项目根目录、公共知识根目录、run 参数 | `/healthz`、`/readyz`、run、interaction、API 响应 | 不替 Worker 做隐藏决策，不把 SQLite 当事实源 |
| 主 Worker 环境 | 分析需求、生成/修订 PRD、拆分任务 | 原始需求、项目上下文、有限 RSI 快照 | PRD 版本、假设、风险、任务和交接 | 不读取复检 Worker 的私有上下文 |
| 产品复检 Worker 环境 | 检查用户价值、目标、范围、流程和业务规则 | 冻结 PRD 快照、原始需求、产品规则 | 独立 review 结果、遗漏、冲突、verdict | 不修改主 Worker 草稿，不读取研发复检结果 |
| 研发复检 Worker 环境 | 检查可测试性、依赖、数据、权限和工程可执行性 | 同一 PRD 版本的独立冻结快照 | 独立 review 结果、任务建议、阻塞项、verdict | 不读取产品复检临时结论 |
| 开发环境 | 由 `development-workflow` 实现任务和编写测试 | `handoff.md`、`tasks.json`、验收契约、代码仓库 | 代码提交、单元/集成测试、变更审计 | 不自行扩大需求，不自动部署 |
| 测试与验收环境 | 按每条验收标准收集可回放证据 | 当前 commit、运行配置、测试数据、浏览器或 API | 命令退出码、API 摘要、URL、截图、trace、日志摘要 | 不用“服务启动了”替代业务成功 |
| 部署环境 | 由 `service-deployment` 执行真实发布或回滚 | 用户授权、部署根目录、服务名、artifact、配置和健康命令 | dry-run、部署结果、健康检查、回滚记录 | 没有明确授权或参数不完整时不执行 |
| 知识治理环境 | 管理错误、公共规则、项目规则和人工归属 | `.product/knowledge/`、共享 Guardrail、操作审计 | `unknown/project/common/hybrid` 决策、SQLite 投影、lesson snapshot | 不把未复检错误直接注入公共上下文 |

### 3.1 Control Plane 的启动边界

每次运行先确认本地控制平面：

```bash
npm test --prefix prodflow/references/control-plane

node prodflow/references/control-plane/src/start.mjs \
  --host 127.0.0.1 \
  --port 43100 \
  --projectRoot /absolute/path/to/project \
  --sharedKnowledgeRoot /absolute/path/to/shared-knowledge \
  --runtimeRoot /absolute/path/to/project/.product/control-plane/run \
  --serviceVersion 0.1.0
```

总控优先使用 `ensureControlPlane` 自动启动或安全复用：

1. 检查 `/healthz` 判断进程是否存活。
2. 检查 `/readyz` 判断项目目录和公共知识目录是否匹配且可访问。
3. 校验运行元数据中的项目路径、公共知识路径、版本、PID 和端口。
4. 未监听时启动受控 Node 子进程。
5. 端口被未知服务占用时阻塞并报告，不杀未知进程。
6. 服务 ready 后创建 `.product/runs/<runId>/` 和追加式账本。

控制平面不可用时，流程必须停止并保存可诊断错误，不能静默退化为仅依赖内存的流程。

## 四、PRD 三 Worker 如何协作

主 Worker 生成固定结构的 PRD，至少包含：

- 背景和问题
- 目标与非目标
- 角色和用户故事
- 主流程、异常流程和边界流程
- 业务规则、权限和数据状态
- 验收标准和测试意图
- 任务拆分、依赖和交接
- 假设、风险和待确认项

主 Worker 生成某个 PRD 版本后，创建两个独立上下文。子 Worker 只能读取原始需求、项目事实、冻结 PRD 和评审规则，不能读取主 Worker 隐藏推理、另一个子 Worker 的临时结果或未冻结草稿。

只有以下条件全部满足才可以写入 `PRD_VERIFIED`：

```text
产品复检 status=succeeded 且 verdict=pass
研发复检 status=succeeded 且 verdict=pass
没有高风险 block
验收标准、任务依赖和验证计划完整
没有未处理的 blocked 假设
```

任一复检返回 `revise` 或 `block`，主 Worker 必须生成新的 PRD 版本，并重新创建两个独立上下文。旧版本保留，不能原地覆盖。

### 4.1 Worker 交互文件

所有交互追加到：

```text
.product/runs/<runId>/interaction.jsonl
```

每条消息至少包含：

```yaml
message_id: MSG-...
run_id: RUN-...
round: 1
from: main-worker
to: product-review-worker
kind: inform | request | response | ack | block
action: none | execute
status: pending | processing | succeeded | failed | blocked
verdict: pass | revise | block | null
correlation_id: ...
input_refs: []
output_refs: []
```

只有 `action=execute` 且 `to` 指向当前 Worker 的消息才进入执行队列。`inform` 只是告知，不触发执行；状态变化追加新事件，不覆盖旧记录。

## 五、什么时候进入开发

满足以下条件后，`prodflow` 才写入 `DEVELOPMENT_READY` 并向 `development-workflow` 交接：

1. 需求档位允许开发。
2. 如果需要 PRD，主 Worker 和两个复检 Worker 已通过门禁。
3. `prd-verified.json`、`tasks.json`、`handoff.md` 和验收契约已落盘。
4. 所有任务都有稳定 ID、依赖、完成标准和验证方式。
5. 没有未处理的高风险假设或阻塞项。
6. 交互账本中存在指向当前任务的 `action=execute` 消息。

进入开发后，工程实现、分支、OpenSpec、TDD、代码审查和提交由 `development-workflow` 负责；`prodflow` 不重复实现工程 Skill 的细则。

开发完成后不会直接宣称成功，而是进入 `TASK_VERIFIED`，等待每条验收标准的证据闭环。

## 六、测试、验收与成功证据

每条验收标准必须独立生成验证契约，至少包含：

- 验收标准 ID
- 验证方式
- 预期结果
- 实际结果
- 证据引用
- 当前 commit 或 release 绑定

证据类型包括：

| 类型 | 最低证据 |
| --- | --- |
| 命令/测试 | 完整命令、退出码、关键输出摘要 |
| HTTP/API | 请求、状态码、响应摘要、业务状态 |
| 浏览器 | 页面 URL、操作记录、断言、截图，必要时保存 trace、console/network 摘要 |
| 文件/数据 | 文件路径、内容摘要、哈希或可重复读取方式 |
| 服务运行 | 健康检查、ready 检查、业务冒烟结果 |

以下情况只能得到 `FAILED` 或 `INCONCLUSIVE`：

- 缺少必要截图、URL、API 摘要或命令退出码。
- 证据绑定了其他 commit/release。
- 页面存在关键 console/network 错误。
- 只证明端口监听，没有证明业务操作成功。
- 只看到“工具返回成功”，没有实际文件、响应、截图或状态证据。

只有所有验收标准都有完整、通过且版本绑定的证据，才可以进入 `FINAL_AUDIT_PASSED`。

## 七、部署决策

部署不是默认阶段。最终审计通过后先生成 dry-run，然后询问用户：

```text
DEPLOYMENT_DECISION_REQUIRED
```

- 用户选择不部署：记录 `VERIFIED_NOT_DEPLOYED`，保留 dry-run 和全部验证证据。
- 用户想部署但参数不全：记录 `DEPLOYMENT_INPUT_REQUIRED`，只列出缺少的部署根目录、服务名、artifact、配置、健康命令、迁移参数等。
- 用户明确授权且参数完整：读取 `service-deployment`，交给它执行部署、健康检查和必要回滚。

`prodflow` 不猜测生产路径、不读取或生成秘密、不绕过部署 Skill，也不因为本地测试通过就自动发布。

## 八、RSI 是什么

RSI（运行时自我改进上下文）不是把全部历史日志塞进 Prompt，而是把已经治理、有限预算、带来源和证据的知识，压缩成一次运行可以恢复的上下文快照。

RSI 的目标是：

1. 让新的 Worker 读取已经验证的公共规则和项目规则。
2. 让主 Worker、两个复检 Worker、开发和测试使用同一份可追踪上下文版本。
3. 把失败、near miss、测试失败、验收失败和人工修订回流到事实源。
4. 下一次运行只读取经过治理的有限 lesson snapshot，避免上下文无限膨胀。
5. 通过 `snapshotId`、`sourceHash`、`contentHash` 和审计记录证明“当时到底注入了什么”。

## 九、RSI 的三层模型和数据边界

每个 RSI 快照固定包含三层：

| 层 | 内容 | 来源 | 默认状态 |
| --- | --- | --- | --- |
| `global` | 可迁移的公共 Guardrail、跨项目共通问题和解决方案 | 共享知识事实源、SQLite 查询投影 | 只读、经过公共晋升门禁 |
| `project` | 当前项目的规则、项目错误和项目特殊约束 | 项目 `.product/knowledge/` | 只读、项目范围有效 |
| `current` | 当前任务、当前运行、当前验证证据和临时事实 | 本次 run 输入 | 只对当前快照有效 |

事实源与投影边界：

```text
公共/项目 JSON 文件事实源
          │
          ├──► SQLite catalog（可删除、可重建的查询投影）
          │
          └──► RsiContextBuilder
                    │
                    ▼
              .product/rsi/snapshots/<snapshotId>.*
```

SQLite 不是权威事实源。SQLite 删除、损坏或出现 `conflict` 时，控制平面从文件事实重建；不能直接编辑 SQLite 来“修复”知识。

默认不会进入 RSI 的内容包括：

- `unknown`、`pending`、未晋升的 `candidate`
- `excluded`、`deprecated`
- 没有证据或没有经过人工/复检门禁的公共候选
- 全量历史日志、完整聊天记录和与当前任务无关的项目内容

公共问题、项目问题和 `hybrid` 规则的归属可以通过控制台人工调整。自动分类只是建议，人工覆盖优先。

## 十、RSI 快照如何生成

### 10.1 生成快照

控制平面提供：

```http
POST /api/rsi/snapshots
```

请求可以包含 `projectId`、`runId`、`task`、`currentFacts`、`maxItems`、`maxBytes` 和可选 `sourceHash`。成功后得到：

```json
{
  "snapshotId": "RSI-SNAPSHOT-...",
  "projectId": "demo-project",
  "runId": "RUN-003",
  "sourceHash": "sha256...",
  "contentHash": "sha256...",
  "layers": [
    {"name": "global", "items": []},
    {"name": "project", "items": []},
    {"name": "current", "items": []}
  ],
  "budget": {"maxItems": 20, "maxBytes": 32768, "truncated": false}
}
```

快照会原子写入：

```text
.product/rsi/
├── current.json
├── current.md
├── current.manifest.json
├── snapshots/<snapshotId>.json
├── snapshots/<snapshotId>.md
├── snapshots/<snapshotId>.manifest.json
└── providers/<provider>/
```

需要重试时使用：

```http
GET /api/rsi/snapshots/:snapshotId
```

没有新事实时恢复原快照；出现新失败、新证据、人工修订或项目规则变化时重新生成快照，不偷偷修改旧快照。

### 10.2 RSI 注入时机

| 时机 | 动作 |
| --- | --- |
| 会话启动 | 预检 Control Plane，生成初始 global/project/current 快照 |
| 任务开始 | 把当前任务和约束写入 current 层，生成或恢复快照 |
| Worker 创建 | 给主 Worker 和两个复检 Worker 使用同一快照 ID，但创建独立上下文 |
| 开发开始 | 将快照 ID、来源哈希和验收引用写入开发交接 |
| 测试/重试 | 没有新事实时恢复；有失败或新证据时先反馈，再生成新快照 |
| 运行结束 | 将失败、near miss、成功前修订和证据写回事实源，供下一次治理 |

## 十一、RSI 的三种注入方式

三种方式消费同一个快照，不重新分类、不各自重写事实，也不会覆盖用户维护的 `CLAUDE.md` 或 `AGENTS.md`。

### 11.1 文件注入

适合会话启动时的稳定上下文。调用：

```http
POST /api/rsi/snapshots/:snapshotId/inject/claude
Content-Type: application/json

{"mode":"file"}
```

Adapter 写入：

```text
.product/rsi/providers/claude/current.md
.product/rsi/providers/claude/current.manifest.json
```

响应会返回 `importSnippet`，例如 Claude 可以读取 `.product/rsi/providers/claude/current.md`。文件注入只写 Provider 专属目录，不覆盖 `CLAUDE.md`、`AGENTS.md` 或其他宿主规则。

### 11.2 Prompt 注入

适合一次性任务或不能稳定读取文件的工具：

```http
POST /api/rsi/snapshots/:snapshotId/inject/codex
Content-Type: application/json

{"mode":"prompt","maxPromptBytes":16384}
```

返回受字节预算限制的 `promptPrelude`，包含 `snapshotId` 和 `contentHash`。调用方必须检查：

- `status=injected`：Prompt 已准备。
- `status=fallback`：请求方式不支持，已经降级为 Prompt。
- `promptBytes` 是否不超过预算。
- 是否携带当前 snapshot 身份。

### 11.3 MCP 注入

适合运行中按需读取上下文、证据和 manifest。控制平面返回：

```http
POST /api/rsi/snapshots/:snapshotId/inject/kimi
Content-Type: application/json

{"mode":"mcp"}
```

响应中的 `status=available` 表示 MCP 启动配置可用，不表示已经替第三方客户端自动注册。也可以直接启动：

```bash
npm run mcp --prefix prodflow/references/control-plane -- \
  --projectRoot /absolute/path/to/project \
  --sharedKnowledgeRoot /absolute/path/to/shared-knowledge \
  --snapshotId RSI-SNAPSHOT-<UUID>
```

MCP 使用 stdio JSON-RPC：

- stdout 只输出 JSON-RPC 响应。
- 启动错误写 stderr，并以非零状态退出。
- `initialize` 后可通过 `tools/list` 发现 RSI 工具。
- `rsi_get_context` 读取层内容。
- `rsi_get_evidence` 读取证据引用。
- `rsi_get_manifest` 读取来源和哈希。
- `rsi_report_usage` 回传 Worker 对 item 的 `consulted` 或 `applied` 声明。
- `rsi_finalize_run` 完成回传并将未解决 item 标记为 `unknown`。
- 不存在的快照、层或条目返回稳定错误，不伪装成功。

### 11.4 RSI 使用回传与次数统计

注入 RSI 后，系统还要区分“已准备”“已读取”和“实际使用”。每个 item 的阶段如下：

| 阶段 | 事实 | 统计含义 |
| --- | --- | --- |
| `injected` | Adapter 已准备文件、Prompt 或 MCP 配置 | 只证明已注入 |
| `loaded` | MCP 返回了该 item | 只证明工具返回，不证明模型采用 |
| `consulted` | Worker 显式声明参考过 | 计入显式使用 |
| `applied` | Worker 显式声明应用到结果，并给出证据引用 | 计入应用使用，等待验收证据确认 |
| `unknown` | finalize 后仍无使用声明 | 未知，不是未使用 |

控制平面接收回传并写入两个位置：`.product/runs/<runId>/rsi-usage.jsonl` 是追加式权威事实，`.product/runs/rsi-usage.sqlite` 是可删除、可重建的查询投影。重复回传按 `runId + workerId + snapshotId + itemId + stage` 幂等，不会重复增加次数。

### 11.5 直接聊天与 Worker Runner 的边界

如果 Claude、Codex、Kimi 等直接聊天没有接入 Worker Runner，系统不会自动拿到模型返回，也不能从聊天内容可靠推断 RSI 是否被使用。可选回传路径是：

1. MCP：调用 `rsi_get_context`，再调用 `rsi_report_usage`，最后调用 `rsi_finalize_run`。
2. HTTP：调用 `POST /api/rsi/runs/{runId}/worker-result`。
3. 文件：保存 `.product/runs/<runId>/worker-result.json`，再由控制平面导入。

三种路径的字段和统计规则相同。没有任何回传时，运行保持未完成；显式 finalize 后 unresolved item 才进入 `unknown`。因此“没有回报”不等于“没有使用”。

## 十二、RSI 注入的成功证据

每次注入尝试都追加到：

```text
.product/rsi/audit.jsonl
```

每条审计至少包含：

```json
{
  "eventType": "rsi_injection",
  "projectId": "demo-project",
  "runId": "RUN-003",
  "provider": "claude",
  "snapshotId": "RSI-SNAPSHOT-...",
  "injectionMethod": "file",
  "status": "injected",
  "recordedAt": "2026-11-17T00:00:00.000Z"
}
```

状态必须区分：

- `injected`：文件或 Prompt 已准备。
- `available`：MCP 配置可用。
- `fallback`：发生了明确降级。
- `failed`：注入失败，必须包含稳定错误码或错误说明。

“目录存在”“进程启动”“接口返回 200”都不能单独证明上下文已经正确注入；必须检查路径、manifest、Prompt 内容、MCP JSON-RPC 响应和审计记录。

## 十三、错误与知识回流

错误在发生时立即写入项目事实源：

```text
.product/knowledge/events/<eventId>.json
```

初始归属固定为 `unknown`，后台分类只生成建议，人工可以修改或排除：

| 归属 | 衡量方式 | 存放位置 | 何时进入上下文 |
| --- | --- | --- | --- |
| `project` | 依赖项目代码、配置、部署或业务流程，离开项目无法复现 | 项目 `.product/knowledge/` | 当前项目快照的 project 层 |
| `common` | 可跨项目复现、规则可移植、已有依据且已独立复检 | 共享知识根目录的公共 Guardrail | global 层 |
| `hybrid` | 公共规则成立，但项目需要参数化适配 | 公共规则 + 项目绑定 | global 与 project 合并 |
| `unknown` | 还没有足够证据判断归属 | 项目事件事实源 | 默认不进入快照 |
| `excluded` | 人工确认不应再作为规则使用 | 原始事件保留，生命周期变更 | 不进入默认快照 |

SQLite 只做列表和差异查询的投影。控制台的移动、编辑、发布和排除都必须先写文件事实和审计，再同步 SQLite。

## 十四、目录结构

```text
prodflow/
├── SKILL.md                         # 总控规则和阶段路由
├── README.md                        # 本流程总览
├── examples/                        # 配置示例
└── references/
    ├── intake-routing.md            # 需求分流
    ├── worker-protocol.md           # Worker 交互账本
    ├── control-plane-startup.md     # 本地服务预检和启动
    ├── knowledge-model.md           # 公共/项目知识治理
    ├── rsi-provider-adapters.md     # RSI Adapter 细则
    ├── verification-evidence.md     # 验收证据契约
    ├── development-workflow-adapter.md
    ├── service-deployment-adapter.md
    └── control-plane/
        ├── src/                     # Node 控制平面
        ├── test/                    # 控制平面测试
        └── ui/                      # EJS 风格控制台
```

项目运行时事实位于项目本身：

```text
.product/
├── runs/<runId>/
│   ├── run.json
│   ├── interaction.jsonl
│   └── audit.jsonl
├── knowledge/
└── rsi/
    ├── snapshots/
    ├── providers/
    └── audit.jsonl
```

## 十五、从零开始的最小操作清单

1. 确认项目根目录、公共知识根目录和本地端口。
2. 启动或复用 `prodflow/references/control-plane`。
3. 读取 `/readyz`，确认项目绑定正确。
4. 创建 run 和初始 RSI 快照。
5. 按需求分流；只有 `feature/high-risk` 进入完整 PRD。
6. 完成主 Worker、产品复检 Worker、研发复检 Worker 门禁。
7. 将冻结任务和验收契约交给 `development-workflow`。
8. 每个任务完成后执行对应测试并保存退出码和证据。
9. 每条验收标准收集命令、API、浏览器或文件证据。
10. 最终审计通过后询问是否部署，不默认调用 `service-deployment`。
11. 运行结束将失败和 near miss 写回知识事实源，下一次运行再生成新的 RSI 快照。

## 十六、相关协议

- [入口分流](./references/intake-routing.md)
- [三 Worker 协议](./references/worker-protocol.md)
- [控制平面启动](./references/control-plane-startup.md)
- [知识模型](./references/knowledge-model.md)
- [RSI Provider Adapter](./references/rsi-provider-adapters.md)
- [RSI 控制 API](../apis/rsi-context.md)
- [验收证据](./references/verification-evidence.md)
- [开发交接](./references/development-workflow-adapter.md)
- [部署交接](./references/service-deployment-adapter.md)
- [控制平面 README](./references/control-plane/README.md)

README 解释流程和边界；权威执行规则仍以 `SKILL.md`、对应 references、`development-workflow` 和 `service-deployment` 为准。
