# service-deployment-persistence-gate Specification

## Purpose

为 VM、Docker 和 Kubernetes 部署建立默认资源确认、模式化持久化目标、镜像回退和未满足即停止的统一门禁。

## Requirements

### Requirement: Deployment resources require explicit persistence decisions

Every package supporting Docker or Kubernetes MUST declare a persistence resource catalog with default rows for frontend, backend, `lib`, `conf`, database, object-storage and other non-rebuildable resources. Each row MUST have a customer decision, recovery owner, backup policy and restore procedure before deployment mutates state.

#### Scenario: Default resource confirmation is complete

- **WHEN** every listed resource has a customer confirmation, recovery owner, backup policy and restore procedure
- **THEN** mode-specific preflight may validate the physical persistence target

#### Scenario: Default resource confirmation is incomplete

- **WHEN** any frontend, backend, `lib`, `conf`, database or object-storage row is unconfirmed
- **THEN** deployment MUST stop before modifying the service and MUST print the missing row and the required confirmation fields

### Requirement: Persistence targets are mode-specific and fail closed

Docker MUST use an existing customer-confirmed absolute host path for every `host-persistent` row. Kubernetes MUST use an existing reachable cluster and an existing bound or bindable PVC/PV for every `cluster-persistent` row; Kubernetes MUST NOT silently use `hostPath`, create a cluster, or fall back to Docker/VM. External-managed rows MUST name the external owner and non-sensitive recovery evidence.

#### Scenario: Docker host persistence passes

- **WHEN** the resolved absolute host path exists under the confirmed service root, has the declared ownership/permissions/space and is backed up according to the manifest
- **THEN** the deployment may render the exact Compose mount

#### Scenario: Kubernetes PVC/PV is missing

- **WHEN** a required PVC/PV, StorageClass, binding or recovery policy is missing
- **THEN** the deployment MUST stop before creating application resources and MUST report the exact storage prerequisite

#### Scenario: Kubernetes hostPath appears as fallback

- **WHEN** a Kubernetes manifest uses `hostPath` because a PVC/PV is unavailable
- **THEN** validation MUST fail and MUST NOT create or update the application workload

### Requirement: Image defaults remain available while persisted overrides are auditable

Frontend, backend, library and configuration resources MAY have complete defaults in the image. A confirmed empty host override directory or PVC MUST use the image default; a non-empty override MUST be read-only, checksum-validated and loaded only through a declared independent extension point. No persistence mount may replace `/app`, `/app/bin`, `/app/lib`, `/app/html` or the entrypoint.

#### Scenario: Empty override uses image default

- **WHEN** the confirmed host directory or PVC contains no override file
- **THEN** the service MUST start with the packaged image resource and record the empty override boundary

#### Scenario: Override resource is loaded

- **WHEN** a confirmed override file matches its manifest checksum and declared extension path
- **THEN** the service MUST load it with the declared precedence while retaining packaged resources not replaced

#### Scenario: Root masking is attempted

- **WHEN** an override mount targets a packaged resource root or entrypoint
- **THEN** validation MUST fail before stopping or replacing the current workload
