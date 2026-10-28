# Spec Delta

## MODIFIED Requirements

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
