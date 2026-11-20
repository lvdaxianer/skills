# Docker 镜像宿主持久化与增量替换设计

## 背景

Docker 镜像内的默认 `html`、`lib` 和配置适合随不可变镜像发布，但运维可能需要在不重建完整镜像的情况下替换少量兼容文件。现有规范已经禁止全局 override 目录直接覆盖 `/app/lib`，但对 HTML 资产、未来扩展点、宿主机持久化边界和增量替换验收还不够完整。

## 目标与非目标

目标是把三类内容分层管理：

- `conf` 是跨 release 的宿主机持久化运行配置，只读挂载并按配置安全规则校验。
- `html`、`lib` 以及未来声明的可替换资源，进入选定 release 的 `overrides/`，作为只读、可审计、可回滚的增量覆盖层。
- 镜像始终保留默认资源；覆盖层只通过独立 extension point 加载，不覆盖 `/app/lib`、entrypoint 或整个静态资源根目录。

不在本次范围内：真实业务 Dockerfile、服务器部署、Kubernetes/Helm、数据库迁移和运行时自动下载。

## 方案

每次增量替换都生成一个新的 release-bound override unit，而不是修改一个全局宿主机目录：

```text
<service-root>/
├── conf/                                  # 跨 release，live config
└── releases/<release-id>/
    ├── overrides/
    │   ├── lib/                           # JAR add/replace
    │   ├── html/                          # 静态资源 add/replace
    │   ├── config/                        # replace/merge 配置
    │   └── <future-extension>/             # 必须先声明 container path 与规则
    ├── container/compose.yaml             # 固定物理 release 路径
    ├── docker-persistence-manifest.json
    └── release-manifest.json
```

Compose 将 `conf` 挂到应用声明的外部配置路径，将 `overrides/lib`、`overrides/html` 和其他已声明 extension point 以只读 bind mount 挂到独立容器路径。启动器声明并验证顺序：镜像默认值 < 外部基础配置 < release override < 环境变量；库和静态资源的合并规则必须按服务声明，不能凭约定猜测。

## 增量替换流程

1. 在 staging 中接收变更文件，拒绝路径穿越、符号链接、脚本/entrypoint、Docker socket 和未声明扩展点。
2. 生成 override manifest，记录每个文件的 `add`/`replace`/`merge`、SHA-256、原因和兼容性证据；同步更新 persistence/release manifest。
3. 将完整覆盖层复制到新 release，渲染使用物理 release 路径的 Compose，执行 schema、路径、权限、镜像身份和离线启动校验。
4. 按标准生命周期重建或重启精确容器，验证 status/readiness/liveness、依赖、业务 smoke 和实际加载的库/HTML/config。
5. 成功后记录 manifest/checksum/load order；失败则只恢复 recorded previous release/override set，不选择第三个版本。

## 关键取舍

不采用全局 `<service-root>/overrides` 直接挂载：它虽然简单，但会绕过 release 审计、使 `current` 与实际加载内容脱钩，并破坏回滚可重复性。宿主机持久化仍然保留，但可替换内容以 release 为边界固化；真正跨 release 的 live 配置继续放在 `conf/`。

## 验收

- manifest schema 能表达 `html` 与未来 extension point，并拒绝 `/app/lib`、entrypoint 和全局 override mount。
- Compose 示例包含 `conf`、`overrides/lib`、`overrides/html` 的明确只读/物理路径约束。
- 同一 release 重建容器不会丢失 `conf`；增量替换只改变声明的覆盖文件，默认资源仍可回滚。
- 文档、JSON schema、模板和 checklist 互相一致；JSON 可解析，OpenSpec 严格校验通过，工作区最终审计无未同步差异。
