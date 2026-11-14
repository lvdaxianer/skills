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
