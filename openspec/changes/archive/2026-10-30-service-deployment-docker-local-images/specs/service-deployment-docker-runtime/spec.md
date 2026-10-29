## MODIFIED Requirements

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
