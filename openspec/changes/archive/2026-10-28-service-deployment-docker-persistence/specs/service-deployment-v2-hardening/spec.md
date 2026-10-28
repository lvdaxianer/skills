# Spec Delta

## ADDED Requirements

### Requirement: Docker artifacts and mounts are validated before replacement

Docker deployment MUST validate image digest, OCI metadata, Compose rendering, host mount boundaries, mount permissions and required persistent paths before stopping the current runtime.

#### Scenario: Compose renders an unsafe host path
- **WHEN** a rendered mount resolves outside service-root or targets a protected release/configuration boundary without declaration
- **THEN** validation MUST fail before container replacement

#### Scenario: Image metadata is incomplete
- **WHEN** the pulled image lacks the declared release ID, source commit or digest match
- **THEN** validation MUST fail and preserve current

### Requirement: Override artifacts are auditable and non-executable as deployment instructions

JAR and configuration overrides MUST be regular files with approved owner/group and mode, checksum-matched to an override manifest, and loaded only through declared extension points. Override content MUST NOT provide shell commands, entrypoints or arbitrary host paths.

#### Scenario: Override manifest checksum mismatch
- **WHEN** an override file differs from its declared SHA-256
- **THEN** deployment MUST fail before switch and MUST NOT print the file contents

#### Scenario: Override attempts to replace entrypoint
- **WHEN** an override declares a startup script, Docker socket mount or host-root mount
- **THEN** validation MUST reject the override

### Requirement: Docker rollback verifies resources as well as release pointers

Container rollback MUST restore the recorded previous image digest, current release descriptor, override manifest and required persistence mounts, then rerun status/readiness/liveness and business smoke checks.

#### Scenario: Previous image is unavailable
- **WHEN** rollback cannot pull or locate the recorded previous digest
- **THEN** rollback MUST become failed with incident evidence and MUST NOT select a third release

#### Scenario: Previous runtime passes after restoration
- **WHEN** previous digest, mounts, override checksums and all required health checks pass
- **THEN** rollback may be recorded as rolled-back with the exact restored inputs
