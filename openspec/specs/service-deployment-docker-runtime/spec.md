# service-deployment-docker-runtime Specification

## Purpose
为 Docker 容器服务建立可验证的镜像、宿主机持久化、增量覆盖、生命周期、回滚和恢复契约，使删除并重建容器不会丢失声明必须保留的数据。

## Requirements

### Requirement: Docker releases pin immutable image artifacts

Docker 发布 MUST 明确 `image_transport` 为 `registry`、`local-daemon` 或 `archive`。三种模式都 MUST 维护不可复用的 `<service>:<release-id>` 历史 tag、可审计的 `<service>:latest` verified 移动别名和生产使用的不可变镜像身份；Registry digest 只适用于 `registry`，无 Registry 时必须记录本地 image ID，禁止伪造远程 digest。

#### Scenario: Deploy a verified image
- **WHEN** a deployment manifest contains a mode-specific immutable image identity that matches the inspected or loaded image
- **THEN** deployment may continue and the Registry digest or local image ID is written to the release record

#### Scenario: Mutable tag is the only artifact reference
- **WHEN** the manifest only contains `latest` or another mutable tag
- **THEN** validation MUST fail before container replacement

#### Scenario: Runtime dependency download
- **WHEN** an entrypoint, startup hook or healthcheck downloads code, a package, a model, a script or an installation archive
- **THEN** image/deployment validation MUST fail before the container is accepted

#### Scenario: Declared business dependency access
- **WHEN** the service needs a database, Redis, object store or other declared runtime dependency
- **THEN** the dependency endpoint MAY be reachable, but registry, package, code and model repositories MUST remain outside the runtime allowlist

#### Scenario: Publish a verified release and latest alias
- **WHEN** the mode-specific image identity is inspected or loaded, the container is deployed by that identity, all declared health/smoke checks pass and the release record is written
- **THEN** the operator MAY update `latest` to that exact digest or local image ID and MUST verify the alias resolves to the same identity

#### Scenario: Failed release keeps latest unchanged
- **WHEN** build, start, health or smoke validation fails
- **THEN** the release tag and failed record remain available, but `latest` MUST continue pointing to the previous verified image identity

#### Scenario: Rollback updates latest after health passes
- **WHEN** the new release fails and the recorded previous release passes rollback status and health checks
- **THEN** `latest` MUST be updated to the previous Registry digest or local image ID; if alias update fails, the running rollback remains identity-pinned and the failure is recorded for retry

#### Scenario: Latest-only deployment
- **WHEN** a production manifest contains only `<service>:latest` without a resolved mode-specific identity
- **THEN** validation MUST fail before container replacement

#### Scenario: Registry image deployment
- **WHEN** `image_transport=registry` 且 release tag 可解析到已校验的 manifest digest
- **THEN** deployment may pull and start the exact digest, and registry authentication/pull evidence is recorded

#### Scenario: Local daemon deployment without Registry
- **WHEN** `image_transport=local-daemon` 且目标主机已有匹配 release tag 和 image ID
- **THEN** deployment may start the local image by its recorded image ID without running `docker pull` or requiring Registry credentials

#### Scenario: Archive image deployment without Registry
- **WHEN** `image_transport=archive` 的 `docker save` 归档 SHA-256 校验通过并成功 `docker load`
- **THEN** deployment MUST inspect the loaded image ID, release tag and OCI labels before start

#### Scenario: Update latest locally
- **WHEN** a local-daemon or archive release passes health/smoke checks and its record is verified
- **THEN** deployment MAY run an exact local `docker tag` to update `latest` and MUST verify the alias points to the recorded image identity

#### Scenario: Missing local rollback image
- **WHEN** rollback target image ID is absent and no verified archive can restore it
- **THEN** rollback MUST fail and report incident; it MUST NOT select a third image or delete volumes

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

Docker lifecycle operations MUST target an exact Compose project/container name or recorded container ID and MUST verify service, release label, Registry digest or local image ID, process state, configured user, mounts and port ownership. Broad container deletion, host Docker socket mounts and volume deletion are forbidden by default.

#### Scenario: Start the intended release
- **WHEN** a container is running with matching service/release labels, digest, mounts and ports
- **THEN** the container may enter health verification

#### Scenario: Ambiguous container identity
- **WHEN** more than one container matches the service name or the digest/label does not match current
- **THEN** stop, switch and rollback MUST fail closed and require reconciliation

### Requirement: Container recovery reconstructs from durable state

After SSH interruption or host reboot, recovery MUST inspect the durable release record, current target, selected transport's image identity or verified archive, override manifest, persistent mounts and container identity before starting anything. `systemd` is the recommended unattended adapter; manual-background MUST not claim automatic recovery without an explicit operator runbook.

#### Scenario: Recover after container restart
- **WHEN** the host restarts and current points to a verified release with available image and mounts
- **THEN** reconcile may recreate the exact container and rerun status/readiness/liveness/smoke checks

#### Scenario: Missing persistent mount during recovery
- **WHEN** a required data or configuration mount is missing
- **THEN** recovery MUST stop before start and report the missing backup/restore action

### Requirement: Container images and persistent resources have separate retention

Release retention MUST preserve current, previous, active, failed and unverified release descriptors and their referenced Registry digests or local image IDs. Image/archive deletion MUST use an exact unreferenced identity after preview; `docker system prune -a` and implicit volume deletion are forbidden.

#### Scenario: Apply five-release retention
- **WHEN** retention selects an old verified release
- **THEN** it may delete only the exact release descriptor and unreferenced image digest after preview and path checks

#### Scenario: Old image is still referenced
- **WHEN** a running, protected or retained release references the image digest
- **THEN** the image MUST be kept even if its release directory is otherwise eligible
