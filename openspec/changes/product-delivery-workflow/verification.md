# 任务 1.1 一致性与验证记录

## 任务边界

- 模块：`product-delivery-workflow` 主 Skill 契约
- 允许文件：`product-delivery-workflow/SKILL.md` 与本 change 的 OpenSpec 计划文件
- 不在范围：Node 控制服务、UI、Worker 调度实现、知识库 API、浏览器证据采集、真实部署
- 直接执行回退：任务只有一个与 OpenSpec 规格高度耦合的权威 Markdown 契约，委派会增加语义漂移和合并风险，因此由主 Agent 直接执行。

## 验收核对

- [x] 定义中文总控入口和任务档位分流。
- [x] 定义 Node 控制平面预检边界。
- [x] 定义三 Worker 独立上下文、双 PASS 门禁和交互账本字段。
- [x] 定义公共/项目知识、错误回流和有限快照边界。
- [x] 定义验证证据门禁和 `service-deployment` 可选交接。
- [x] 定义 `development-workflow` 的 `DEVELOPMENT_READY` 交接边界。

## 验证证据

```text
test -f .../product-delivery-workflow/SKILL.md ...       PASS
openspec validate product-delivery-workflow --strict     PASS
git diff --check                                         PASS
```

## 适用规范

- `development-workflow`：已遵守 worktree、OpenSpec、TDD、审计和逐任务提交顺序。
- `project-hygiene`：本任务只新增既有 Markdown Skill 目录，未新增构建清单、环境变量、二进制或新产物类型；基线同步不适用。
- 后端、前端、日志、REST API 和 `code-review-spec`：本任务未写入源代码、生产日志或对外 API，实现门禁不适用。

## 审计结论

任务边界、OpenSpec 规格、主 Skill 内容和验证证据一致；没有发现超范围实现或未记录的实现漂移。

## 任务 1.2 参考协议审计

- 边界：只新增 `references/intake-routing.md`、`references/worker-protocol.md` 和 `references/knowledge-model.md`。
- 回退理由：三个文档共同定义主 Skill 的协议，必须保持中文术语、状态和消息字段一致，不适合并行委派。
- focused check：路由档位、复检 Worker、`action=execute`、公共知识根目录和 `lesson-snapshot` 均存在。
- broader check：`openspec validate product-delivery-workflow --strict` 通过；三份 Markdown 结构检查通过。
- 适用规范：本任务只修改 Skill 参考文档，不写源代码、生产日志或对外 API；后端、前端、日志、REST API 和 `code-review-spec` 门禁不适用。
- 结论：参考协议与主 Skill 契约及 5 个 capability spec 一致，没有超范围实现。

## 任务 2.1 控制平面服务审计

### 边界与执行方式

- 边界：只实现 `product-delivery-workflow/references/control-plane/` 下的 Node 服务包、健康/就绪路由、项目与公共知识目录检查、测试和运行说明；不实现端口复用脚本、文件事实源、Worker 编排、知识管理 UI、证据采集或真实部署。
- 执行方式：记录了直接执行回退。服务配置、HTTP 路由、就绪检查和测试属于同一小型核心单元，拆分并行会造成接口漂移；本任务不具备安全的独立写入范围。

### TDD 证据

- RED：服务实现尚不存在时，`npm test --prefix product-delivery-workflow/references/control-plane` 失败，4 个测试均报告 `ERR_MODULE_NOT_FOUND`，确认测试先行。
- GREEN：补齐服务实现后，同一命令通过 5 个测试，覆盖健康、就绪成功、目录失效、未知路由和错误配置。

### 能力核对

- [x] `/healthz` 使用稳定 JSON 返回 `200` 和服务存活状态。
- [x] `/readyz` 实时检查项目目录与公共知识目录，目录失效返回 `503` 和 `CONTROL_PLANE_NOT_READY`。
- [x] 就绪响应包含服务版本、项目目录和公共知识目录绑定元数据。
- [x] 服务只允许绑定 `127.0.0.1`、`::1` 或 `localhost`，不接受 `0.0.0.0` 等外部监听地址。
- [x] 未知路径返回 `404` 和 `CONTROL_PLANE_ROUTE_NOT_FOUND`，不暴露堆栈。
- [x] 响应、配置和就绪检查拆分为小模块，使用稳定常量；没有新增外部依赖。

### 领域规范核对

- `code-review-spec`：通过 JSDoc、常量化状态码/错误码、有限方法长度、显式错误边界和无空值返回审查；未发现直接打印敏感信息或堆栈泄露。
- `backend-reliability-guidelines`：通过本地绑定约束、输入配置校验、生命周期由调用方管理、就绪依赖实时检查和稳定错误契约审查。
- `logging-boundaries`：本任务没有新增生产日志写入，故无日志边界实现；后续控制平面运行日志必须沿用 trace 上下文和脱敏规则。
- `rest-api-documentation`：服务只监听本机回环地址，不作为外部 REST API 暴露；门禁不适用，API 契约已记录在控制平面 README。
- `frontend-interaction-guidelines`：本任务没有 UI 变更，门禁不适用。
- `project-hygiene`：已同步 `.gitignore`、`.gitattributes`、`.editorconfig`；`node_modules`、运行目录和日志目录均有忽略规则。

### 验证证据

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (5 passed, 0 failed)
node JSON.parse(package.json)                                       PASS
awk line-length check                                               PASS
```

### 审计结论

Task 2.1 的实现、测试、中文运行说明和 OpenSpec 任务描述一致；控制平面仍保持本地回环边界，没有提前实现 Task 2.2 之后的启动复用、持久化或编排能力。

## 任务 2.2 控制平面启动/复用审计

### 边界与执行方式

- 边界：只实现控制平面启动器、独立服务入口、运行元数据原子写入、同项目复用和端口冲突阻塞；不实现交互账本、知识持久化、Worker 调度、UI 或部署。
- 执行方式：记录了直接执行回退。启动器、子进程入口、运行元数据和端口探测共同构成一个生命周期单元，拆分并行会造成启动竞态和错误码漂移。

### TDD 证据

- RED：新增启动器测试时，`npm test --prefix product-delivery-workflow/references/control-plane` 中 4 个新测试因 `ensure-control-plane.mjs` 缺失失败，既有 5 个控制平面测试保持通过。
- GREEN：补齐实现并修正原始 TCP 占用探测后，同一命令通过 9 个测试，覆盖自动启动、运行元数据、同项目复用、项目错绑、未知服务占用、健康、就绪、目录失效和错误配置。

### 能力核对

- [x] 服务未监听时由 `ensureControlPlane` 启动独立 Node 子进程，并等待 `/readyz` 与运行元数据就绪。
- [x] 运行元数据原子写入 `runtime.json`，记录项目根目录、公共知识根目录、服务版本、PID、主机、端口、管理者和启动时间。
- [x] 项目、版本、PID、端口绑定一致时返回 `reused`，不重复启动进程。
- [x] 绑定其他项目时返回 `CONTROL_PLANE_PROJECT_MISMATCH`；未知 HTTP/TCP 服务占用端口时返回 `CONTROL_PLANE_PORT_CONFLICT`。
- [x] 端口冲突路径不发送终止信号，不杀未知进程。
- [x] 服务只允许回环地址；控制平面启动入口和复用入口没有新增外部依赖。

### 领域规范核对

- `code-review-spec`：通过稳定错误码、常量化超时、原子元数据写入、显式子进程边界和无堆栈输出审查；未发现直接日志泄漏或未知进程终止。
- `backend-reliability-guidelines`：通过启动超时、就绪探测、项目绑定校验、TCP 占用兜底和信号清理审查。
- `logging-boundaries`：本任务没有新增生产日志；子进程使用忽略的标准输出/错误，不输出路径、参数或秘密，后续运行日志需按 trace 规则补齐。
- `rest-api-documentation`：仍只监听本机回环地址，启动/复用 API 是本地模块调用，不作为外部 REST API；门禁不适用。
- `frontend-interaction-guidelines`：无 UI 变更，门禁不适用。
- `project-hygiene`：使用已有 `.gitignore` 的运行目录规则；运行元数据写入 `.product/control-plane/run/` 等被忽略目录，不进入版本库。

### 验证证据

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (9 passed, 0 failed)
awk line-length check                                               PASS
git diff --check                                                    PASS
```

### 审计结论

Task 2.2 的启动、复用、元数据和冲突行为与规格一致；未知端口占用不会被强制终止，服务未就绪会以稳定阻塞错误停止总控继续执行。

## 任务 2.3 文件事实源与恢复审计

### 边界与执行方式

- 边界：只实现项目文件事实源、追加式 `interaction.jsonl`、审计事件、run 恢复和可重建索引；不实现 Worker 编排、知识归属 UI、错误分类或外部部署。
- 执行方式：记录了直接执行回退。事实源目录、JSONL 状态归并、恢复快照和索引重建共享同一文件协议，拆分并行会造成 schema 和追加语义漂移。

### TDD 证据

- RED：新增事实源测试时，4 个测试因 `fact-store.mjs` 缺失失败，既有 9 个控制平面测试保持通过。
- GREEN：实现文件事实源并补齐首次运行目录初始化后，同一命令通过 13 个测试，覆盖新实例恢复、追加不覆盖、目标/动作过滤和索引重建。

### 能力核对

- [x] `run.json`、`interaction.jsonl` 和 `audit.jsonl` 写入项目 `.product/runs/<runId>/`，作为权威文件事实源。
- [x] Worker 消息状态变化通过同一 `message_id` 的新 JSONL 事件追加，恢复时按最后事件归并。
- [x] 只有 `action=execute`、目标 Worker 匹配且最新状态为 `pending/processing` 的消息进入待执行恢复集。
- [x] 运行恢复同时返回 run 快照、未消费消息和审计事件；新 `FileFactStore` 实例可直接恢复。
- [x] `control-plane/cache/index.json` 只作为缓存，可删除并从全部 `run.json` 确定性重建。
- [x] 标识符、消息动作/状态/类型、引用数组和审计最小字段均有校验，路径穿越不会进入运行目录。

### 领域规范核对

- `code-review-spec`：通过追加式写入、原子 JSON 写入、稳定错误码、结构校验和不覆盖历史审查；未发现把缓存当权威或静默吞掉损坏 JSONL 的行为。
- `backend-reliability-guidelines`：通过目录初始化、缺失空账本恢复、损坏文件显式失败、可重建缓存和路径边界审查。
- `logging-boundaries`：本任务没有新增生产日志，事实源只记录可审计业务字段；没有写入模型隐藏思维链或秘密。
- `rest-api-documentation`：本任务新增的是本地文件模块，不新增外部 REST 路由；门禁不适用。
- `frontend-interaction-guidelines`：无 UI 变更，门禁不适用。
- `project-hygiene`：新增可重建缓存目录忽略规则；项目 `.product/runs` 和审计文件不被忽略，保留为可提交事实源。

### 验证证据

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (13 passed, 0 failed)
awk line-length check                                               PASS
git diff --check                                                    PASS
```

### 审计结论

Task 2.3 的事实文件、交互账本、恢复快照和索引重建与规格一致；服务重启后可通过新事实源实例恢复运行上下文，缓存丢失不会损坏权威记录。

## 任务 3.1 PRD 三 Worker 门禁审计

### 边界与执行方式

- 边界：只实现主 Worker 的默认 PRD 生成/修订、产品复检和研发复检的独立快照、双通过屏障、版本回路、任务拆分和开发交接包；不实现错误分类、知识归属 UI、验证证据采集或真实部署。
- 执行方式：记录了直接执行回退。三 Worker 的快照、消息关联、屏障和 PRD 版本循环必须保持同一状态机，拆分并行会造成隔离和门禁漂移。

### TDD 证据

- RED：新增 PRD 编排测试时，4 个测试因 `prd-coordinator.mjs` 缺失失败，既有控制平面和事实源测试保持通过。
- GREEN：实现并补强失败转换、轮次上限后，同一命令通过 18 个测试，覆盖简单输入补全、来源标记、隔离快照、交互账本、修订 v2、block、阻塞假设和复检异常。

### 能力核对

- [x] 主 Worker 按固定章节生成 PRD，并给目标、角色、用户故事、规则、验收标准、测试意图和假设写入稳定 ID 与来源类型。
- [x] 产品复检和研发复检分别写入独立快照；快照只包含原始需求、项目事实、当前 PRD、规则和知识引用，不包含彼此评审结果。
- [x] 两个复检以 `Promise.all` 并行执行，消息包含目标、动作、状态、结论、关联 ID、输入引用和输出引用，并追加到 `interaction.jsonl`。
- [x] 两个 Worker 都是 `status=succeeded` 且 `verdict=pass`，并且没有阻塞假设时，才生成冻结 PRD、任务拆分和 `DEVELOPMENT_READY` handoff。
- [x] `revise` 会生成下一版本并重新创建两个快照；`block`、复检异常和轮次上限不会写入 `PRD_VERIFIED`。

### 领域规范核对

- `code-review-spec`：通过稳定来源/状态集合、不可变快照、显式门禁、异常转阻塞、原子文件写入和有限方法拆分审查；未保存隐藏思维链。
- `backend-reliability-guidelines`：通过输入 schema 校验、复检异常隔离、阻塞优先级、最大轮次和可回放文件引用审查。
- `logging-boundaries`：无生产日志新增；Worker 只落结构化输入引用、结论、简短理由和证据路径，不写秘密或隐藏推理。
- `rest-api-documentation`：本任务新增本地 Worker 编排模块，不新增外部 REST API；门禁不适用。
- `frontend-interaction-guidelines`：无 UI 变更，门禁不适用。
- `project-hygiene`：PRD、快照、任务和 handoff 写入项目 `.product/runs` 事实源；运行缓存仍与事实文件分离。

### 验证证据

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (18 passed, 0 failed)
awk line-length check                                               PASS
git diff --check                                                    PASS
```

### 审计结论

Task 3.1 已实现主 Worker 到双复检再到开发交接的可回放门禁；复检上下文互不可见，任何非双 PASS 结果都不会进入 `PRD_VERIFIED` 或 `DEVELOPMENT_READY`。

## 任务 3.2 错误与知识归属审计

### 边界与执行方式

- 边界：只实现错误/近失误事件采集、unknown 初始状态、后台分类建议、人工归属覆盖、common/project/hybrid 文件边界、公共晋升门禁和有限知识快照；不实现知识管理 UI、远程调度或真实部署。
- 执行方式：记录了直接执行回退。事件事实、分类优先级、公共晋升和快照预算共享同一治理协议，拆分并行会增加归属与存储边界漂移。

### TDD 证据

- RED：新增知识治理测试时，5 个测试因 `knowledge-governance.mjs` 缺失失败，既有 18 个测试保持通过。
- GREEN：实现并补强分类异常、人工历史和未脱敏候选隔离后，同一命令通过 23 个测试，覆盖 unknown/pending、异步建议、project/common/hybrid、excluded 和快照预算。

### 能力核对

- [x] 错误与 near miss 立即写入项目事件事实源，保留 run、功能、验收和证据引用。
- [x] 新事件固定为 `scope=unknown`、`classificationStatus=pending`；分类 Worker 异步写建议，失败转换为 `failed/unknown`，不阻塞主流程。
- [x] 人工决策覆盖自动建议，保存版本、操作者、原因和审计历史；excluded/deprecated 不物理删除原始证据。
- [x] project 写入项目 lessons，hybrid 额外写项目 adapter；common 候选先留在项目，只有晋升后才写共享 Guardrail，避免未脱敏事实污染公共库。
- [x] 公共晋升要求脱敏、可移植、独立复现或规范依据及两名独立复检人。
- [x] lesson snapshot 按预算截断，只返回有限摘要和证据引用；候选与排除项不进入 Worker 快照。

### 领域规范核对

- `code-review-spec`：通过 unknown 初始值、人工优先级、版本化审计、稳定错误码、原始事件不覆盖和公共晋升条件审查。
- `backend-reliability-guidelines`：通过异步分类、失败降级、原子写入、目录边界、排除保留和有限读取审查。
- `logging-boundaries`：没有新增生产日志；事件只保存可审计引用，不保存隐藏思维链、秘密或完整敏感日志。
- `rest-api-documentation`：本任务新增本地知识模块，不新增外部 REST API；门禁不适用。
- `frontend-interaction-guidelines`：无 UI 变更，门禁不适用。
- `project-hygiene`：项目知识继续写入 `.product/knowledge`，共享根目录仅接收通过公共晋升的 Guardrail；运行缓存与知识事实分离。

### 验证证据

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (23 passed, 0 failed)
awk line-length check                                               PASS
git diff --check                                                    PASS
```

### 审计结论

Task 3.2 已实现从错误采集到人工归属和有限知识读取的闭环；自动分类只提出建议，公共知识不会因单个项目事件直接发布。

## 任务 3.3 知识管理 API/UI 审计

### 边界与执行方式

- 边界：只实现本地 loopback 控制平面的知识列表、人工编辑、排除、恢复、公共发布 API、EJS 风格服务端模板、CSS 和浏览器渐进增强；不实现远程登录、云端协作或外部部署。
- 执行方式：记录了直接执行回退。API、模板、静态资源和治理门禁共享同一数据契约，拆分并行会造成 UI 与后端字段不一致。

### TDD/浏览器证据

- RED：新增 API/UI 测试时，3 个场景因首页和 `/api/knowledge` 路由不存在返回 `404`，既有 23 个测试保持通过。
- GREEN：接入知识 API、EJS 风格首屏渲染、浏览器增强脚本后，控制平面测试通过 26 个测试。
- 浏览器核验：本地 `127.0.0.1` 临时服务加载“知识归属管理”页面，显示筛选器、记录卡片、编辑表单和“排除（保留证据）”；通过浏览器实际选择 `项目`、填写解决方案/操作者/原因并保存，页面刷新为“项目”归属。

### 能力核对

- [x] `/` 使用 `ui/index.ejs` 服务端渲染首屏，不再以独立 `index.html` 作为页面入口。
- [x] 模板渲染器只支持转义插值和安全 HTML 插值，不执行任意模板代码。
- [x] API 支持知识列表、人工编辑、排除/恢复和公共 Guardrail 发布，并使用稳定错误码和 64 KiB 请求体上限。
- [x] 人工编辑必须提供操作者和原因；公共发布必须再次满足脱敏、可移植、复现/依据和两名独立复检人。
- [x] 控制台支持 unknown/project/common/hybrid 筛选、严重级别、解决方案、排除和公共发布操作，错误会回显在状态区。
- [x] 排除只写 `lifecycle=excluded` 和审计版本，原始事件、证据和审计链保留，后续快照不读取排除项。

### 领域规范核对

- `code-review-spec`：通过安全模板插值、字段白名单、稳定错误映射、请求体上限、无堆栈响应和人工审计字段审查。
- `backend-reliability-guidelines`：通过 loopback 边界、请求体限制、可恢复状态、公共晋升复用和稳定 4xx/422 错误审查。
- `frontend-interaction-guidelines`：通过清晰状态徽章、筛选器、表单标签、移动端媒体查询、错误状态和排除保留证据文案审查。
- `logging-boundaries`：没有新增生产日志；API 不回传堆栈，模板不输出秘密。
- `rest-api-documentation`：API 只监听本机回环地址，契约已记录在 README；外部 REST 文档门禁不适用。
- `project-hygiene`：主页面使用 `.ejs` 模板和现有 CSS/JS 资源，不新增构建工具或 node_modules。

### 验证证据

```text
npm test --prefix product-delivery-workflow/references/control-plane  PASS (26 passed, 0 failed)
node --check ui/app.js                                             PASS
node --check src/ui-handler.mjs                                    PASS
awk line-length check                                               PASS
git diff --check                                                    PASS
browser local UI load/edit                                         PASS
```

### 审计结论

Task 3.3 已把人工知识归属落到 EJS 风格服务端模板和 loopback API；人工覆盖、排除、公共发布都经过后端治理门禁，控制台不能绕过证据和审计要求。
