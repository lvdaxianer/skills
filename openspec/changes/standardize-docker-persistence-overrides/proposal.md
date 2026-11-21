# Proposal

## Why

当前 Docker 规范已经要求外部 `conf` 与 release-bound JAR/config override，但没有把前端、后端、`lib`、`conf`、数据库、MinIO/对象存储和其他不可重建资源统一纳入宿主持久化确认门禁；Kubernetes 也缺少 PVC/PV 的同等硬门禁。缺口会导致团队依赖容器可写层、使用未确认目录或直接用全局目录覆盖镜像路径，破坏发布审计、默认资源保留和回滚。

## What Changes

- 明确 Docker 镜像默认 `html`、`lib`、`conf` 与宿主机持久化/覆盖层的责任边界。
- 为 Docker 与 Kubernetes 建立默认资源确认表，默认列出前端、后端、`lib`、`conf`、数据库、MinIO/对象存储和其他不可重建资源；未逐项确认不得部署。
- Docker 必须使用客户确认的绝对宿主机路径；Kubernetes 必须使用已有 PVC/PV，缺失时立即停止，不使用 `hostPath` 或降级模式。
- 镜像继续保留默认资源，宿主机/PVC 覆盖目录可以为空；覆盖只能进入声明的独立 extension point，不能覆盖 `/app/bin`、`/app/lib`、`/app/html`、entrypoint 或整个 `/app`。
- 为 `html` 增加 release-bound 增量 override manifest、SHA-256、兼容性证据和加载路径约束。
- 允许未来资源通过显式 extension point 加入，但必须声明容器路径、合并方式、权限、备份与恢复策略。
- 扩展 Compose 模板、Dockerfile 标准、persistence/release manifest schema、部署 checklist 与安全校验。
- 禁止全局共享 override、覆盖 `/app/lib`、覆盖 entrypoint、挂载 host root/Docker socket 或以容器 writable layer 作为唯一持久化来源。
- 增量替换必须创建新的 release-bound unit，经过校验、精确容器重启/重建、健康 smoke 和失败回滚后才生效。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `service-deployment-docker-runtime`: 扩展宿主持久化分类、HTML/未来资源增量 override、manifest 与回滚要求。
- `service-deployment-dockerfile`: 扩展镜像目录、静态资源与独立 override extension point 的构建/启动契约。
- `service-deployment-persistence-gate`: 统一 Docker 宿主机路径与 Kubernetes PVC/PV 的资源确认、校验、挂载、备份和恢复硬门禁。

## Impact

- 修改 `service-deploy/SKILL.md` 与 `service-deploy/references/` 下 Docker/Kubernetes 部署、Dockerfile、Compose、持久化确认表、schema、security、checklist 和问题映射文档。
- 不修改业务源代码、不连接服务器、不执行真实 Docker 发布；验证以 Markdown/JSON/schema/模板一致性和静态审计为主。
- 完成后同步到 Codex、`.agents`、Claude 的本地 skill 目录，并记录各副本 checksum；不存在的本地 root 不自动创建。
