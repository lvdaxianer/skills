# service-deployment-docker-runtime Specification

## Purpose
为 Docker 容器服务建立可验证的镜像、宿主机持久化、增量覆盖、生命周期、回滚和恢复契约，使删除并重建容器不会丢失声明必须保留的数据。

## Requirements

### Requirement: Docker releases pin immutable image artifacts

Docker 发布 MUST 使用通过 SHA-256 digest 固定的镜像，并记录 service、release、source commit、构建时间和 provenance/SBOM 状态；生产部署不得使用 `latest`、`dev` 或 `snapshot` 作为唯一定位。

#### Scenario: Deploy a verified image
- **WHEN** deployment manifest contains an image reference and digest that match the pulled image
- **THEN** deployment may continue and the digest is written to the release record

#### Scenario: Mutable tag is the only artifact reference
- **WHEN** the manifest only contains `latest` or another mutable tag
- **THEN** validation MUST fail before container replacement

### Requirement: Persistent data is explicitly classified and mounted

Every container mount MUST declare its host path, container path, purpose, read-only flag, backup policy and restore procedure. Business data, external configuration, certificates, release records and non-rebuildable indexes MUST survive container recreation; container writable layers, PID files, locks, temporary files and rebuildable caches MUST NOT be the source of durable data.

#### Scenario: Recreate a container
- **WHEN** the container is removed and recreated from the same release manifest
- **THEN** every mount marked required-persistent is present and its data remains available

#### Scenario: Undeclared writable data path
- **WHEN** the application writes business data only to the container writable layer
- **THEN** validation MUST reject the deployment or require an explicit persistence mount before start

### Requirement: Incremental overrides preserve packaged defaults

The runtime MUST support an explicit host `overrides/` layer for declared configuration and JAR additions/replacements. Overrides MUST be mounted read-only, validated by manifest and SHA-256, loaded with deterministic precedence before packaged defaults, and MUST NOT replace the entire packaged `lib` directory or startup files.

#### Scenario: Add an override JAR
- **WHEN** a manifest declares a readable, owned and checksum-matching JAR under `overrides/lib/`
- **THEN** the runtime loads it before packaged libraries while retaining all non-replaced packaged libraries

#### Scenario: Override directory is mounted over packaged lib
- **WHEN** a Compose manifest mounts host `overrides/lib` directly on the image's `/app/lib`
- **THEN** validation MUST fail because the packaged default library set would be hidden

### Requirement: Override changes are deployment inputs

Adding, replacing or removing an override MUST go through an apply operation that validates compatibility, restarts or recreates the exact target container, runs the declared health and smoke checks, and records the override manifest checksum and file checksums. A failed override operation MUST restore the previous override set or enter incident state.

#### Scenario: Valid override application
- **WHEN** the override manifest, image identity and health matrix pass
- **THEN** the new override set is recorded with the active release and its load order

#### Scenario: Override health failure
- **WHEN** the container fails health after an override change
- **THEN** the deployment MUST stop the new container identity and restore the recorded previous override set before declaring rollback success

### Requirement: Container identity is verified before stop and after start

Docker lifecycle operations MUST target an exact Compose project/container name or recorded container ID and MUST verify service, release label, image digest, process state, configured user, mounts and port ownership. Broad container deletion, host Docker socket mounts and volume deletion are forbidden by default.

#### Scenario: Start the intended release
- **WHEN** a container is running with matching service/release labels, digest, mounts and ports
- **THEN** the container may enter health verification

#### Scenario: Ambiguous container identity
- **WHEN** more than one container matches the service name or the digest/label does not match current
- **THEN** stop, switch and rollback MUST fail closed and require reconciliation

### Requirement: Container recovery reconstructs from durable state

After SSH interruption or host reboot, recovery MUST inspect the durable release record, current target, image digest, override manifest, persistent mounts and container identity before starting anything. `systemd` is the recommended unattended adapter; manual-background MUST not claim automatic recovery without an explicit operator runbook.

#### Scenario: Recover after container restart
- **WHEN** the host restarts and current points to a verified release with available image and mounts
- **THEN** reconcile may recreate the exact container and rerun status/readiness/liveness/smoke checks

#### Scenario: Missing persistent mount during recovery
- **WHEN** a required data or configuration mount is missing
- **THEN** recovery MUST stop before start and report the missing backup/restore action

### Requirement: Container images and persistent resources have separate retention

Release retention MUST preserve current, previous, active, failed and unverified release descriptors and their referenced image digests. Image deletion MUST use an exact digest after no retained or running release references it; `docker system prune -a` and implicit volume deletion are forbidden.

#### Scenario: Apply five-release retention
- **WHEN** retention selects an old verified release
- **THEN** it may delete only the exact release descriptor and unreferenced image digest after preview and path checks

#### Scenario: Old image is still referenced
- **WHEN** a running, protected or retained release references the image digest
- **THEN** the image MUST be kept even if its release directory is otherwise eligible
