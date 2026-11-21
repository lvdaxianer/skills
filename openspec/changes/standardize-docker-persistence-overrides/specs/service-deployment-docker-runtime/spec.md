# Delta: service-deployment-docker-runtime

## MODIFIED Requirements

### Requirement: Persistent data is explicitly classified and mounted

Every Docker mount MUST declare host path, container path, purpose, read-only flag, backup policy and restore procedure. The package MUST first present a customer confirmation table for frontend, backend, `lib`, `conf`, database, object storage and other non-rebuildable resources; every row MUST be explicitly confirmed as `host-persistent`, `external-managed` or an inapplicable reason before any stop, write or container creation. Cross-release live configuration MUST use `<service-root>/conf/`; release-bound replaceable assets such as frontend/static assets, backend packages, `html`, `lib`, configuration overrides and future declared extension points MUST live under the selected `<service-root>/releases/<release-id>/overrides/`. The container writable layer MUST NOT be the only copy of business data, configuration, certificates, release records, non-rebuildable indexes or operator-replaceable assets.

#### Scenario: Recreate a container with external configuration and overrides

- **WHEN** a container is removed and recreated from the same release manifest
- **THEN** the declared `conf` mount and every declared release-bound override mount are present, read-only where required, and the effective files remain available

#### Scenario: Recreate a container

- **WHEN** the container is removed and recreated from the same release manifest
- **THEN** every mount marked required-persistent is present and its data remains available

#### Scenario: Undeclared writable data path

- **WHEN** the application writes business data only to the container writable layer
- **THEN** validation MUST reject the deployment or require an explicit persistence mount before start

#### Scenario: Unclassified future resource

- **WHEN** an operator wants to persist or replace a resource that is not `conf`, `lib`, `html`, data, logs, volume or a declared extension point
- **THEN** validation MUST fail until its purpose, physical host path, container path, precedence, backup and restore procedure are declared in the release/persistence manifests

#### Scenario: Unconfirmed default resource

- **WHEN** the customer has not confirmed the persistence target and recovery owner for a default resource such as frontend, backend, `lib`, `conf`, database or object storage
- **THEN** deployment MUST remain dry-run and MUST NOT stop the current service, create a container or update `current`

#### Scenario: Empty host override keeps packaged default

- **WHEN** a confirmed Docker host persistence directory for a code or configuration resource exists but contains no override file
- **THEN** the runtime MUST use the packaged image default and MUST retain the empty directory as the auditable persistence boundary

#### Scenario: Docker persistence target is not an absolute host path

- **WHEN** a Docker resource uses a relative path, unresolved variable, anonymous volume or unreviewed named volume as its persistence target
- **THEN** preflight MUST fail before Compose rendering or container creation

### Requirement: Incremental overrides preserve packaged defaults

The runtime MUST support a release-bound host override layer for declared JARs, HTML/static assets, configuration and future extension points. Overrides MUST be regular files, mounted read-only, validated by manifest and SHA-256, loaded with deterministic precedence, and MUST NOT replace the packaged `/app/lib`, entrypoint or an entire packaged asset root. HTML overrides MUST use an exact runtime-declared container path; if the image does not expose such a path, the deployment MUST record `embedded-in-image` and reject an invented mount.

#### Scenario: Add or replace an HTML asset

- **WHEN** a new release declares a checksum-matching file under `overrides/html/` and the service declares its exact static-asset extension path
- **THEN** the runtime loads that asset from the selected release override while retaining packaged assets not replaced by the manifest

#### Scenario: Add an override JAR

- **WHEN** a manifest declares a readable, owned and checksum-matching JAR under `overrides/lib/`
- **THEN** the runtime loads it before packaged libraries while retaining all non-replaced packaged libraries

#### Scenario: Override directory is mounted over packaged lib

- **WHEN** a Compose manifest mounts host `overrides/lib` directly on the image's `/app/lib`
- **THEN** validation MUST fail because the packaged default library set would be hidden

#### Scenario: Global override directory is used

- **WHEN** Compose mounts `<service-root>/overrides` or a mutable host directory over `/app/lib`, the entrypoint, or an undeclared asset root
- **THEN** validation MUST fail before stopping the current container

### Requirement: Override changes are deployment inputs

Adding, replacing or removing an `html`, `lib`, configuration or future extension override MUST create a complete new release-bound override unit and go through the apply workflow. The workflow MUST validate compatibility, render a physical release Compose path, restart or recreate the exact target container, run the declared health/smoke and loaded-artifact checks, and record the override/persistence manifest checksums. A failed operation MUST restore the recorded previous release/override set or enter incident state.

#### Scenario: Valid incremental replacement

- **WHEN** only a declared override file changes and the new manifest, image identity, mount boundary, compatibility evidence and health matrix pass
- **THEN** the change becomes active with the new release identity and records the unchanged packaged defaults plus the changed file checksum

#### Scenario: Valid override application

- **WHEN** the override manifest, image identity and health matrix pass
- **THEN** the new override set is recorded with the active release and its load order

#### Scenario: Override health failure

- **WHEN** the container fails health after an override change
- **THEN** the deployment MUST stop the new container identity and restore the recorded previous override set before declaring rollback success

#### Scenario: Incremental replacement health failure

- **WHEN** the container fails readiness, dependency, smoke or effective-load verification after an override change
- **THEN** deployment MUST stop only the new container identity and restore the recorded previous release-bound override unit; it MUST NOT mutate a shared global override directory
