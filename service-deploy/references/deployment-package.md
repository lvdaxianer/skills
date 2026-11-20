# Deployment Package Contract

这是面向交付方的部署包标准。部署包不是单独的 JAR、镜像或 YAML 文件，而是包含版本身份、模式材料、运行时闭包、操作入口、文档和验证证据的完整交付单元。

## 1. 交付包身份

包文件名 MUST 使用：

```text
<service-name>-package-<package-version>-<YYYYMMDD>-<architecture>.tar.gz
```

禁止使用 `latest.zip`、`final.tar.gz`、`正式版.zip` 等不可追溯名称。包版本、应用版本和服务器发布 ID 是三个不同字段：

| 身份 | 作用 | 来源 |
| --- | --- | --- |
| `package_version` | 交付包不可变版本 | 构建发布流程 |
| `application_version` | 包内程序版本 | 应用构建产物 |
| `release_id` | 客户机器上的一次发布 | 部署锁和 sequence.state |

包内 `package-manifest.json` MUST 记录包版本、应用版本、构建时间、源码提交号、支持系统、CPU 架构、支持模式、离线能力、权限、端口、迁移提示、入口、每个文件的 SHA-256 和模式 payload。

## 2. 推荐目录

```text
deploy-package/
├── deploy.sh
├── service.sh
├── doctor.sh
├── rollback.sh
├── uninstall.sh
├── package-manifest.json
├── checksums.sha256
├── docs/
│   ├── 00-开始部署.md
│   ├── 01-部署方式怎么选.md
│   ├── 02-本机直接运行.md
│   ├── 03-Docker部署.md
│   ├── 04-Kubernetes部署.md
│   ├── 升级.md
│   ├── 回滚.md
│   ├── 卸载.md
│   ├── 故障排查.md
│   └── 交付验收单.md
├── modes/
│   ├── vm/
│   │   ├── runtime/
│   │   ├── service/
│   │   └── scripts/
│   ├── docker/
│   │   ├── image.tar
│   │   ├── compose.yaml
│   │   └── scripts/
│   └── kubernetes/
│       ├── manifests/
│       ├── values.example.yaml
│       └── scripts/
└── app/
    ├── application/
    ├── config.schema.json
    ├── health/
    └── smoke/
```

如果某个模式不在包的支持矩阵中，manifest MUST 明确列出不支持原因；不能留下看起来可用但未验证的半套目录。

## 3. 三种模式必须准备的内容

### 本机直接运行

- 应用完整文件和 SHA-256。
- 已验证的运行时，或包内可离线使用的运行时。
- systemd unit 或明确的 manual-foreground/manual-background 生命周期材料。
- 外置配置模板、数据目录初始化、日志目录和备份说明。
- status、readiness、liveness、启动日志和业务 smoke 检查。
- 重启恢复、升级和回滚脚本。

### Docker

- 已验证的 immutable release tag。
- `registry` 模式的 manifest digest，或 `local-daemon`/`archive` 模式的 local image ID。
- 离线 `docker save` 归档及 SHA-256，或已验证 Registry 信息。
- 渲染后的 Compose/CLI 清单，使用物理绝对路径，不使用 `current` 解析挂载源。
- 持久化挂载 manifest：宿主机路径、容器路径、用途、只读、备份和恢复方法。
- release-bound override delta、override_chain、文件校验和和加载顺序。
- 离线/受限出网启动、容器身份、健康和业务 smoke 证据。

### Kubernetes

- 已有集群的接入前置说明；本包不安装 Kubernetes。
- Namespace、权限、镜像来源、ConfigMap/Secret 输入、持久化存储和服务暴露声明。
- Deployment/Service/Ingress/探针/资源限制等 manifest 或 Helm values。
- 离线镜像导入或私有仓库方案。
- rollout、readiness、业务 smoke、升级和回滚检查。
- `kubectl` context 和 namespace 防误操作检查。

## 4. 构包和交付前验证

1. 锁定源码提交、应用版本、包版本、系统和架构支持矩阵。
2. 生成包目录、manifest、checksums 和文档。
3. 运行 `scripts/package-contract-test.sh <package-root>`。
4. 在干净的支持系统上执行 `doctor.sh`、首次部署、重启、验收、升级和回滚。
5. 在 Docker 模式验证离线镜像导入；在 Kubernetes 模式验证已有集群和 namespace 权限。
6. 检查失败发布是否保留证据，检查数据目录和客户目录是否未被误写。
7. 发布包文件、SHA-256、适用手册和交付验收单；禁止只发程序文件。

## 5. 包内禁止内容

- 生产密码、Token、私钥和真实连接串。
- 研发机器绝对路径、实时 `conf/`、日志、release records 或客户数据。
- 启动时联网下载或安装依赖的脚本。
- 仅有 `latest` 的镜像身份。
- 要求实施人员直接编辑复杂 YAML、JSON 或 shell 环境文件的隐式步骤。
- 没有 owner、权限、备份和恢复策略的持久化目录。

## 6. 目录确认要求

`deploy.sh` 必须在任何停止、创建目录、写入配置或导入镜像前显示并确认：

```text
部署根目录：________________
配置目录：__________________
数据目录：__________________
日志目录：__________________
备份目录：__________________
运行账号：__________________
服务端口：__________________
```

部署根目录是最终物理 `service_root`，不得自动追加 `service_name`。`/opt` 只能是待客户确认的建议值。确认结果和物理路径 MUST 写入部署记录。
