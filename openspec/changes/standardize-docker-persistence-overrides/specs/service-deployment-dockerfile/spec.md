# Delta: service-deployment-dockerfile

## MODIFIED Requirements

### Requirement: Runtime image has a deterministic local contract

The runtime image MUST use stable `/app/bin`, `/app/lib`, `/app/conf`, `/app/html` or another service-declared static path, and `/app/overrides/<extension>` paths for incremental replacements. Packaged defaults MUST remain in the image. A service-specific extension path MUST document its merge/load rule, ownership and whether it is eligible for a release-bound read-only mount; undeclared host paths are invalid.

#### Scenario: HTML override path is declared

- **WHEN** the image packages static assets under `/app/html` and the launcher declares `/app/overrides/html` as its extension point
- **THEN** deployment may mount the selected release's `overrides/html` read-only and must verify the effective asset path during health/smoke checks

#### Scenario: Runtime starts from an implicit working directory

- **WHEN** the entrypoint depends on the caller's current directory or an undeclared host file
- **THEN** the Dockerfile or runtime validation MUST fail before deployment

#### Scenario: Entrypoint does not replace the main process

- **WHEN** the entrypoint starts the service without `exec` or launches a shell supervisor with no declared identity contract
- **THEN** lifecycle and signal handling validation MUST fail

#### Scenario: Runtime has no tested HTML extension point

- **WHEN** static assets are embedded in an image without a declared merge/load path
- **THEN** deployment MUST keep them `embedded-in-image` and MUST NOT fabricate a host mount that masks the packaged asset tree

### Requirement: Runtime startup cannot download or install resources

All packaged defaults and release-bound override inputs MUST be available before startup. Runtime entrypoint, startup hooks and healthchecks MUST not fetch, install, copy from arbitrary host paths or mutate the release-bound override unit to activate a change.

#### Scenario: Override is applied without image rebuild

- **WHEN** a release-bound `html` or `lib` override is prepared and validated before container recreation
- **THEN** startup may load it from the declared read-only extension path without downloading or installing any resource at runtime

#### Scenario: Container starts with no external download access

- **WHEN** the service is started with egress denied except for explicitly declared business dependencies
- **THEN** startup, readiness and liveness MUST pass without fetching or installing resources

#### Scenario: Startup attempts an undeclared download

- **WHEN** bounded startup logs, process command lines, filesystem changes or network policy evidence show a resource download or runtime install
- **THEN** deployment MUST fail before current/container replacement is accepted, and the release MUST remain failed/unverified

#### Scenario: Business dependency access is required

- **WHEN** the service needs a database, Redis, object store or other declared runtime dependency
- **THEN** the dependency endpoint MAY be reachable, but registry, package, code and model repositories MUST remain outside the runtime allowlist
