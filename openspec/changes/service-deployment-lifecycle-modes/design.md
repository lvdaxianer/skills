# Design

## Context

现有 Skill 已统一版本目录、`current` 软链接、外置配置、健康检查和回滚，但生命周期示例主要围绕 systemd 或带 PID 文件的 Shell 脚本。远程 `knowledge-app` 同时存在 systemd unit 和版本内 Shell 脚本，且两种路径对 `knowledge-runtime.env` 的加载方式不同：systemd 通过 `EnvironmentFile` 加载，直接运行版本内脚本不会自动加载外层 env 文件。

## Goals / Non-Goals

**Goals:**

- 用同一套发布主流程兼容 systemd、手动前台和手动后台模式。
- 明确每种模式的启动、停止、状态、健康检查和环境加载责任。
- 让手动前台模式不依赖 PID 文件，支持用户通过 `Ctrl+C` 停止。
- 让 Skill 在无法安全自动停止或验证时输出明确命令和等待点，不伪造部署成功。

**Non-Goals:**

- 不把 Java 进程变成非进程；手动模式仍然运行应用进程。
- 不自动解析或打印 env 文件中的值。
- 不为所有服务生成通用的进程查找器，不使用宽泛的 `killall`。
- 不改变既有版本目录、命名、回滚和保留规则。

## Decisions

### Lifecycle adapter with explicit mode

在公共部署流程之后选择生命周期适配器：`systemd`、`manual-foreground`、`manual-background`。选择显式模式而不是根据主机上是否存在 unit 自动猜测，是为了避免在用户希望人工操作时意外启停服务。

### Manual foreground is the safest no-PID mode

`manual-foreground` 使用显式 env 加载和 `exec` 启动主进程，部署代理输出命令并由用户在终端运行；停止使用 `Ctrl+C`。这比无 PID 文件时用模糊进程匹配更安全，代价是自动化部署不能独立完成启动后的观察，需要用户确认服务已启动。

### Background mode requires an exact stop contract

`manual-background` 可使用 `nohup` 或服务自带后台脚本，但必须提供精确停止命令、唯一进程标识或可审计匹配规则。禁止 `killall java` 等可能影响其他服务的命令；PID 文件是可选的，不是标准前置条件。

### Mode-specific environment loading

systemd 模式沿用 unit 的 `EnvironmentFile`；Shell 模式必须由启动脚本显式加载外置 env 文件，之后再启动主进程。Skill 只验证路径、可读性和加载动作，不读取值。若 env 文件格式不能安全被 Shell 加载，服务必须提供兼容的加载器，而不是直接猜测解析方式。

### Same release and rollback gates

模式只改变生命周期动作，不改变预检、版本目录准备、`current` 原子切换、健康检查、失败回滚和发布记录。手动前台模式下，健康检查在用户确认服务已启动后继续执行；用户未确认时状态为 dry-run/待人工确认。

## Risks / Trade-offs

- [Risk] 直接运行版本内脚本未加载外置 env → [Mitigation] 在 manual 模式启动前强制检查显式加载动作并在报告中标注。
- [Risk] 无 PID 文件时误杀其他 Java 进程 → [Mitigation] 前台模式优先使用 Ctrl+C；后台模式要求精确停止契约，禁止宽泛匹配。
- [Risk] 手动前台模式无法由部署代理自动观察 → [Mitigation] 输出可复制启动命令和明确的人工确认点，确认后再做健康检查。
- [Risk] systemd 和 Shell 启动路径加载不同配置 → [Mitigation] 将环境加载方式作为生命周期模式的一部分记录并校验。

## Migration Plan

1. 为每个服务声明 `lifecycle.mode`、启动、停止、状态、健康检查和 env 文件路径。
2. 保留当前 systemd unit 的 `EnvironmentFile` 方式；需要手动运行时，补充一个显式加载 env 的前台启动命令。
3. 发布时仍按原版本目录和 `current` 切换流程执行，切换后按选定模式启动或输出人工命令。
4. 健康检查失败时按原回滚流程恢复 `current`；手动模式无法停止时立即暂停并请求人工操作，不执行模糊 kill。

## Open Questions

无。模式选择和服务命令属于每次部署输入，不改变通用规格。
