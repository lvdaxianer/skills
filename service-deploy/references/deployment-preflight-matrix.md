# Deployment Preflight Matrix

环境检测必须只读、先于任何停止或写入。检测结果分为 `通过`、`提示` 和 `不通过`；任何“不通过”的必需项都停止流程。

## 三层检查与统一门禁

一键部署必须按以下顺序执行：构包静态契约校验 → `./doctor.sh` 只读现场 preflight → `./deploy.sh` 变更前门禁。端口冲突、磁盘空间或 inode 不足、权限不足、运行身份不明、依赖/配置失败或回滚空间不足时只能输出 `dry-run`，不得停止服务、写入目录、创建容器/Pod 或切换 `current`。`deploy.sh` 必须校验报告绑定的 package SHA、部署方式、物理目录和有效期。

检查入口不得自动杀进程、改端口、清理磁盘、修复 owner/group、改防火墙或安装 Docker/Kubernetes；只输出不含秘密的身份摘要、实际值摘要、要求、修复建议和证据路径。

## 通用检测

| 检测项 | 通过条件 | 不通过处理 |
| --- | --- | --- |
| 包身份 | manifest、包版本、应用版本、源码提交号和 SHA-256 完整 | 停止，提示重新获取正式包 |
| 支持范围 | OS、架构和工具版本在 manifest 内 | 停止，不猜测兼容性 |
| 权限 | root/sudo 或声明的操作权限可用 | 停止，提示联系客户管理员 |
| 客户目录 | 根、配置、数据、日志、备份目录均已确认且为绝对路径 | 停止，不创建默认目录 |
| 磁盘空间/inode | 满足包大小、运行时、日志、数据、回滚和 retention 预留的字节与 inode | 停止，提示扩容或更换目录 |
| 端口冲突 | 必需端口空闲，或有 current release/精确容器/workload 身份证据 | 停止，列出非敏感占用者和端口 |
| 目录权限 | owner/group、模式和运行用户读写执行能力符合 manifest | 停止，提示管理员处理，不自动修复 |
| 运行身份 | 现有进程/容器/workload 可唯一绑定到记录的服务身份 | 停止，不使用宽泛 kill |
| 资源预留 | 内存、CPU、文件描述符、进程数和回滚空间满足 manifest | 停止，提示调整客户资源 |
| 包内容 | 必需入口、模式材料、权限和校验和通过 | 停止，保留包不解压到最终目录 |
| 资源确认表 | 前端、后端、`lib`、`conf`、数据库、MinIO/对象存储及其他不可重建资源逐项确认了持久化目标、备份和恢复责任 | 停止，只输出缺失项 dry-run |

## 本机直接运行

| 检测项 | 通过条件 | 不通过处理 |
| --- | --- | --- |
| 系统/架构 | 与 manifest 的 VM 支持矩阵一致 | 停止 |
| 运行时 | 宿主机版本满足，或包内运行时校验通过 | 停止，不要求实施人员联网安装 |
| 生命周期 | systemd unit 或声明的手动模式材料完整 | 停止，不猜停止命令 |
| 用户/目录 | 运行账号和目录权限符合声明 | 停止 |
| 健康/冒烟 | readiness、liveness、依赖和业务 smoke 命令存在 | 停止，不以进程存在代替验收 |

## Docker

| 检测项 | 通过条件 | 不通过处理 |
| --- | --- | --- |
| Docker daemon | 已安装、运行且版本受支持 | 若包含经过验证的离线安装材料，可进入安装 Docker；否则停止 |
| Compose/CLI | 版本和命令存在 | 停止 |
| 镜像材料 | Registry digest、local image ID 或 archive SHA-256 与 manifest 一致 | 停止，不使用 latest-only |
| 存储/端口 | Docker 磁盘、宿主目录、挂载权限和端口通过 | 停止 |
| 端口冲突 | 宿主端口映射无不明占用者，容器端口与 Compose identity 一致 | 停止，不删除其他容器 |
| 宿主机资源 | 每个 host-persistent 资源都有客户确认的绝对宿主机路径，目录边界、权限、空间、备份和恢复检查通过 | 停止，不创建容器 |
| 镜像默认资源 | 前端、后端、`lib`、`conf` 默认资源存在；空覆盖目录会回退镜像默认值 | 停止，不允许依赖容器 writable layer |
| 挂载清单 | 每个挂载有用途、只读、备份和恢复方法，且不覆盖 `/app`、`/app/bin`、`/app/lib`、`/app/html` 或 entrypoint | 停止，不创建匿名业务 volume |
| 启动行为 | 受限出网启动不下载/安装资源 | 停止，保留失败证据 |
| 容器身份 | project、container、release label、镜像 ID 和端口可唯一确定 | 停止，不使用宽泛删除 |

## Kubernetes（仅已有集群）

| 检测项 | 通过条件 | 不通过处理 |
| --- | --- | --- |
| kubectl | 命令存在且版本受支持 | 立即停止 |
| kubeconfig/context | 明确指向客户确认的集群 | 立即停止，不使用默认 context 猜测 |
| 集群连接 | API server 可访问且 TLS/认证通过 | 立即停止 |
| Namespace | 目标命名空间存在且已客户确认 | 立即停止 |
| 权限 | 能执行所需 get/apply/rollout/status 操作 | 立即停止 |
| 节点/架构 | 节点满足镜像架构和资源要求 | 立即停止 |
| 存储/暴露 | StorageClass、Ingress/LoadBalancer/NodePort 方案已确认 | 立即停止 |
| 端口冲突 | Service/Ingress/NodePort 暴露边界无冲突且 workload identity 可唯一确定 | 立即停止，不创建资源 |
| 镜像 | 集群可拉取或已完成离线导入 | 立即停止 |
| 持久化资源 | 每个 cluster-persistent 资源使用现有且可绑定/已绑定 PVC/PV，Namespace、StorageClass、容量、访问模式和备份恢复证据一致 | 立即停止 |
| 默认资源回退 | 前端、后端、`lib`、`conf` 的镜像默认资源存在；PVC 覆盖为空时可以使用镜像默认 | 立即停止 |
| 禁止降级 | manifest 不包含 `hostPath`、匿名卷或节点本地目录替代 PVC/PV | 立即停止 |

Kubernetes 缺失集群或没有可用 PVC/PV 时，不安装 k3s、不创建集群、不使用 `hostPath`、不回退到 Docker 或本机运行。安装器只输出：集群地址、kubeconfig、context、Namespace、权限、镜像来源、PVC/PV、StorageClass、备份恢复和服务暴露方案清单。

## 输出要求

每一项都要输出非敏感的结果：

```text
[通过] 部署包版本：2.4.1
[通过] 客户部署根目录：/data/company/app
[不通过] Docker daemon：未运行
处理建议：请让客户管理员启动 Docker，然后重新执行 ./doctor.sh
诊断包：/tmp/service-deploy-diagnostics-<timestamp>.tar.gz
```

输出必须包含 preflight 报告绑定、磁盘可用字节/inode、权限检查结果和 dry-run 原因，但不得输出密码、Token、私钥、完整连接串或 kubeconfig 内容。
