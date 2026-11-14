# Tasks

## 1. 总控 Skill 契约与入口分流

- [x] 1.1 创建中文 `product-delivery-workflow/SKILL.md`，定义入口、档位路由、状态机、领域 Skill 调度边界和控制平面预检；验证 Skill frontmatter、必需引用和中文流程章节均存在。
- [x] 1.2 创建 `references/intake-routing.md`、`references/worker-protocol.md` 和 `references/knowledge-model.md`，定义 quick/content/bugfix/feature/high-risk、三 Worker 隔离、消息字段和公共/项目知识目录；验证文档中的状态与 OpenSpec 规格一致。

## 2. Node 控制平面与持久化

- [x] 2.1 在 `product-delivery-workflow/references/control-plane/` 创建本地 Node 服务包和 `/healthz`、`/readyz`、项目绑定检查；验证 Node 单元测试覆盖健康、就绪和错误配置。
- [x] 2.2 实现 `ensure-control-plane` 启动/复用脚本和运行元数据，保证端口冲突不杀未知进程；验证服务未监听时可启动、匹配实例可复用、错误绑定会阻断。
- [x] 2.3 实现文件事实源、追加式 `interaction.jsonl`、run 恢复和可重建索引；验证服务重启后能恢复 run、未消费消息和审计记录。

## 3. PRD Worker 编排与知识管理

- [x] 3.1 实现主 Worker、产品复检 Worker 和研发复检 Worker 的独立输入快照、双通过屏障和 PRD 版本回路；验证任一 `revise/block` 都不会进入 `PRD_VERIFIED`。
- [x] 3.2 实现错误/近失误采集、fingerprint 聚合、后台分类建议和 common/project/hybrid 存储；验证新错误先为 `unknown`，分类失败不阻塞主流程。
- [x] 3.3 实现知识管理 API/UI 的归属编辑、Guardrail 发布、排除和审计版本；验证人工覆盖优先于自动建议，排除后不进入知识快照。

## 4. 验证证据与下游适配

- [x] 4.1 实现功能点验收契约和 verification bundle，支持命令、API 和浏览器证据引用；验证缺少必要证据时只能得到 `FAILED` 或 `INCONCLUSIVE`。
- [x] 4.2 实现 `development-workflow` handoff 适配和 `DEVELOPMENT_READY` 门禁；验证 PRD、任务、验收和假设不完整时不会发送自动开发请求。
- [ ] 4.3 实现可选 `service-deployment` 交接适配和最终部署询问；验证未得到明确授权时不调用真实部署，只生成发布或 dry-run 信息。

## 5. 集成验证与中文使用文档

- [ ] 5.1 添加总控 Skill 启动、路由、Worker 隔离、知识归属、证据门禁和服务恢复的集成测试；验证测试覆盖所有新增 capability 的关键场景。
- [ ] 5.2 编写中文 README、配置示例、运行手册和故障排查说明；验证新用户可按文档启动 Node 服务并完成一次模拟 run。
- [ ] 5.3 执行完整 lint/test/build、OpenSpec 严格验证、计划一致性审计和领域规范检查；验证所有任务、规格、实现和证据保持一致。

## Workflow follow-up

- 完成每个任务的 RED/GREEN、领域 review、per-task audit、标记和原子提交后合并回 `master`。
- 所有任务完成后执行最终审计，并按 OpenSpec archive 流程归档变更。
