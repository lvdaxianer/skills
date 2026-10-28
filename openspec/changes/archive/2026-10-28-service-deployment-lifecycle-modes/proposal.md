# Proposal

## Why

当前部署标准已经定义了版本目录和 `current` 切换，但生命周期示例仍容易让使用者误以为必须依赖 systemd 或 PID 文件。实际服务可能需要 systemd 托管，也可能由运维人员在前台手动启动和通过 `Ctrl+C` 关闭，因此 Skill 需要明确支持两类运行方式。

## What Changes

- 将生命周期操作抽象为显式模式：`systemd`、`manual-foreground` 和可选的 `manual-background`。
- 明确 systemd 通过 `EnvironmentFile` 加载外置环境文件，Shell 手动启动必须显式加载该文件。
- 明确手动前台模式不要求 PID 文件、不要求 systemd，启动后由操作者通过 `Ctrl+C` 停止。
- 明确后台手动模式必须提供安全的停止方式，禁止使用宽泛的 `killall java`。
- 将生命周期模式、启动、停止、状态和健康检查输入加入部署指南与 knowledge-app 参考案例。
- 增加评测用例，验证 systemd 与手动前台两种路径都能复用同一套发布流程。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `service-deployment-standard`: 扩展生命周期命令和环境变量加载要求，支持 systemd、手动前台和手动后台模式。

## Impact

- 修改 `service-deploy/SKILL.md` 及其 references 和 evals。
- 同步本地注册的 `/Users/lvdaxianer/.codex/skills/service-deployment`。
- 更新 `openspec/specs/service-deployment-standard/spec.md`，并归档本次 delta。
- 不修改远程服务器、不修改服务代码、不读取环境变量值。
