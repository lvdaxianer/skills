# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
