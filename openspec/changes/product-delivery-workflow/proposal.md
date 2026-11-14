# 提案

## 为什么需要

现有 `development-workflow` 负责工程实现、测试、审计和提交，但缺少产品需求入口、需求分流、PRD 自动复检、验证证据和经验回流。简单文案或 Bug 不应被迫经过完整 PRD，而真正的功能需求又需要可追踪地从自然语言进入开发闭环。

现在需要增加一个中文总控 Skill，把产品需求、工程 Skill、验证证据、公共/项目知识和可选部署连接起来，同时保留现有领域 Skill 的权威边界。

## 变更内容

- 新增中文主入口 `product-delivery-workflow`，根据任务复杂度选择轻量、Bug、内容或完整产品流程。
- 对完整功能需求增加主 Worker 生成 PRD、两个独立上下文复检 Worker 双通过的硬门禁。
- 在主 Skill 的 `references/control-plane/` 下提供本地 Node 控制服务，用于 Worker 调度、状态、消息账本、知识归属和可视化编辑。
- 将共通知识与项目知识分目录保存，支持异步错误归类、人工覆盖、版本化 Guardrail 和审计。
- 为每个功能点建立验证契约和 evidence bundle；没有可观察证据时不得标记成功。
- 在全部开发、测试和审计完成后才询问是否部署；用户明确选择部署后才交给 `service-deployment`。
- 保持 `development-workflow`、`service-deployment` 及后端、前端、日志、API 文档等领域 Skill 的专业规则不被总控 Skill 复制或削弱。

## 能力范围

### 新增能力

- `product-intake-routing`: 根据任务类型、范围和风险选择 quick、content、bugfix、feature 或 high-risk 流程。
- `product-prd-validation`: 生成可追踪 PRD，并通过两个独立上下文复检 Worker 形成双 PASS 门禁。
- `product-control-plane`: 提供本地 Node 控制服务、Worker 调度、消息账本、状态恢复和知识库可视化管理。
- `product-knowledge-governance`: 采集错误与近失误，异步分类 common/project/hybrid，支持人工覆盖和 Guardrail 晋升。
- `product-verification-evidence`: 按验收标准执行验证，收集测试、API、浏览器、部署和回滚证据，并生成可审计报告。

### 修改能力

无。本变更通过适配器调用现有开发和部署 Skill，不修改已有 capability 的需求契约。

## 影响范围

- 新增 `product-delivery-workflow/` Skill 目录及中文文档、协议、Node 控制服务和测试。
- 新增本地 Node 运行时依赖与项目级 `.product/` 数据目录约定。
- 新增与 `development-workflow`、`service-deployment` 的适配协议，但不执行真实部署。
- 需要为 Node 服务、文件持久化、Worker 隔离、验证证据和 UI 交互增加测试。
