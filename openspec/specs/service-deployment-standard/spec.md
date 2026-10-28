# Service Deployment Standard

## Purpose

为不同服务提供一致、可配置、可回滚的版本化部署行为，确保发布版本、运行配置、生命周期操作和保留清理彼此隔离且可审计。

## Requirements

### Requirement: Deployment root and layout are configurable

部署流程 SHALL 接受绝对 `deploy_root` 和稳定的 `service_name`；未指定时 MUST 使用 `/opt`，所有 release、current、conf、data、overrides、volumes、logs、run 和 record 路径 MUST 解析到 `service_root=deploy_root/service_name` 之下。

#### Scenario: Use a custom deployment root
- **WHEN** 用户指定 `/uinnova/deploy`
- **THEN** 所有 host-process 和 Docker 的 release、current、conf、data、overrides、volumes、logs、run 和 record 路径均位于 `/uinnova/deploy/<service-name>/`，流程不得写入 `/opt/<service-name>/`

#### Scenario: Use the default deployment root
- **WHEN** 用户只提供服务名和发布包或镜像 manifest
- **THEN** 发布目标为 `/opt/<service-name>/releases/`，当前版本链接为 `/opt/<service-name>/current`

#### Scenario: Reject path escape
- **WHEN** 解析后的目标路径不在 service root 下，或 Docker mount 的宿主机路径越界
- **THEN** 流程 MUST 在任何停止、容器创建或写入动作前失败

### Requirement: Each release uses an immutable, sortable name

每次发布 SHALL 使用 `<service-name>-<YYYYMMDDHHmmss>-<version-or-git-short-sha>-<three-digit-sequence>`；四个字段 MUST 通过格式校验，服务级序列 MUST 单调递增且永不复用。

#### Scenario: Allocate a release number concurrently
- **WHEN** 两个发布同时申请序列
- **THEN** 服务锁 MUST 使它们获得不同的三位序列，失败发布也消耗已分配序列

#### Scenario: Missing source metadata
- **WHEN** 无 Git SHA 且无有效包版本
- **THEN** version 字段 MUST 为 `manual`

#### Scenario: Release with a Git commit
- **WHEN** 发布包关联提交 `c0de7043...` 且序号为 1
- **THEN** 版本目录名为类似 `kbsearch-20261028100814-c0de704-001`

#### Scenario: Release without a Git commit
- **WHEN** 发布包没有提交记录但版本号为 `v1.2.3`
- **THEN** 版本字段使用 `v1.2.3`

#### Scenario: Manual release without metadata
- **WHEN** 发布包没有提交记录和版本号
- **THEN** 版本字段 MUST 使用 `manual`

### Requirement: Runtime configuration remains outside releases

运行配置、持久化数据和 operator overrides MUST 留在 release 之外；部署包或镜像内的默认配置可以作为 fallback，但不得覆盖外置配置。Docker overlay MUST 通过显式 manifest 进入运行时，且不得遮蔽默认 `lib`。

#### Scenario: Preserve existing runtime configuration
- **WHEN** 新版本发布且已有 `<service-root>/conf/` 或 `<service-root>/overrides/`
- **THEN** 新版本复用这些外置输入，release 内或镜像内的默认配置只作为未覆盖项

#### Scenario: Unsafe shell configuration
- **WHEN** env 文件包含命令替换、函数、重定向、管道或执行语句
- **THEN** Shell loader MUST 拒绝加载并在 current 切换前失败

#### Scenario: Missing required key
- **WHEN** 必填 key 缺失或值为空
- **THEN** 部署 MUST 失败且不得切换 current

#### Scenario: Missing required configuration or mount
- **WHEN** 必需配置、required-persistent mount 或 override manifest 不存在、不可读或校验失败
- **THEN** 发布 MUST 在 current 切换或容器替换前失败，原当前版本保持不变

#### Scenario: Missing required configuration
- **WHEN** 必需配置或配置文件不可读
- **THEN** 发布 MUST 在切换 `current` 前失败，原当前版本保持不变

#### Scenario: Default library with incremental JAR
- **WHEN** `overrides/lib/custom.jar` 校验通过
- **THEN** runtime MUST 在保留默认 `/app/lib` 的前提下优先加载该 JAR，不能把整个 override 目录挂载到 `/app/lib`

### Requirement: Lifecycle commands are service-provided

部署流程 SHALL 支持 `runtime_target=host-process` 或 `runtime_target=docker-container`，并继续支持 `systemd`、`manual-foreground`、`manual-background`；每种组合 MUST 声明 start/stop/status/health、环境加载、容器身份或进程身份和持久化挂载方式。

#### Scenario: Start a Docker service without systemd
- **WHEN** runtime target 为 `docker-container` 且没有 systemd unit
- **THEN** deployment 仍可使用 Compose 或 Docker CLI 的手动前台/后台模式，且必须执行相同的容器身份和健康门禁

#### Scenario: Test both current and release entry points
- **WHEN** 服务提供 start 脚本
- **THEN** contract test MUST 分别调用 `/service-root/current/bin/start.sh` 与 `/service-root/releases/<release-id>/bin/start.sh` 并验证三类解析路径

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

#### Scenario: Manual background identity is insufficient
- **WHEN** 只有 PID 文件而没有用户、完整 cmdline、artifact 路径、启动时间和端口归属校验
- **THEN** stop 或 rollback MUST 停止并报告，不得继续切换

#### Scenario: Use systemd for a Docker service
- **WHEN** runtime target 为 `docker-container` 且 lifecycle mode 为 `systemd`
- **THEN** systemd unit 只管理声明的 Docker/Compose adapter，adapter 必须使用 current manifest、精确 project/container identity 和外置配置

#### Scenario: Preserve host lifecycle modes
- **WHEN** runtime target 为 `host-process`
- **THEN** 既有 systemd、manual-foreground、manual-background 行为和物理路径 contract test MUST 保持不变

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

流程 MUST 在 `prepared` 和 `validated` 后停止服务、原子切换 current、启动并验证；任何失败 MUST 保留 failed release，并按记录的 previous_release 回滚。

#### Scenario: Rollback health fails
- **WHEN** 新版本失败且 previous release 的 status 或 health 也失败
- **THEN** 流程 MUST 停止、记录 incident 和 rollback health failure，不得猜测或切换第三个版本

#### Scenario: Successful switch
- **WHEN** 目标版本校验和健康检查均通过
- **THEN** `current` 指向目标版本，并记录旧版本作为回滚目标

#### Scenario: Failed health check
- **WHEN** 新版本启动后健康检查失败
- **THEN** `current` 恢复到旧版本，服务恢复到旧版本状态，新版本目录保留用于排查

### Requirement: Retention cleanup protects rollback safety

流程 SHALL 提供 `retention preview` 和显式 `retention apply`；默认保留五个 verified release，保护 current、previous、active、failed、unverified，并且删除集合 MUST 在解析后逐项确认位于 releases 目录。

#### Scenario: Preview before apply
- **WHEN** operator 执行 retention preview
- **THEN** 只输出或记录精确 deleted release IDs，不删除任何目录

#### Scenario: Unsafe deletion candidate
- **WHEN** 候选路径为 releases 之外、损坏目录、未知目录或孤儿 current 目标
- **THEN** apply MUST 拒绝该项并保留现场

#### Scenario: More than five verified releases
- **WHEN** 服务已有超过 5 个已验证版本且新发布成功
- **THEN** 仅清理超出保留策略且不受保护的最旧版本

#### Scenario: Failed release is retained
- **WHEN** 新版本发布或健康检查失败
- **THEN** 该版本不得被同一轮清理删除，并保留失败记录

### Requirement: Deployment produces an auditable release record

每次发布 SHALL 生成符合统一 schema 的 record，包含状态、失败阶段、回滚、健康、smoke 和 retention 字段；不得记录环境变量值、密码、Token、私钥或完整敏感 URL。

#### Scenario: Record a failed rollback
- **WHEN** 发布失败且回滚健康检查失败
- **THEN** record MUST 包含 `failed_phase`、`previous_release`、`rollback_target`、`rollback_result` 和失败证据路径

#### Scenario: Record path is reported
- **WHEN** 发布记录写入成功
- **THEN** report MUST 返回 record path，且 schema 校验通过

#### Scenario: Successful release record
- **WHEN** 发布完成且健康检查通过
- **THEN** 记录状态为 `verified`，并包含目标版本和旧版本信息

#### Scenario: Failed release record
- **WHEN** 发布在校验、启动或健康检查阶段失败
- **THEN** 记录状态为失败，并包含失败阶段和可执行的回滚目标
