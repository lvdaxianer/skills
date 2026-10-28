# Design

## Context

本变更把 `knowledge-app` 已验证的发布模式抽象成 Skill 文档，不实现新的部署程序，也不要求远程主机必须使用某种进程管理器。目标服务可能运行在 `/opt`、`/uinnova/deploy` 或其他绝对路径，并可能通过 Shell 脚本、systemd 或其他命令完成生命周期操作。

## Goals / Non-Goals

**Goals:**

- 用参数化目录模型统一不同服务的发布位置、版本目录、当前指针、配置和日志边界。
- 用可排序且不可复用的版本名支持快速识别、回滚和保留清理。
- 把发布操作拆成预检、准备、切换、启动、验证、记录和清理阶段，并明确每个阶段的失败处理。
- 将通用规则放在 `SKILL.md`，把较长的目录、命名、检查清单和案例放在 `references/`，按需加载。

**Non-Goals:**

- 不创建一个绑定单一服务器的部署脚本或 CI/CD 平台。
- 不强制 systemd、Docker、Kubernetes 或特定语言运行时。
- 不迁移现有远程目录，不清理远程历史备份，不读取或保存真实密钥。
- 不负责数据库、向量库、对象存储等外部依赖的业务数据迁移；只规定必要时的专项备份和验证边界。

## Decisions

### Parameterized service root

以 `deploy_root`、`service_name` 和 `release_id` 构造所有路径，默认 `deploy_root=/opt`。选择参数化根目录而不是把 `/opt/knowledge-app` 写死，是因为同一部署流程需要覆盖 `/uinnova/deploy` 等现有布局，同时避免把服务名、路径和环境混在规则正文中。

### Immutable releases plus current pointer

每次发布先写入新的 `releases/<release-id>` 目录，完成校验后用临时软链接和原子重命名更新 `current`。选择软链接指针而不是覆盖原目录，是为了让回滚只改变指针，不复制整个应用，也让失败版本可以保留排查。

### Service-owned lifecycle adapter

Skill 要求服务提供 start/stop/status/health 命令，但不把命令实现绑定为 systemd。优先使用服务目录的 `bin/*.sh`，必要时接受用户明确提供的命令或可选 systemd 适配；这样可以覆盖当前 `knowledge-app`，也能覆盖没有 unit 文件的服务。

### Monotonic release identifier

版本名固定使用服务名、部署主机时间、Git 短 SHA 或包版本/`manual`、三位补零序号。序号按服务独立维护，并通过发布记录或序号状态文件持久化，不能只扫描会被清理的版本目录推导，以避免清理后复用编号。

### Retention protects rollback

默认保留最近 5 个已验证版本；current、previous、未验证版本和正在使用的版本属于保护集合，清理只针对其余最旧版本。选择“版本目录即备份”而不是额外复制整包，是为了降低空间占用和备份重复，同时保留直接回滚能力。

### References carry operational detail

`SKILL.md` 保留触发条件、决策顺序和安全边界；`references/` 分别承载目录模型、命名与清理规则、部署清单和真实案例。案例只记录路径、变量名和服务行为，不记录敏感值。

## Risks / Trade-offs

- [Risk] 软链接切换成功不代表服务可用 → [Mitigation] 将启动、状态和应用级健康检查作为切换后的必需验证；失败时切回旧指针。
- [Risk] 外置配置可能与新版本不兼容 → [Mitigation] 发布前校验必需键和配置格式；配置变更单独快照，不由版本包覆盖。
- [Risk] 序号状态文件损坏或多人并发发布 → [Mitigation] 发布前取得服务级锁，序号更新与发布记录一起落盘；冲突时停止发布，不猜测序号。
- [Risk] 自动清理误删可回滚版本 → [Mitigation] 清理前解析 current、previous、状态和发布记录，保护集合优先于数量策略，并提供 dry-run 预览。
- [Risk] 不同服务的启动命令语义不同 → [Mitigation] 让服务提供生命周期适配器，Skill 只规定输入、顺序、退出码和验证结果。

## Migration Plan

1. 为目标服务确认 `deploy_root`、服务名、发布包元数据、配置路径、生命周期命令和健康检查入口。
2. 在新 `releases/<release-id>` 目录准备并校验首个版本，不改动现有 `current`。
3. 记录当前指针和回滚目标，停止旧服务，原子切换 `current`，启动新版本并执行状态/健康检查。
4. 验证通过后写入发布记录并按保护集合执行保留清理；失败则切回旧版本并记录失败阶段。
5. 后续发布沿用同一服务序号和保留策略，不重用已经分配的序号。

## Open Questions

无。服务特有的命令和健康检查由每次部署输入提供，不改变本变更的通用规格。
