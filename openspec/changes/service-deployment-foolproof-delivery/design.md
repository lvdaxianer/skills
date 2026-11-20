# Design

## Context

现有 `service-deploy` skill 已覆盖 immutable release、外置配置、Docker 镜像与持久化、健康门禁、失败回滚和 retention，但交付入口仍以有经验的运维人员为假设。新增能力必须位于这些安全门禁之前，负责把研发产物转成可验证的交付包，并把模式选择、客户目录确认和现场操作翻译成实施人员能执行的步骤。

本设计遵循 proposal 和三个 spec delta：部署包是版本化的输入；部署方式决定检查和材料；Kubernetes 只接入已有集群；所有写入前必须通过 preflight 和客户目录确认；日常操作使用包内稳定入口。

## Goals / Non-Goals

**Goals:**

- 用一个统一包承载 VM、Docker 和已有 Kubernetes 三种模式，同时保留模式边界和独立材料。
- 让实施人员只需要执行少量稳定入口，并通过中文提示完成选择、配置、安装、重启、验收、回滚和卸载。
- 让包版本、应用版本、源码提交、物理部署目录、运行目标和发布 ID 可互相追溯。
- 让包构建方在交付前验证依赖闭包、敏感内容、归档安全、支持矩阵和失败恢复证据。
- 让部署手册成为与包版本绑定的现场操作契约，而不是可选的 README。

**Non-Goals:**

- 不实现一个通用的操作系统安装器，也不承诺支持未在包 manifest 中声明的系统或架构。
- 不自动创建 Kubernetes 集群，不把 Kubernetes 缺失转换为 VM 或 Docker 部署。
- 不把生产密码、私钥、Token 或现场真实连接信息放入包或手册。
- 不改变现有 release record、Docker persistence、Dockerfile、健康检查和 rollback state machine 的安全语义。

## Decisions

### 1. 使用统一外层包加模式专属 payload

包根目录提供统一的 `deploy.sh`、`service.sh`、`doctor.sh`、`rollback.sh` 和 `uninstall.sh`，`modes/vm`、`modes/docker` 和 `modes/kubernetes` 各自保存所需材料。入口先读取 `package-manifest.json`，再根据明确的模式选择只加载对应 payload。

这样实施人员只接触一个入口，同时可以避免把 Docker 的材料误用于 host-process，或把 Kubernetes manifest 当成本机命令执行。单独拆成三个完全不同的包会造成客户拿错包时难以识别；统一包的代价是包体积和构建矩阵更大，由 manifest 的支持矩阵和模式校验承担边界。

### 2. 用 manifest 作为包身份和依赖闭包的单一来源

`package-manifest.json` 记录包版本、应用版本、构建时间、源码提交、支持系统/架构、支持模式、离线能力、权限、端口、目录字段、运行时、模式 payload 清单、文件 SHA-256、迁移提示和文档版本。包文件名和手册首页重复展示人类可读身份，安装器以 manifest 和 SHA-256 为机器校验依据。

不使用 `latest` 或文件修改时间推断版本；同一包版本出现不同内容时以 SHA-256 不一致拒绝复用。服务器产生的 release ID 仍由现有 v2 序列规则分配，manifest 的 package version 只作为其来源输入。

### 3. 把模式选择和 preflight 放在所有写入动作之前

入口先展示模式选项，然后执行只读检测矩阵：

- host-process：系统、架构、权限、磁盘、端口、systemd/手动生命周期和包内运行时。
- Docker：daemon、Compose/CLI、架构、磁盘、端口、挂载权限、镜像归档/Registry 和持久化目录。
- Kubernetes：kubectl、kubeconfig、context、集群连通性、Namespace 权限、节点架构、存储和服务暴露能力。

检测结果必须区分必需项和提示项。必需项失败时只输出修复清单和诊断包路径，保持 current/现有容器不变；只有全部通过才进入客户目录确认、配置向导和安装预览。Kubernetes 缺少已有集群时固定停止，不调用集群安装器。

### 4. 用客户确认表锁定物理部署边界

安装器将部署根目录、配置、数据、日志和备份目录作为显式输入。部署根目录是最终 `service_root`，禁止自动追加 `service_name`；`/opt` 只能作为建议值，未客户确认时只能 dry-run。入口在写入前展示物理路径、所有者、权限、空间、端口和数据保留策略，要求输入固定确认词，并把确认结果写入 release record/交接记录。

这保留了现有 v2 的路径边界，同时解决实施现场最常见的“研发默认目录与客户目录不一致”问题。普通升级不能静默改变部署目录；迁移必须走单独的迁移/备份流程。

### 5. 用稳定运维入口隐藏底层生命周期差异

`service.sh` 提供菜单和稳定子命令，内部根据已记录的目标选择 systemd、Docker Compose/CLI 或 Kubernetes workload 操作，并始终使用精确 identity。每次启动、重启、升级或回滚都重新执行现有 status、readiness、liveness、启动日志、依赖和业务 smoke 检查。

提供交互菜单是为了降低认知成本；同时保留可复制子命令，便于自动化和故障交接。入口不得使用 `killall`、宽泛容器名或未绑定 context 的 kubectl 操作。

### 6. 手册采用“快速开始 + 模式章节 + 运维章节 + 验收单”

手册首页只解决首次部署和常用操作；后续章节分别说明三种模式，再统一说明目录确认、配置字段、验收、升级、回滚、卸载和故障交接。每一步采用“目的 / 操作 / 正常现象 / 异常处理 / 完成标志”五段格式，命令和期望输出必须来自包内真实入口与 manifest，禁止让实施人员手工编辑复杂 YAML、JSON 或 env 文件。

文档生成/校验阶段要求手册中的包版本与 manifest 一致、入口路径存在、交付清单完整，并检查 Kubernetes 章节明确“只支持已有集群”。

### 7. 将包契约测试和 skill eval 分开

`package-contract-test.sh` 负责确定性检查真实交付包的清单、文件、校验和、路径、敏感文件和入口；skill eval 负责检查模型在用户只说“帮我部署”或提供不完整现场条件时，是否先询问模式、目录和环境，并在 Kubernetes 缺失或端口冲突时停止。

两者分开可以避免用模型输出替代文件安全校验，也能验证 skill 是否真正把规范传递到不同部署请求中。

## Risks / Trade-offs

- [统一包体积变大] → manifest 明确每个模式的 payload，构建方可按客户支持矩阵生成精简包；标准仍保留统一外层入口。
- [零基础流程可能掩盖高级诊断细节] → 提供 `doctor.sh` 和诊断包，常规操作隐藏底层命令，失败时保留可交给研发的证据。
- [不同 Linux 发行版的运行时安装差异] → 包声明支持矩阵；未验证系统直接停止，不通过模糊兼容继续安装。
- [客户目录确认错误会导致数据写错位置] → 安装预览显示物理绝对路径，要求固定确认词，且记录目录确认；普通升级禁止静默换根目录。
- [Kubernetes 现场材料不完整] → 仅支持已有集群，preflight 必须验证 context、Namespace、权限、节点/架构和存储，失败时不创建任何应用资源。
- [入口脚本成为新的高权限边界] → 入口只调用已声明的 exact identity，禁止宽泛停止、任意 host path 和 secrets 输出，并继续受现有 release/health/rollback 门禁约束。

## Migration Plan

1. 在 skill 中加入模式选择、preflight、客户目录确认、包版本和手册要求，并新增引用文档和 schema。
2. 为现有服务交付包补齐 manifest、版本命名、统一入口和模式 payload；旧的无版本或 latest-only 包只能作为 dry-run 输入并被拒绝安装。
3. 在干净的 VM/Docker 环境和已有 Kubernetes 集群上分别执行 doctor、首次部署、重启、验收、升级和回滚测试。
4. 验证通过后再将包交给客户；服务器上按现有 v2 规则生成新的 release ID，旧版本继续作为 previous/rollback target 保护。
5. 若新包失败，保留失败包和诊断记录，按现有 rollback state machine 恢复 previous release；不删除数据目录，不改变客户已确认的根目录。

## Open Questions

无。支持的具体 OS、架构、Docker/Compose 版本和 Kubernetes 版本由每个部署包的 `package-manifest.json` 声明，不改变本次设计。
