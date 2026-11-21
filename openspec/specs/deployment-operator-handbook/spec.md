# deployment-operator-handbook Specification

## Purpose

为没有 Linux、Docker 或 Kubernetes 基础的实施人员提供可逐步执行的部署手册。手册必须把部署、重启、验收、升级、回滚、卸载和故障交接写成可复制、可观察、可停止的现场操作流程。

## Requirements

### Requirement: Handbook starts with a zero-experience quick path

部署手册 MUST 在开头说明适用包版本、支持范围、权限、部署方式选择和预计耗时，并把首次部署、服务重启、查看状态、查看日志、诊断和回滚的包内入口列为复制即可执行的快速操作。

#### Scenario: First-time operator follows quick path
- **WHEN** 实施人员只阅读手册的快速开始章节
- **THEN** 手册 MUST 能让其找到部署包、选择正确模式、执行环境检测、启动一键部署并识别成功标志

#### Scenario: Operator needs a restart
- **WHEN** 实施人员需要重启服务
- **THEN** 手册 MUST 给出唯一推荐入口、预期输出、完成标志和失败后应提交的诊断信息

### Requirement: Every operation step has observable evidence

手册中的每个步骤 MUST 同时写出目的、操作、正常现象、异常处理和完成标志；不得使用“检查环境”“启动服务”“确认正常”等没有判断条件的模糊指令。

#### Scenario: Environment check fails
- **WHEN** `doctor` 入口报告必需项不通过
- **THEN** 手册 MUST 要求实施人员停止安装、保留诊断包并说明交接给谁，不得让其自行猜测修复命令

#### Scenario: Installation succeeds
- **WHEN** 一键部署完成并通过健康和业务检查
- **THEN** 手册 MUST 说明终端输出、访问地址、版本、部署目录和验收下一步

### Requirement: Handbook explains each deployment mode separately

手册 MUST 分别说明本机直接运行、Docker 和已有 Kubernetes 集群的前置条件、检测项、安装材料、成功判断、日常运维和失败处理；Kubernetes 章节 MUST 明确不负责创建集群。

#### Scenario: Docker deployment handbook
- **WHEN** 现场选择 Docker
- **THEN** 手册 MUST 说明 Docker 状态、离线镜像导入或仓库使用、挂载目录、端口、容器恢复、日志、升级和回滚

#### Scenario: Kubernetes is unavailable
- **WHEN** 现场没有可用 Kubernetes 集群
- **THEN** 手册 MUST 指示停止并列出需要平台管理员提供的集群、命名空间、权限、镜像和存储材料

### Requirement: Handbook records customer-confirmed directories

手册 MUST 提供客户部署目录确认表，至少包含部署根目录、配置、数据、日志和备份目录、运行账号、端口、磁盘空间和数据是否独立存储；安装前的预览必须与确认表一致。

#### Scenario: Directory preview differs from confirmation
- **WHEN** 安装器显示的物理目录与客户确认表不一致
- **THEN** 实施人员 MUST 停止并重新确认，不得继续安装或自行修改路径

### Requirement: Handbook includes acceptance, upgrade, rollback and uninstall

手册 MUST 提供可勾选的现场验收单，以及升级、回滚和卸载的独立章节；验收 MUST 覆盖重启恢复、访问、核心业务、数据读写、日志、版本、备份和回滚入口。

#### Scenario: Core health is green but business smoke fails
- **WHEN** 服务进程或基础健康检查通过但核心业务操作失败
- **THEN** 手册 MUST 将部署标记为未验收，并指导执行诊断或回滚，不得以进程存在作为成功

#### Scenario: Uninstall is requested
- **WHEN** 实施人员执行卸载流程
- **THEN** 手册 MUST 二次确认是否保留数据，并明确程序、配置、数据、日志和备份各自的处理结果

### Requirement: Handbook defines incident handoff evidence

故障排查章节 MUST 按现场现象列出停止条件和诊断入口，并规定交接时提供包版本、应用版本、部署方式、发布版本、客户目录、访问地址、日志目录、备份位置、诊断包和操作时间；不得要求实施人员提供密码或完整敏感连接串。

#### Scenario: Rollback also fails
- **WHEN** 新版本和记录的 previous release 均未通过健康检查
- **THEN** 手册 MUST 要求停止继续操作、保留现场和诊断证据，并升级给研发或运维负责人

### Requirement: Handbook exposes layered preflight gates

零经验手册 MUST 明确构包校验、`doctor.sh` 只读现场检查和 `deploy.sh` 强制门禁的顺序，并列出端口、空间/inode、权限、运行环境、资源、依赖、配置、进程身份、持久化、日志和回滚空间检查。

#### Scenario: Doctor reports a required failure
- **WHEN** 任一必需 preflight 项为“不通过”或“待客户确认”
- **THEN** 手册 MUST 要求停止，不执行 `deploy.sh`，保留脱敏诊断证据并交接给指定联系人

#### Scenario: Doctor passes
- **WHEN** 所选模式的 package、目录确认、端口、空间、权限和其他必需检查均通过
- **THEN** 手册 MUST 说明安装预览、最终确认和成功报告中应出现的版本、目录、端口和诊断记录

### Requirement: Handbook explains non-destructive remediation boundaries

手册 MUST 明确一键入口不会自动杀进程、改端口、清理磁盘、修复 owner/group、改防火墙或安装缺失的 Kubernetes/Docker 环境。

#### Scenario: Operator sees a port or permission conflict
- **WHEN** doctor 发现未知端口占用者或权限不足
- **THEN** 手册 MUST 指导实施人员停止并联系管理员，不得要求其执行宽泛 kill、递归删除或自行修改安全策略
