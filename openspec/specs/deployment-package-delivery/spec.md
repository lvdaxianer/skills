# deployment-package-delivery Specification

## Purpose

为没有部署经验的实施人员提供有版本、可校验、按部署方式分流且依赖完整的服务部署包。部署包必须在安装前说明支持范围并阻止不安全、不完整或无法验证的交付物继续执行。

## Requirements

### Requirement: Deployment packages have immutable identities

每个部署包 MUST 同时声明包版本、应用版本、构建时间、源码提交号、支持架构、支持系统、支持的部署方式和完整包 SHA-256；包文件名 MUST 包含服务名、包版本、构建日期和架构，禁止使用 `latest` 或 `final` 作为唯一身份。

#### Scenario: Package identity is complete
- **WHEN** 实施人员启动部署包
- **THEN** 安装器 MUST 在任何系统写入前展示并校验清单中的包版本、应用版本、架构、支持范围和 SHA-256

#### Scenario: Package identity is missing
- **WHEN** 包没有版本、清单、校验和或源码提交号
- **THEN** 安装器 MUST 拒绝执行并说明缺失字段

### Requirement: Package contents match the selected deployment mode

统一部署包 MUST 为本机直接运行、Docker 和已有 Kubernetes 集群分别提供声明的运行时、应用文件、配置模板、启动材料、健康检查和回滚材料；未选择的模式材料不得被隐式当作当前模式输入。

#### Scenario: Select Docker mode
- **WHEN** 实施人员选择 Docker
- **THEN** 安装器 MUST 只校验 Docker 镜像/归档、Compose 或 CLI 清单、持久化挂载和 Docker 生命周期材料

#### Scenario: Select Kubernetes mode without a cluster
- **WHEN** 实施人员选择 Kubernetes 且无法连接已有集群或没有必要权限
- **THEN** 安装器 MUST 在任何应用安装前停止，并输出集群、命名空间、权限和镜像准备清单，不得安装集群或降级到其他模式

### Requirement: Package dependencies are closed for offline installation

部署包 MUST 声明离线能力和运行时依赖闭包；声明支持离线的模式不得在安装、启动、健康检查或回滚时下载或安装未打包资源。

#### Scenario: Runtime is absent on a supported host
- **WHEN** 本机直接运行模式所需运行时不在宿主机上但包声明内置运行时
- **THEN** 安装器 MUST 使用并校验包内运行时，不要求实施人员联网或手工安装

#### Scenario: Offline dependency is missing
- **WHEN** 支持离线的包缺少声明的运行时、镜像归档或启动依赖
- **THEN** 包契约校验 MUST 在停止现有服务前失败并列出缺失材料

### Requirement: Package exposes stable operator entrypoints

部署包 MUST 提供稳定且可复制执行的部署、运维、诊断、回滚和卸载入口，至少覆盖首次部署/升级、启动、停止、重启、状态、日志、环境检查、回滚和卸载；实施人员不应依赖底层 systemd、Docker 或 kubectl 命令完成常规操作。

#### Scenario: Restart a deployed service
- **WHEN** 实施人员执行服务运维入口并选择重启
- **THEN** 入口 MUST 调用当前部署方式的精确生命周期操作，执行状态和健康检查，并显示成功或失败原因

#### Scenario: Operator uses a copied command
- **WHEN** 实施人员从部署手册复制一个包内入口命令
- **THEN** 命令 MUST 使用当前包声明的版本、部署目录和运行身份，不依赖研发机器的绝对路径

### Requirement: Customer deployment directories are confirmed before writes

安装器 MUST 在首次安装、升级和迁移前收集并展示客户确认的部署根目录、配置目录、数据目录、日志目录和备份目录；目录必须为绝对路径并通过边界、权限、磁盘空间和持久化检查。

#### Scenario: Directory confirmation is complete
- **WHEN** 客户确认的目录均为绝对路径、可访问且满足空间和权限要求
- **THEN** 安装器 MAY 生成安装预览并等待最终确认后写入

#### Scenario: Directory confirmation is missing
- **WHEN** 实施人员未确认部署根目录或任一必需目录校验失败
- **THEN** 安装器 MUST 停止且不得创建 release、容器、服务或修改客户数据

### Requirement: Package validation rejects unsafe contents

交付前和现场安装前 MUST 校验压缩包路径安全、入口文件 executable bit、文件 SHA-256、支持架构、必需文件、敏感文件和 live configuration 边界；密码、Token、私钥和真实生产连接串不得进入包。

#### Scenario: Package contains a secret
- **WHEN** 包内发现私钥、密码、Token 或真实生产连接串
- **THEN** 包契约校验 MUST 失败且不得打印敏感内容

#### Scenario: Archive contains an unsafe path
- **WHEN** 包内归档包含绝对路径、父目录跳转、越界链接或额外顶层目录
- **THEN** 校验 MUST 在解压到最终目录前失败

### Requirement: Packages declare a machine-verifiable preflight contract

部署包 MUST 声明通用和所支持模式的必需检查，以及端口、存储容量/inode 预留和目录权限目标；缺少任一端口、空间或权限契约时，包校验 MUST 失败。

#### Scenario: Preflight contract is complete
- **WHEN** 包清单包含所支持模式的检查集合、端口协议/监听边界、最小存储要求和权限目标
- **THEN** 构包契约校验 MUST 通过并允许进入目标机 doctor 检查

#### Scenario: Preflight contract is missing
- **WHEN** 包清单缺少端口、存储或权限声明，或声明的阈值/路径引用格式无效
- **THEN** 构包契约校验 MUST 失败且不得解压到最终部署目录

### Requirement: Package validation separates static and dynamic checks

构包校验 MUST 只验证包内可确定的静态事实；目标机系统、端口占用、实际空间、owner/group、运行用户、依赖和持久化状态 MUST 留给只读 doctor 检查，不得以包内声明伪造现场通过结果。

#### Scenario: Package passes but host is unknown
- **WHEN** 包内材料完整但尚未检查目标机端口、空间或权限
- **THEN** 安装器 MUST 只输出待执行的 dry-run/preflight 状态，不得开始停止或写入
