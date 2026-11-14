# 设计

## 上下文

本变更在现有 `development-workflow` 之上增加产品到交付的总控层。现有仓库以 Markdown、YAML、JSONL 和 OpenSpec 作为可提交事实源，已有开发、部署、可靠性、前端交互、日志和 API 文档等领域 Skill。总控层必须复用这些权威规则，不能在自身文档中复制一套相互冲突的工程标准。

## 目标 / 非目标

**目标：**

- 用中文 Skill 处理从需求入口到验证和部署决策的完整编排。
- 按任务档位决定是否生成完整 PRD。
- 通过主 Worker 加两个独立复检 Worker 建立 PRD 双 PASS 门禁。
- 提供放在 Skill `references/control-plane/` 下的本地 Node 控制平面。
- 使用项目文件保存需求、消息、知识、证据和审计，服务重启后可恢复。
- 让公共知识和项目知识分层，并支持后台归类、人工覆盖和有限快照读取。
- 用证据包阻止没有真实可观察证据的成功结论。
- 在最终阶段询问部署，明确授权后才调用 `service-deployment`。

**非目标：**

- 不替换现有 `development-workflow` 的 TDD、审计、提交和分支规则。
- 不替换 `service-deployment` 的发布、健康检查、回滚和保留策略。
- 不建设云端需求管理平台、多人在线协作平台或生产级远程控制面。
- 不把模型隐藏思维链写入日志；只保存可审计的输入引用、输出、决策理由和证据。
- 不在本变更中执行真实服务器部署。

## 决策

### 决策一：一个中文主 Skill，领域能力通过适配器调用

主入口命名为 `product-delivery-workflow`。Intake Router、PRD 编排、控制平面、知识治理和验证证据作为同一 Skill 包内的模块；`development-workflow`、`service-deployment` 和领域 Skill 保持独立。

选择该方案是为了让用户只有一个入口，同时保持工程规范的单一权威来源。将所有规则复制进一个巨型 Skill 会导致规则漂移，因此总控只负责决策和调度。

### 决策二：Node 服务放在 Skill references，运行数据放在项目

Node 控制服务源码、UI 和运行契约放在 `references/control-plane/`。每次总控运行先检查 `127.0.0.1:<port>/healthz` 和 `/readyz`，验证项目根目录与服务版本；未运行时启动，端口被其他实例占用时不杀进程。

权威数据写入当前项目的 `.product/`，公共知识根目录由配置提供。Node 服务可建立 SQLite 或其他索引缓存，但缓存必须可从 Markdown、YAML、JSONL 和证据文件重建。

### 决策三：交互账本采用追加式消息和目标路由

每个 run 创建 `interaction.jsonl`。消息包含 `from`、`to`、`kind`、`action`、`status`、`verdict`、`prd_version`、`correlation_id` 和输入/输出引用。只有目标 Worker 的 `action=execute` 消息进入执行队列，`inform` 只记录。

两个 PRD 复检 Worker 通过过滤视图获得各自输入，不能读取彼此的评审输出；主 Worker 仅在双方完成后收到结构化结果。每轮 PRD 使用新的版本和新的上下文快照。

### 决策四：事实源分层，公共知识需要晋升

原始错误、日志、截图和 trace 先写项目 `.product/knowledge/`。后台 Classification Worker 只提出 `common/project/hybrid` 建议。公共规则只有在脱敏、可移植、可执行且通过独立复检后，才写入共享知识库。人工覆盖优先于自动建议，排除使用追加式状态而非物理删除。

### 决策五：验证证据与状态强绑定

每个验收标准都生成验证契约。验证 Worker 记录命令、断言、API 摘要、浏览器操作、截图、trace、console/network 摘要、下载 checksum、commit/release 和证据 hash。`VERIFIED` 和 `DEPLOYED` 都必须通过证据完整性检查。

### 决策六：部署是最终显式授权动作

全部任务、验证和最终审计完成后，状态进入 `DEPLOYMENT_DECISION_REQUIRED`。用户选择不部署时进入 `VERIFIED_NOT_DEPLOYED`；用户明确授权并提供必需参数时，通过适配器调用 `service-deployment`。部署适配器不推断 `DEPLOY_ROOT`、健康命令、迁移安全性或秘密。

## 风险 / 权衡

- **[风险] 本地 Node 服务端口冲突或进程残留** → 只监听 loopback，校验项目绑定，不终止未知进程，记录 PID/端口/版本并提供安全换端口路径。
- **[风险] Worker 上下文互相污染** → 每轮生成不可变输入快照，复检结果在屏障关闭前隔离，消息账本只提供目标路由视图。
- **[风险] 项目事故污染公共知识** → 默认项目级，公共晋升需要可移植性、脱敏、复现/规范依据和独立复检。
- **[风险] 证据文件使上下文或仓库膨胀** → 原始证据只存引用和 hash，Worker 只加载有限 lesson snapshot，完整 trace 按需读取。
- **[风险] 自动模式绕过工程门禁** → 自动入口只能消费 `DEVELOPMENT_READY` handoff，保留 TDD、领域审计、提交和合并规则。
- **[风险] 部署凭证泄漏或误部署** → 不把秘密写入仓库，部署只保存 Secret Manager 引用；真实部署必须有当前请求中的明确授权。
- **[权衡] 文件事实源比数据库查询慢** → 使用可重建索引加文件锁和原子追加，宁可重建缓存也不引入第二个权威数据源。

## 迁移计划

1. 新增 Skill 和 `.product/` 约定，不修改已有项目的业务代码。
2. 先提供控制平面健康检查、文件持久化和 UI 归属编辑，再接入 Worker 调度。
3. 接入 `development-workflow` 时使用显式 handoff 和自动入口协议；不改变原有领域规范。
4. 接入 `service-deployment` 时只实现交接和 dry-run 适配，真实部署仍由用户最后授权。
5. 若控制平面不可用，总控流程停止并保存可诊断错误；不得静默回退到不可审计的内存状态。

## 开放问题

- Worker 的实际调用适配器需要根据运行环境选择现有多 Agent 接口；协议先保持与具体运行时解耦。
- 共享知识库的物理位置通过配置提供，首版支持本地目录或独立 Git 仓库，不绑定 SaaS。
