## MODIFIED Requirements

### Requirement: Deployment produces an auditable release record

For `runtime_target=docker-container`, the release record MUST include the image repository, immutable release tag, resolved digest and latest alias status. Alias status MUST distinguish `updated`, `not_attempted`, `failed` and `not_applicable`; it MUST include the target digest and evidence path when an update was attempted, without recording secrets.

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

#### Scenario: Record verified Docker image alias
- **WHEN** a Docker release passes health/smoke checks and `latest` is updated
- **THEN** the record MUST show the release tag, resolved digest, alias target digest and successful verification evidence

#### Scenario: Record latest alias failure
- **WHEN** the service is healthy but the registry cannot update or verify `latest`
- **THEN** the record MUST show alias status `failed`, preserve the running digest-pinned service and require an operator retry
