## MODIFIED Requirements

### Requirement: Lifecycle commands are service-provided

For `runtime_target=docker-container`, lifecycle commands MUST use an image that passed the Dockerfile standard and egress-restricted startup gate. This adds a Docker-specific validation gate but does not change the supported `systemd`, `manual-foreground` and `manual-background` modes.

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

#### Scenario: Runtime startup is self-contained
- **WHEN** the image starts with registry, package, code and model repositories blocked and only declared business dependencies reachable
- **THEN** startup, readiness, liveness and smoke checks may proceed

#### Scenario: Runtime download is detected
- **WHEN** startup logs, command lines, filesystem changes or network evidence show an undeclared download or installation
- **THEN** deployment MUST fail, preserve the failed release and leave the previous current runtime unchanged
