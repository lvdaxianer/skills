# 宿主持久化与镜像默认资源覆盖硬门禁设计

## 目标

为 Docker 与 Kubernetes 部署建立统一的资源持久化确认门禁：前端、后端、`lib`、`conf`、数据库、MinIO/对象存储以及其他不可重建资源必须在部署前逐项确认持久化位置、覆盖策略、备份和恢复方法。镜像可以携带完整默认资源，但容器可写层不能成为唯一来源；宿主机路径或 Kubernetes PVC/PV 是可审计的持久化输入。

## 核心规则

1. 部署包按模式提供 `persistence_resources` 资源目录，默认列出 `frontend`、`backend`、`lib`、`conf`、`database`、`object-storage` 和 `other-non-rebuildable`，每项默认建议持久化。
2. 实施人员不能跳过确认。客户必须为每一项选择 `host-persistent`、`cluster-persistent` 或 `external-managed`，并填写真实路径/声明、容器路径、读写属性、备份和恢复方法。未确认只允许 dry-run。
3. Docker 使用客户确认的绝对宿主机路径，并在渲染 Compose 前解析、检查权限、磁盘空间和目录边界。Kubernetes 只使用已有集群中的 PVC/PV；没有可绑定 PVC/PV 时立即停止，不安装集群、不使用 `hostPath`、不回退 Docker/物理机。
4. 前端、后端、`lib`、`conf` 默认留在镜像中作为兜底。宿主机/PVC 覆盖目录可以为空；有经过清单和 SHA-256 校验的覆盖文件时，按声明的独立 extension point 优先加载。禁止把覆盖目录挂到 `/app/bin`、`/app/lib`、`/app/html`、entrypoint 或整个 `/app` 上。
5. 数据库、MinIO/对象存储、索引及其他不可重建数据必须有外部持久化来源。若服务将它们作为同一 Docker/Kubernetes 交付物运行，必须分别声明宿主机目录或 PVC/PV；若由客户外部托管，必须记录外部系统、责任方和恢复证据。

## 资源确认模型

每个资源条目包含：

- `resource_class`：`frontend`、`backend`、`lib`、`conf`、`database`、`object-storage`、`data`、`logs`、`index` 或 `extension`。
- `default_in_image`：镜像是否提供可回退的默认资源。
- `persistence_decision`：`host-persistent`、`cluster-persistent` 或 `external-managed`。
- `host_path` / `pvc`：按部署模式二选一，不能使用未解析的相对路径。
- `container_path`、`read_only`、`override_allowed`、`backup`、`restore_procedure`。
- `confirmation`：客户确认人、确认时间和确认记录路径；缺失即不通过。

代码和配置资源通常是只读覆盖；数据资源通常可写但必须独立挂载。空的宿主机/PVC 覆盖目录表示使用镜像默认值，不表示放弃持久化契约。

## 部署流程

```text
读取包资源目录
  -> 生成默认持久化确认表
  -> 客户逐项确认路径/PVC/外部托管
  -> 只读检查路径、PVC、权限、空间、备份与恢复证据
  -> 校验镜像默认资源、覆盖清单和挂载边界
  -> 渲染 Docker Compose 或 Kubernetes 清单（物理路径/PVC 名称）
  -> 启动精确 release
  -> 验证有效加载资源、健康、依赖、冒烟和数据可恢复性
```

任何必需资源未确认、路径/PVC 不存在、Kubernetes 存储不可绑定、挂载覆盖镜像根目录或备份恢复证据缺失，都在停止当前服务或创建新容器/Pod 之前结束为 dry-run/失败。

## 失败与恢复

- 客户拒绝持久化不可重建资源：停止部署并指出资源、数据丢失风险和所需外部托管方案。
- Docker 宿主机目录不满足权限/空间/边界：不创建容器，保留诊断结果。
- Kubernetes 没有现成 PVC/PV 或 PVC 未绑定：不创建 Deployment/StatefulSet，要求集群管理员准备存储。
- 覆盖资源健康或有效加载检查失败：停止新 release，恢复记录的上一 release 及其持久化清单；不能猜第三个版本。
- 删除/重建容器或 Pod 后，必须从相同持久化清单恢复并验证前端、后端、库、配置和数据资源。

## 验证范围

- JSON Schema 拒绝未确认、无持久化目标、Docker 使用相对路径、Kubernetes 使用 `hostPath` 或缺失备份恢复字段。
- Compose 模板展示前端、后端、`lib`、`conf` 的独立只读 extension point，以及数据库/对象存储数据的独立可写挂载。
- Kubernetes 参考文档明确 PVC/PV、StorageClass、绑定状态和无降级门禁。
- `doctor.sh`/合同测试能报告默认资源确认表、实际挂载目标和停止原因。
