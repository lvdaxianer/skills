## MODIFIED Requirements

### Requirement: Deployment produces an auditable release record

For `runtime_target=docker-container`, the release record MUST include `image_transport`, image repository, optional Registry, immutable release tag, resolved Registry digest or local image ID, identity kind and latest alias status. `registry` MUST be nullable when the selected mode is `local-daemon` or `archive`; the record MUST identify the target identity and evidence path without recording secrets.

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
- **THEN** the record MUST show the release tag, mode-specific image identity, alias target identity and successful verification evidence

#### Scenario: Record latest alias failure
- **WHEN** the service is healthy but the selected alias update or verification cannot complete
- **THEN** the record MUST show alias status `failed`, preserve the running identity-pinned service and require an operator retry

#### Scenario: Record local Docker release
- **WHEN** a Docker release is deployed without a Registry and its local image ID, tag and health evidence pass
- **THEN** the record MUST show `image_transport`, local identity kind, release tag and latest alias target

#### Scenario: Reject missing image transport
- **WHEN** a Docker manifest does not declare whether it uses Registry, local daemon or archive
- **THEN** deployment MUST stop before container replacement and request a dry-run input
