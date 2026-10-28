# Service Deployment Standard

## Purpose

为不同服务提供一致、可配置、可回滚的版本化部署行为，确保发布版本、运行配置、生命周期操作和保留清理彼此隔离且可审计。

## Requirements

### Requirement: Deployment root and layout are configurable

部署流程 SHALL 接受服务名和部署根目录；未指定部署根目录时 MUST 使用 `/opt`，并在该根目录下创建服务目录、`releases/`、`conf/`、`logs/` 和发布记录目录。

#### Scenario: Use the default deployment root
- **WHEN** 用户只提供服务名和发布包
- **THEN** 发布目标为 `/opt/<service-name>/releases/`，当前版本链接为 `/opt/<service-name>/current`

#### Scenario: Use a custom deployment root
- **WHEN** 用户指定 `/uinnova/deploy` 作为部署根目录
- **THEN** 发布目标为 `/uinnova/deploy/<service-name>/releases/`，流程不得写入 `/opt/<service-name>/`

### Requirement: Each release uses an immutable, sortable name

每次发布 SHALL 写入独立版本目录，目录名 MUST 使用 `<service-name>-<YYYYMMDDHHmmss>-<version-or-commit>-<number>`；序号按服务独立递增且不得因旧版本清理而复用。

#### Scenario: Release with a Git commit
- **WHEN** 发布包关联提交 `c0de7043...` 且序号为 1
- **THEN** 版本目录名为类似 `kbsearch-20261028100814-c0de704-001`

#### Scenario: Release without a Git commit
- **WHEN** 发布包没有提交记录但版本号为 `v1.2.3`
- **THEN** 版本目录名使用 `v1.2.3` 作为版本字段

#### Scenario: Manual release without metadata
- **WHEN** 发布包没有提交记录和版本号
- **THEN** 版本字段 MUST 使用 `manual`

### Requirement: Runtime configuration remains outside releases

敏感变量和环境相关配置 MUST 存放在服务目录的 `conf/` 下，不得随版本发布包复制为新的运行配置；发布流程 SHALL 在切换前检查配置文件存在、可读且满足服务声明的必需键。

#### Scenario: Preserve existing runtime configuration
- **WHEN** 新版本发布且已有 `/opt/kbsearch/conf/knowledge-runtime.env`
- **THEN** 新版本复用该外置配置，版本目录中的示例配置不得覆盖它

#### Scenario: Missing required configuration
- **WHEN** 必需配置缺失或配置文件不可读
- **THEN** 发布 MUST 在切换 `current` 前失败，并保留原当前版本不变

### Requirement: Lifecycle commands are service-provided

部署流程 SHALL 支持服务提供的启动、停止、状态和健康检查命令，并 SHALL 接受明确的生命周期模式：`systemd`、`manual-foreground` 或 `manual-background`。不得要求服务必须使用 systemd 或 PID 文件；所有命令执行前 MUST 验证目标 `current` 存在并指向有效版本目录。

#### Scenario: Start with service scripts
- **WHEN** 服务提供 `bin/stop.sh`、`bin/start.sh` 和 `bin/status.sh`
- **THEN** 部署流程使用这些脚本完成停止、启动和状态检查

#### Scenario: Start without systemd
- **WHEN** 服务仅提供 Shell 启动命令而没有 systemd unit
- **THEN** 部署仍可完成，且 systemd 不得成为硬性前置条件

#### Scenario: Use manual foreground mode
- **WHEN** 用户选择 `manual-foreground`
- **THEN** Skill 输出前台启动命令，由用户在终端中启动并通过 `Ctrl+C` 停止，流程不得要求 PID 文件或 systemd

#### Scenario: Use manual background mode
- **WHEN** 用户选择 `manual-background`
- **THEN** Skill 使用用户提供的后台启动命令，并要求提供精确、可审计的停止命令或进程匹配方式，禁止使用宽泛的 `killall java`

#### Scenario: Use systemd mode
- **WHEN** 用户选择 `systemd` 且服务存在有效 unit
- **THEN** Skill 使用 unit 声明的启动、停止、状态和健康检查方式，并记录 unit 名称

### Requirement: Environment loading follows lifecycle mode

外置环境文件 MUST 根据生命周期模式加载：systemd 模式由 unit 的 `EnvironmentFile` 加载，Shell 模式由启动命令显式加载；Skill MUST 在报告中说明加载方式，且不得输出变量值。

#### Scenario: Load environment through systemd
- **WHEN** 生命周期模式为 `systemd` 且 unit 声明 `EnvironmentFile=/opt/knowledge-app/conf/knowledge-runtime.env`
- **THEN** systemd 将该文件中的变量注入服务进程，部署流程只检查文件存在和可读性

#### Scenario: Load environment in manual foreground mode
- **WHEN** 生命周期模式为 `manual-foreground`
- **THEN** 前台启动脚本在执行 Java 或其他主进程前显式加载外置环境文件，然后使用 `exec` 保持前台进程可由 `Ctrl+C` 停止

#### Scenario: Missing environment loader in manual mode
- **WHEN** 手动启动命令未加载声明的外置环境文件
- **THEN** 部署流程 MUST 在启动前报告配置加载缺口，不得宣称服务已按标准启动

### Requirement: Release switching is atomic and rollbackable

发布流程 MUST 先完成文件落盘、权限检查和校验，再以原子方式将 `current` 切换到目标版本；健康检查失败时 MUST 恢复到发布前的目标版本并重新执行启动与状态检查。

#### Scenario: Successful switch
- **WHEN** 目标版本校验和健康检查均通过
- **THEN** `current` 指向目标版本，并记录旧版本作为回滚目标

#### Scenario: Failed health check
- **WHEN** 新版本启动后健康检查失败
- **THEN** `current` 恢复到旧版本，服务恢复到旧版本状态，新版本目录保留用于排查

### Requirement: Retention cleanup protects rollback safety

发布流程 SHALL 默认保留每个服务最近 5 个已发布版本，并允许用户覆盖保留数量；清理 MUST 跳过当前版本、上一版本、未完成验证版本和正在使用的版本目录。

#### Scenario: More than five verified releases
- **WHEN** 服务已有超过 5 个已验证版本且新发布成功
- **THEN** 仅清理超出保留策略且不受保护的最旧版本

#### Scenario: Failed release is retained
- **WHEN** 新版本发布或健康检查失败
- **THEN** 该版本不得被同一轮清理删除，并保留失败记录

### Requirement: Deployment produces an auditable release record

每次发布 SHALL 生成发布记录，至少包含服务名、目标目录、部署时间、版本字段、递增序号、包校验值、旧版本、最终状态和回滚目标；记录 MUST 不包含敏感配置值。

#### Scenario: Successful release record
- **WHEN** 发布完成且健康检查通过
- **THEN** 记录状态为 `verified`，并包含目标版本和旧版本信息

#### Scenario: Failed release record
- **WHEN** 发布在校验、启动或健康检查阶段失败
- **THEN** 记录状态为失败，并包含失败阶段和可执行的回滚目标
