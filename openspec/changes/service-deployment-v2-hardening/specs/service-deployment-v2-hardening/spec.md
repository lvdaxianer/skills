# Spec Delta

## Purpose

为 Linux 服务发布提供明确的安全验证、健康门禁、失败恢复、记录审计和多组件协同规则，使部署行为可复制、可检查且不会因路径、进程或归档歧义扩大影响范围。

## ADDED Requirements

### Requirement: Artifact archives are safe to extract

发布归档 MUST 通过 SHA-256 校验，并拒绝绝对路径、`../` 路径、越界符号链接、tarbomb 多余顶层目录以及覆盖外置运行目录的条目。

#### Scenario: Reject a path traversal archive
- **WHEN** tar 条目包含绝对路径、父目录跳转或指向 releases 外的符号链接
- **THEN** extraction MUST fail before final release directory is created

#### Scenario: Verify release contents
- **WHEN** archive checksum、必需文件、脚本 executable bit 和 owner/group 校验通过
- **THEN** only the complete validated staging directory may be promoted

### Requirement: Database migration is a release gate

部署 MUST 检测 release 是否包含迁移；Flyway 自动迁移、schema 兼容性、不可逆迁移备份/审批和代码回滚不回滚 schema MUST 被明确记录。

#### Scenario: Incompatible migration
- **WHEN** migration cannot be forward/backward compatible with the previous code
- **THEN** deployment MUST stop before switch unless backup and required human approval are recorded

#### Scenario: Roll back application only
- **WHEN** application health fails after a migration ran
- **THEN** code rollback MUST NOT claim schema rollback and MUST require the migration recovery procedure

### Requirement: Health verification proves runtime behavior

成功发布 MUST 根据服务声明执行 status、readiness、liveness、启动超时/重试、日志错误、依赖、代理、真实业务 API smoke test，并验证实际加载的 JAR 或 executable 来自 current release。

#### Scenario: Process exists but readiness fails
- **WHEN** 进程存在但 readiness、依赖或业务 smoke test 失败
- **THEN** release MUST be treated as failed and rollback rules apply

#### Scenario: Loaded artifact is old
- **WHEN** process cmdline、working directory 或 classpath 显示加载的 artifact 不属于 current target
- **THEN** health verification MUST fail

### Requirement: Deployment state is recoverable after interruption

流程 MUST 使用 `prepared`、`validated`、`stopped`、`switched`、`started`、`health-verified`、`recorded`、`rolled-back`、`failed` 状态，并保留临时状态以支持 SSH 中断后的 reconcile/recovery。

#### Scenario: Interrupted after switch
- **WHEN** SSH 在 switched 或 started 阶段中断
- **THEN** reconcile MUST read the state record, verify current and process identity, and either continue verification or perform the recorded rollback

#### Scenario: Failed rollback health
- **WHEN** rollback health fails
- **THEN** state MUST become failed with incident evidence and no automatic third-release selection

### Requirement: Stack deployments preserve component compatibility

多组件发布 MUST 使用 manifest 绑定 backend、frontend、nginx 和 migration 的 deployment ID、兼容版本和发布顺序；局部失败时按依赖逆序回滚，并验证 Nginx 配置、首页、History fallback、API proxy 和管理端口边界。

#### Scenario: Backend and frontend mismatch
- **WHEN** manifest declares incompatible frontend/backend versions
- **THEN** stack deployment MUST fail before traffic switch

#### Scenario: Public management port
- **WHEN** management port such as 8081 is reachable from the public interface
- **THEN** deployment MUST fail the network boundary check and report firewall/TLS/listener ownership
