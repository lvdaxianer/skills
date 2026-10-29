## MODIFIED Requirements

### Requirement: Docker releases pin immutable image artifacts

Docker 发布 MUST 使用通过 SHA-256 digest 固定的镜像，并记录 service、release、source commit、构建时间和 provenance/SBOM 状态；生产部署不得使用 `latest`、`dev` 或 `snapshot` 作为唯一定位。镜像还 MUST 满足 Dockerfile 标准，且运行阶段不得依赖从 registry、包仓库、代码仓库或模型仓库下载资源。

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
