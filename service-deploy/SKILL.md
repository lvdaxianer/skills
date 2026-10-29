---
name: service-deployment-standard
description: "Use for Linux service deploy, upgrade, rollback, restart, release, Docker image build/deploy, container persistence, incremental JAR/config overrides, or deployment-standard work. Enforces v2 immutable releases/current, external configuration, validated artifacts, safe lifecycle modes, health gates, auditable rollback, five-release retention, and optional backend/frontend/nginx/Docker stack deployment."
compatibility: "Linux shell utilities; systemd optional; service-specific lifecycle and health commands required."
---

# Service Deployment Standard v2

Use this Skill whenever a service is deployed, upgraded, rolled back, restarted, published, or standardized on Linux. It is a contract for deployment decisions, not a service-specific implementation. Never connect to a server, execute a real deployment, or expose secrets unless the user explicitly authorizes that operation in the current request.

## Non-negotiable invariants

- `service_root = deploy_root/service_name`; `deploy_root` is an absolute user input, default `/opt`. A custom root such as `/uinnova/deploy` MUST never write the default tree.
- `runtime_target` MUST be explicitly `host-process` or `docker-container`. Docker does not remove or rename the lifecycle modes `systemd`, `manual-foreground` and `manual-background`.
- Releases are immutable directories under `<service-root>/releases/`; runtime configuration, logs, run state and records stay outside releases.
- For Docker, the release is an immutable release tag plus its resolved image digest, a release descriptor and the auditable `latest` alias state; the container writable layer MUST NOT be the only copy of business data, configuration, certificates, release records or non-rebuildable indexes.
- Docker image references MUST use `<registry>/<service-name>:<release-id>` for history, `<registry>/<service-name>:latest` only as the latest verified-release pointer, and `<registry>/<service-name>@sha256:<digest>` for production start and rollback. A short SHA-only tag is not a standard deployment identity.
- Docker host mounts MUST be declared with purpose, container path, read-only flag, backup policy and restore procedure. `conf/`, non-rebuildable `data/`, declared `volumes/`, `overrides/` and `release-records/` are durable inputs; `run/`, temp, PID state and rebuildable caches are not.
- A Docker `overrides/` layer MAY add/replace declared configuration and JARs, but MUST be read-only, manifest/checksum validated, recorded and loaded before packaged defaults without mounting over the packaged `/app/lib` or entrypoint.
- Docker images MUST satisfy [dockerfile-standard.md](references/dockerfile-standard.md): build-time dependencies are pinned and verified, runtime resources are already present in the image or declared mounts, and entrypoint/startup/healthcheck commands MUST NOT download or install resources at runtime.
- New release IDs MUST match exactly:

  ```text
  <service-name>-<YYYYMMDDHHmmss>-<version-or-git-short-sha>-<three-digit-sequence>
  ```

- `service-name` is lowercase `[a-z0-9][a-z0-9-]{0,62}`; timestamp is 14 digits; version/SHA is `[A-Za-z0-9][A-Za-z0-9._+~-]{0,63}`; sequence is exactly three digits. The entire ID MUST match `^[a-z0-9][a-z0-9-]{0,62}-[0-9]{14}-[A-Za-z0-9][A-Za-z0-9._+~-]{0,63}-[0-9]{3}$`.
- Version source priority is Git short SHA, normalized package version, then literal `manual`. Missing Git metadata MUST NOT be guessed.
- The sequence is service-local, monotonic and never reused, including after failed releases or deletion. Allocate it under a service lock before publishing.
- `current` is a symlink to a physical directory inside `<service-root>/releases/`. Resolve with `readlink -f` or `pwd -P`; reject links outside releases, regular directories, dangling links and symlink chains escaping the boundary.
- Lifecycle mode MUST be explicitly one of `systemd`, `manual-foreground`, or `manual-background`. A PID file is optional, never sufficient evidence by itself.
- A release is successful only after status, readiness, liveness, startup-log, dependency, proxy/business smoke and loaded-artifact checks declared by the service pass. A process existing or Actuator `UP` alone is insufficient.
- Any failed release remains on disk and is marked failed/unverified. Rollback only targets recorded `previous_release`; if rollback health fails, stop and report an incident—never guess a third release.
- Default retention is five newest verified releases, while current, previous, active, failed and unverified releases are protected. Preview before apply; delete only exact, resolved paths under releases.
- Reports and records MUST NOT contain environment values, passwords, tokens, private keys, or complete sensitive connection URLs.

## Required inputs and preconditions

Collect and validate before any stop or write action:

| Input | Required contract |
| --- | --- |
| `deploy_root` | Absolute path; default `/opt`; normalize physically before use |
| `service_name` | Lowercase slug; reject `/`, `..`, whitespace, shell metacharacters and empty values |
| `artifact` | Path/package, type, SHA-256, version source, expected files and owner/group |
| `release_number` | Allocated by the sequence state under a service lock; never manually guessed |
| `config_path` | `<service-root>/conf/<name>`; external to releases |
| `runtime_target` | Exactly `host-process` or `docker-container` |
| `lifecycle.mode` | Exactly `systemd`, `manual-foreground` or `manual-background` |
| lifecycle commands | Exact start, stop, status, readiness, liveness and smoke commands |
| Docker manifest | Required for `docker-container`: repository, immutable release tag, resolved image digest, latest alias status, Dockerfile/build evidence, Compose/CLI manifest, declared mounts, container labels and override manifest |
| persistence mounts | Required for Docker data/config/index paths: host path, container path, purpose, read-only, backup and restore procedure |
| `migration` | Whether migrations exist, compatibility class, runner and approval/backup evidence |
| `retention` | Integer `>=0`; default `5` |

If a required input is unavailable, stop with a dry-run report. Do not infer a health endpoint, process identity, database safety, or stop command.

## Ordered workflow

Read only the references relevant to the request, then execute these gates in order:

1. Resolve and record `service_root`, physical `releases`, `conf`, `logs`, `run`, `release-records`, and `current`. Acquire `<service-root>/run/deploy.lock` with `flock` or a host-equivalent exclusive lock.
2. Validate the artifact SHA-256 and archive contents before extracting into a staging directory. For Docker, validate the Dockerfile/build evidence, repository/release tag, resolved image digest, OCI labels, provenance/SBOM policy, required runtime files and rendered Compose/CLI manifest. Reject path traversal, tarbomb, unsafe links, external directory targets, bad permissions, missing required files, bundled live configuration and runtime download/install behavior.
3. Validate external configuration with the selected loader contract. Prefer a dedicated parser; a Shell loader is allowed only after restricted `KEY=value` validation. For Docker, validate every declared host mount physically and never copy a package env file over `<service-root>/conf`.
4. Allocate the next sequence in `release-records/sequence.state` (`0600`, deployment-user owned) while holding the service lock. Persist the allocation/attempt record before promoting the release; a failed attempt consumes the number.
5. Promote a complete staging directory or Docker release descriptor to `releases/<release-id>`. Run the current contract test through both `current/bin/<script>` and `releases/<release-id>/bin/<script>` paths for host-process releases; for Docker, validate the current descriptor, repository/release tag, image digest, labels, mounts, override manifest and offline/egress-restricted startup.
6. Detect migration content and apply the migration gate. Prefer expand/contract; do not allow an unapproved incompatible or irreversible migration.
7. Transition state `prepared -> validated -> stopped -> switched -> started`. Stop using the selected mode, atomically replace `current` with a same-directory temporary symlink, verify its physical target, and start the host process or exact Docker/Compose identity using the declared environment-loading path.
8. Transition to `health-verified` only after the complete health matrix passes. For manual-foreground, the operator must confirm the foreground process is running before checks; `Ctrl+C` is the stop action.
9. Write a schema-valid record and transition to `recorded`. Only after the release is verified and recorded may Docker update `<repository>:latest` to the exact verified digest and re-inspect the alias. If alias update/verification fails, keep the digest-pinned service running, record `latest_alias.status=failed`, and require an operator retry; do not roll back a healthy service solely for an alias failure. On any release failure, keep the new release/descriptor, record `failed_phase`, leave the previous `latest` unchanged, atomically restore `previous_release`, its image/override inputs and persistence manifest when Docker is used, restart it, and re-run status and health.
10. If rollback health passes, update `latest` to the previous release digest and verify it; state is `rolled-back`. If rollback health fails, state is `failed` with incident evidence and no third-release selection. Release the lock even after interruption via trap/reconcile.
11. Run `retention preview`, review the exact deletion set, then run `retention apply --apply` only after success is recorded. Retention errors never delete protected or uncertain paths.

## Reference routing

- [release-layout.md](references/release-layout.md): root, physical path, current contract and layout.
- [release-naming-and-retention.md](references/release-naming-and-retention.md): ID grammar, sequence state, lock, preview/apply and protection set.
- [artifact-and-config-security.md](references/artifact-and-config-security.md): archive, permissions, SHA-256 and env parser/source boundaries.
- [docker-deployment.md](references/docker-deployment.md): Docker image, registry, persistence, override, lifecycle, recovery and image retention contract.
- [dockerfile-standard.md](references/dockerfile-standard.md): Dockerfile structure, build/runtime boundary, resource completeness and no-runtime-download contract.
- [docker-persistence-manifest.schema.json](references/docker-persistence-manifest.schema.json): machine-readable Docker mount and override manifest schema.
- [docker-compose.template.yaml](references/docker-compose.template.yaml): safe Compose starting template; replace service-root and image digest after validation.
- [lifecycle-modes.md](references/lifecycle-modes.md): systemd, manual foreground/background, process identity and interruption handling.
- [database-and-health.md](references/database-and-health.md): migration gates and health/smoke matrix.
- [rollback-state-machine.md](references/rollback-state-machine.md): states, transitions, reconcile and incident stop.
- [stack-and-recoverability.md](references/stack-and-recoverability.md): backend/frontend/nginx/migration stacks and service recovery.
- [deployment-checklist.md](references/deployment-checklist.md): executable preflight-to-retention checklist.
- [release-record.schema.json](references/release-record.schema.json): release record schema.
- [knowledge-app-example.md](references/knowledge-app-example.md): historical layout example only; never copy its secrets or hard-code its host.
- [sceneforge-issue-mapping.md](references/sceneforge-issue-mapping.md): map observed deployment findings to v2 controls.

Reusable local helpers:

- `scripts/current-contract-test.sh`: safe current/release/service-root path contract test; it does not start a service unless explicitly asked.
- `scripts/retention.sh`: preview by default and explicit `--apply` deletion of an exact safe set.

## Required report

Use the same keys as the schema, including:

```text
schema_version, service, service_root, host, operator, timestamp, timezone,
runtime_target, container,
lifecycle_mode, environment_loading, version_source, source_commit,
release_id, release_number, artifact, artifact_checksum, previous_release,
current, status, failed_phase, health_check, smoke_check, rollback_target,
rollback_result, retention, deleted_releases, record_path
```

For a Docker report, also include image repository, immutable release tag, image digest, latest alias status/target digest/evidence path, Compose project, container ID when available, persistence mount summary, override manifest checksum and effective override files. For a dry run, label it `dry_run: true`, list exact commands and missing inputs, and do not fabricate status, health or checksum results.
