# service-deployment-dockerfile Specification

## Purpose

为生产容器建立可复现、可审计、最小权限且不依赖运行时联网下载的 Dockerfile、镜像内容、启动入口、资源完整性和健康验收契约。

## Requirements

### Requirement: Dockerfiles are reproducible and scoped

Dockerfile MUST use a digest-pinned base image, a complete `.dockerignore` and a reproducible build context. The build context and every `COPY`/`ADD` source MUST be limited to declared application artifacts, packaged defaults and declared libraries. Secrets, live host configuration, `.git`, logs, release records and private keys MUST NOT enter the context or image layers.

#### Scenario: Unpinned or untrusted base image
- **WHEN** a Dockerfile uses a mutable tag without a digest or an unapproved build context
- **THEN** image validation MUST fail before publishing the image

#### Scenario: Secret or host configuration in build context
- **WHEN** the context contains credentials, private keys, live `conf/`, `logs/`, `run/` or release records
- **THEN** the build MUST fail or the files MUST be excluded before the Docker build starts

### Requirement: Runtime image has a deterministic local contract

The runtime stage MUST use a fixed non-root user unless a documented exception is approved, set an explicit `WORKDIR`, copy only declared artifacts with controlled ownership and mode, and expose a local entrypoint under `/app/bin`. Java services MUST preserve packaged defaults under `/app/lib`; external incremental overrides MUST use the separate `/app/overrides/lib` path.

#### Scenario: Runtime starts from an implicit working directory
- **WHEN** the entrypoint depends on the caller's current directory or an undeclared host file
- **THEN** the Dockerfile or runtime validation MUST fail before deployment

#### Scenario: Entrypoint does not replace the main process
- **WHEN** the entrypoint starts the service without `exec` or launches a shell supervisor with no declared identity contract
- **THEN** lifecycle and signal handling validation MUST fail

### Requirement: Runtime startup cannot download or install resources

All runtime dependencies, application code, static assets, models and installation packages MUST be present in the immutable image or declared external persistence before start. `ENTRYPOINT`, `CMD`, `HEALTHCHECK`, startup scripts and runtime package hooks MUST NOT execute `curl`, `wget`, `git clone`, package-manager installation, `pip install`, `npm install`, remote shell execution, or equivalent download/install behavior.

#### Scenario: Container starts with no external download access
- **WHEN** the service is started with egress denied except for explicitly declared business dependencies
- **THEN** startup, readiness and liveness MUST pass without fetching or installing resources

#### Scenario: Startup attempts an undeclared download
- **WHEN** bounded startup logs, process command lines, filesystem changes or network policy evidence show a resource download or runtime install
- **THEN** deployment MUST fail before current/container replacement is accepted, and the release MUST remain failed/unverified

#### Scenario: Business dependency access is required
- **WHEN** the service needs a database, Redis, object store or other declared runtime dependency
- **THEN** the dependency endpoint MAY be reachable, but registry, package, code and model repositories MUST remain outside the runtime allowlist

### Requirement: Image runtime behavior is verifiable

Before deployment, the image MUST pass Dockerfile lint, digest/OCI label inspection, vulnerability/SBOM/provenance policy checks and a startup test that verifies the expected files, user, entrypoint, ports and healthcheck. Validation MUST record the image digest and MUST distinguish missing resources from resources fetched during startup.

#### Scenario: Required packaged resource is missing
- **WHEN** `/app/lib`, `/app/bin`, a declared static asset or a required model is absent from the image and no declared external mount supplies it
- **THEN** validation MUST fail before the current release is stopped

#### Scenario: Container healthcheck only proves process existence
- **WHEN** the healthcheck only tests a PID or returns success without readiness/dependency/business evidence
- **THEN** it MUST NOT be accepted as the complete deployment health result
