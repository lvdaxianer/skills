# Proposal

## Why

现有服务部署规范已覆盖 releases/current、外置配置、原子切换、健康检查、回滚和五版本保留，但在一次 SceneForge Linux 部署中暴露出路径解析、发布序列并发、安全归档、环境加载、后台进程识别和失败恢复方面的执行歧义。需要把这些隐含约定升级为可复制、可验证、可审计的 v2 契约。

## What Changes

- 强制并校验统一 release ID 格式、版本来源、服务级永不复用序列号、锁和并发分配规则。
- 要求生命周期脚本通过物理路径解析 current/release/service-root，并增加 current 路径 contract test。
- 增加归档 SHA-256、tarbomb/path traversal、权限、必需文件和配置边界验证。
- 明确 systemd EnvironmentFile、受限 Shell loader 和专用 env parser 的边界，禁止不受控 source。
- 为 manual-background 定义进程用户、完整 cmdline、目标 artifact、启动时间、端口归属和清理规则。
- 增加数据库迁移门禁、expand/contract 兼容策略和不可逆迁移审批要求。
- 将 status/readiness/liveness、依赖、代理、真实业务 smoke test 和实际加载 artifact 纳入健康验收。
- 将发布流程定义为 prepared、validated、stopped、switched、started、health-verified、recorded、rolled-back、failed 状态机，并支持中断恢复。
- 提供 retention preview/apply 执行器和统一 release record JSON Schema。
- 增加 backend/frontend/nginx/database migration 多组件 stack 发布顺序、绑定和回滚规则。
- 增加 manual-background 恢复、systemd 资源配置、日志轮转、磁盘阈值、最小权限和 root 风险说明。

## Capabilities

### New Capabilities

- `service-deployment-v2-hardening`: 可验证的发布安全、生命周期、健康、回滚、保留和多组件部署契约。

### Modified Capabilities

- `service-deployment-standard`: 修改发布命名、配置加载、生命周期、归档校验、健康验证、回滚、retention 和审计记录要求。

## Impact

- 修改 `service-deploy/SKILL.md`、其全部 references 和 evals，并同步到本地注册目录。
- 新增 Skill 内部的 release record JSON Schema、current 路径 contract test 和 retention preview/apply 脚本。
- 修改 `openspec/specs/service-deployment-standard/spec.md`，不修改任何业务项目代码或服务器状态。
- 验证仅使用本地临时目录、静态检查和脚本自测；不连接服务器，不读取环境变量值。
