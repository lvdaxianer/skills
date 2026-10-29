## MODIFIED Requirements

### Requirement: Docker releases pin immutable image artifacts

Docker 发布 MUST 同时维护不可复用的 `<repository>:<release-id>` 历史 tag、可审计的 `<repository>:latest` verified 移动别名和生产使用的 `<repository>@sha256:<digest>` 不可变引用。`latest` 不能单独作为部署 artifact；部署前必须解析并记录 digest。

#### Scenario: Deploy a verified image
- **WHEN** deployment manifest contains an image reference and digest that match the pulled image
- **THEN** deployment may continue and the digest is written to the release record

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
- **WHEN** the release tag is pushed, the image digest is inspected, the container is deployed by digest, all declared health/smoke checks pass and the release record is written
- **THEN** the operator MAY update `latest` to that exact digest and MUST verify that `latest` resolves to the same digest

#### Scenario: Failed release keeps latest unchanged
- **WHEN** build, start, health or smoke validation fails
- **THEN** the release tag and failed record remain available, but `latest` MUST continue pointing to the previous verified digest

#### Scenario: Rollback updates latest after health passes
- **WHEN** the new release fails and the recorded previous release passes rollback status and health checks
- **THEN** `latest` MUST be updated to the previous release digest; if alias update fails, the running rollback remains digest-pinned and the failure is recorded for retry

#### Scenario: Latest-only deployment
- **WHEN** a production manifest contains only `<repository>:latest` without a resolved digest
- **THEN** validation MUST fail before container replacement
