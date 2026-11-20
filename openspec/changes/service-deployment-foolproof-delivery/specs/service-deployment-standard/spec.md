# Spec Delta

## MODIFIED Requirements

### Requirement: Deployment root and layout are configurable

部署流程 SHALL 接受绝对 `deploy_root` 和稳定的 `service_name`；`deploy_root` 是最终物理 `service_root`，不得再拼接 `service_name`。`/opt` 只能作为待客户确认的建议值，未确认前 MUST 只生成 dry-run，不得写入默认目录。所有 release、current、conf、data、logs、run 和 record 路径 MUST 解析到已确认的 service root 之下。

#### Scenario: Use a custom deployment root
- **WHEN** 客户确认 `/uinnova/deploy/service-root` 作为部署根目录
- **THEN** 所有 host-process 和 Docker 的 release、current、conf、data、logs、run 和 record 路径均位于该目录下，流程不得写入 `/opt` 或自动追加服务名

#### Scenario: Use the default deployment root
- **WHEN** 用户只提供服务名和发布包而没有客户确认的部署根目录
- **THEN** 流程 MAY 展示 `/opt` 作为建议值，但 MUST 保持 dry-run 并请求确认，不得创建目录、停止服务或切换 current

#### Scenario: Reject path escape
- **WHEN** 解析后的目标路径不在已确认的 service root 下，或 Docker mount 的宿主机路径越界
- **THEN** 流程 MUST 在任何停止、容器创建或写入动作前失败

## ADDED Requirements

### Requirement: Deployment mode is selected before preflight

部署流程 MUST 在任何写入或停止动作前要求实施人员明确选择 `host-process`、`docker-container` 或已有 Kubernetes 集群部署，并只执行所选模式的环境检测、材料校验和生命周期操作。

#### Scenario: Select host-process mode
- **WHEN** 实施人员选择本机直接运行
- **THEN** 流程 MUST 检查支持的系统、架构、权限、磁盘、端口、生命周期能力和包内运行时，并不得读取 Docker 或 Kubernetes 材料作为替代

#### Scenario: Select Docker mode
- **WHEN** 实施人员选择 Docker
- **THEN** 流程 MUST 检查 Docker daemon、Compose/CLI、架构、存储、端口、挂载权限和镜像传输材料，并在不满足时停止

#### Scenario: Select Kubernetes mode without a usable cluster
- **WHEN** 实施人员选择 Kubernetes 且 `kubectl`、kubeconfig、集群连接、目标命名空间或必要权限任一项不满足
- **THEN** 流程 MUST 立即停止，不得安装 Kubernetes、创建本地替代运行时或继续写入应用资源

### Requirement: Environment preflight is a hard gate

安装器 MUST 提供只读的 `doctor` 或等价环境检测，并在安装、升级、容器替换、current 切换或服务停止前展示通过项、失败项、修复建议和诊断证据位置；任何必需项失败都 MUST 保持原运行版本不变。

#### Scenario: Required preflight item fails
- **WHEN** 权限、磁盘、端口、运行时、依赖、持久化目录或集群检查不通过
- **THEN** 流程 MUST 停止并要求补齐现场条件，不得进入安装或升级阶段

#### Scenario: Preflight passes
- **WHEN** 所选模式的所有必需检测、包校验和客户目录确认均通过
- **THEN** 流程 MAY 展示安装预览并等待实施人员的明确确认

### Requirement: Operator lifecycle actions use package entrypoints

面向实施人员的日常操作 MUST 通过部署包提供的稳定入口完成部署、启动、停止、重启、状态、日志、诊断、回滚和卸载；入口 MUST 使用当前记录的精确 release、容器或 Kubernetes workload identity，并执行相应健康检查。

#### Scenario: Restart the active release
- **WHEN** 实施人员执行重启入口
- **THEN** 入口 MUST 重启当前记录的目标并重新执行 status、readiness、liveness 和声明的业务 smoke check

#### Scenario: Ambiguous lifecycle target
- **WHEN** 找不到唯一 current release、容器、Compose project 或 Kubernetes workload
- **THEN** 入口 MUST 停止并报告需要人工 reconcile 的证据，不得使用宽泛匹配或批量停止命令
