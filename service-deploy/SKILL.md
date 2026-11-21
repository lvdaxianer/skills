---
name: service-deployment
description: "Use for Linux service deploy, upgrade, rollback, restart, release, Docker image build/deploy, Kubernetes workload delivery, container persistence, incremental frontend/backend/JAR/config overrides, deployment-package preparation, operator-handbook writing, or deployment-standard work. Enforces v2 immutable releases/current, versioned self-contained packages, machine-verifiable three-layer preflight, customer-confirmed directories, a hard host/PVC persistence confirmation gate, mode-specific preflight, one-click operator entrypoints, external configuration, validated artifacts, safe lifecycle modes, health gates, auditable rollback, five-release retention, and optional backend/frontend/nginx/Docker stack deployment."
compatibility: "Linux shell utilities; systemd optional; service-specific lifecycle and health commands required."
---

# Service Deployment Standard v2

Use this Skill whenever a service is deployed, upgraded, rolled back, restarted, published, or standardized on Linux. It is a contract for deployment decisions, not a service-specific implementation. Never connect to a server, execute a real deployment, or expose secrets unless the user explicitly authorizes that operation in the current request.

## Non-negotiable invariants

- `DEPLOY_ROOT` is the final service deployment root, supplied as an absolute user input; `/opt` is only a proposed value until the customer confirms it. Do not append `service_name` to it. A custom root such as `/uinnova/deploy/service-root` MUST never write the default tree. `service_name` remains metadata for release IDs, image names, labels and records only.
- A deployment package MUST have an immutable `package_version`, `application_version`, source commit or explicit `manual`, build time, supported OS/architecture/modes, SHA-256 manifest and versioned filename. `latest`, `final` and unversioned archives are not deployable package identities.
- The customer MUST confirm `DEPLOY_ROOT`, `CONF_ROOT`, `DATA_ROOT`, `LOG_ROOT` and backup root before any stop, write, container creation or current switch. `/opt` is only a proposed value until confirmed; an unconfirmed directory produces dry-run only.
- Docker and Kubernetes packages MUST declare a persistence resource catalog and ask the customer to confirm frontend, backend, `lib`, `conf`, database, MinIO/object-storage and other non-rebuildable resources one by one. Missing confirmation, recovery owner, backup policy or restore procedure MUST produce dry-run only before any stop, write, container creation, Pod creation or current switch.
- Docker `host-persistent` resources MUST use customer-confirmed absolute host paths with checked ownership, permissions, space, backup and restore evidence. Kubernetes `cluster-persistent` resources MUST use existing reachable PVC/PV objects; missing or unbound storage MUST stop immediately, MUST NOT use `hostPath`, install a cluster or fall back to Docker/VM.
- Frontend, backend, `lib` and `conf` MAY retain complete defaults in the image. An empty confirmed host/PVC override boundary uses the image default; non-empty overrides MUST be checksum-validated and loaded through an independent declared extension point. No mount may replace `/app`, `/app/bin`, `/app/lib`, `/app/html` or the entrypoint.
- The operator-facing package MUST provide stable `deploy.sh`, `service.sh`, `doctor.sh`, `rollback.sh` and `uninstall.sh` entrypoints. Routine deploy, upgrade, start, stop, restart, status, log, diagnostic, rollback and uninstall actions MUST use these exact entrypoints or their documented subcommands.
- `deployment_mode` MUST be explicitly `vm`, `docker` or `kubernetes`. `vm` maps to `runtime_target=host-process`; `docker` and `kubernetes` use `runtime_target=docker-container`, but Kubernetes requires an existing reachable cluster and namespace. Missing Kubernetes MUST stop immediately and MUST NOT fall back to another mode.
- `runtime_target` MUST be explicitly `host-process` or `docker-container`. Docker does not remove or rename the lifecycle modes `systemd`, `manual-foreground` and `manual-background`.
- Releases are immutable directories under `<service-root>/releases/`; runtime configuration, logs, run state and operational records stay outside releases, while the release's own immutable descriptor/manifest stays inside that release.
- For Docker, the release is an immutable release tag plus its resolved Registry manifest digest or local image ID, a release descriptor and the auditable `latest` alias state. The release stores only its own override delta; every effective override (JAR, config, HTML/static asset or future extension) MUST resolve through its ordered immutable `override_chain` of release directories. The container writable layer MUST NOT be the only copy of business data, configuration, certificates, release records or non-rebuildable indexes.
- Docker image transport MUST be explicitly `registry`, `local-daemon` or `archive`; Registry is optional. Every mode MUST use `<service-name>:<release-id>` as an immutable local release tag, record the identity as a Registry manifest digest or local image ID, and use `latest` only as a verified moving alias. A short SHA-only tag or a latest-only deployment is not a standard deployment identity.
- The first Docker deployment for a service MUST build and verify an image before it can create the first release. A later override-only release MAY reuse the exact verified image identity from a previous release, but MUST create a new immutable release directory and a new release record; it MUST never edit the active release's overrides in place. Any change to packaged application files, Dockerfile/base image, runtime dependencies, entrypoint, healthcheck, user, ports or other image content requires a new image build.
- A later image build MAY be an explicit override-compaction release: the build may materialize the complete effective `override_chain` into the new image, but only from recorded layer manifests/checksums. The new release MUST pass image, loaded-artifact, health and smoke verification before any source-layer cleanup; only then may normal retention remove unprotected source releases. Compaction MUST record its source release IDs and effective-tree checksum, and MUST NOT delete `current`, `previous` or rollback-protected releases.
- Docker host mounts MUST be declared with purpose, container path, read-only flag, backup policy and restore procedure. Cross-release durable inputs are `conf/`, non-rebuildable `data/`, declared `volumes/`, `logs/` and `release-records/`; release-bound `overrides/` are immutable release inputs, not a global shared directory. `run/`, temp, PID state and rebuildable caches are not durable release inputs.
- A Docker `overrides/` layer MAY add/replace declared configuration, JARs, HTML/static assets or future extension points. Override-only releases MUST store only their delta in the new release and record an ordered immutable `override_chain` to earlier release layers; they MUST NOT copy the full previous effective tree or edit an old release. An override-compaction image release may have `override_strategy=none` and an empty runtime chain only when its manifest records the source chain and effective-tree checksum. The runtime adapter MUST load newer layers before older layers, read-only, with manifest/checksum validation, without mounting over the packaged `/app/lib` or entrypoint.
- The canonical Docker release unit is:
  ```text
  releases/<release-id>/
  ├── container/compose.yaml       # rendered with physical absolute paths
  ├── overrides/                   # this release's lib/html/future delta only
  ├── release-manifest.json        # image, source commit and checksums
  └── <other immutable release content>
  ```
  `current -> releases/<release-id>` is only a human/operator entry point. A Docker Compose mount MUST point at the selected physical release directory, so changing `current` changes the selected unit but cannot make an already rendered Compose file silently consume another release's override.
- Common path variables MUST be resolved once before deployment: `DEPLOY_ROOT` is the complete physical `service_root`; `RELEASE_ROOT=${DEPLOY_ROOT}/releases/<release-id>`; `CONF_ROOT=${DEPLOY_ROOT}/conf`; `DATA_ROOT=${DEPLOY_ROOT}/data`; `LOG_ROOT=${DEPLOY_ROOT}/logs`; `RUN_ROOT=${DEPLOY_ROOT}/run`; and `RECORD_ROOT=${DEPLOY_ROOT}/release-records`. Templates MUST consume these variables rather than concatenate `DEPLOY_ROOT` with `service_name`.
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
- A one-click package MUST declare a machine-verifiable `preflight` contract covering common checks, mode checks, port conflict policy, free bytes/inodes, permission targets, host resources and declared dependencies. Missing or malformed declarations MUST fail package validation.
- Preflight MUST run in three layers: package static contract validation, read-only `doctor.sh` host checks, and a `deploy.sh` mutation gate. A missing, stale, cross-package or failed report MUST keep the run in `dry-run` and MUST NOT stop, write, create a container/Pod or switch `current`.
- 端口冲突检查 MUST report the listener boundary and non-sensitive owner summary. An existing listener is acceptable only when the exact current release/container/workload identity is proven; an unknown owner is a hard failure.
- Storage checks MUST include free bytes, free inodes, package extraction space, runtime/log growth and rollback/retention reserve. Permission checks MUST validate resolved owner/group, mode and runtime-user read/write/execute access without auto-fixing them.
- 权限检查 MUST report owner/group、文件模式和运行用户的读写执行结果；权限不满足时只能 dry-run，不得自动修复。

## Required inputs and preconditions

Collect and validate before any stop or write action:

| Input | Required contract |
| --- | --- |
| `package_manifest` | Versioned `package-manifest.json` matching [deployment-package-manifest.schema.json](references/deployment-package-manifest.schema.json), package SHA-256, source commit and supported mode payloads |
| `preflight_contract` | Manifest `preflight` object declaring common/mode checks, port conflict policy, storage byte/inode thresholds, permission targets, host resources and dependency checks |
| `preflight_report` | Fresh, redacted `doctor.sh` report bound to package SHA, deployment mode, resolved physical directories and report timestamp; required before mutation |
| `package_version` | Required immutable package identity; reject `latest`, `final`, missing or content-changing reuse |
| `deployment_mode` | Explicitly `vm`, `docker` or `kubernetes`; select before mode-specific checks |
| `DEPLOY_ROOT` | Absolute final service root; `/opt` is only a proposed value until customer confirmation; normalize physically before use; never append `service_name` |
| `directory_confirmation` | Customer-confirmed absolute root/config/data/log/backup paths, owner, permissions, space and data retention decision |
| `service_name` | Lowercase slug; reject `/`, `..`, whitespace, shell metacharacters and empty values |
| `artifact` | Path/package, type, SHA-256, version source, expected files and owner/group |
| `release_number` | Allocated by the sequence state under a service lock; never manually guessed |
| `config_path` | `<service-root>/conf/<name>`; external to releases |
| `runtime_target` | Exactly `host-process` or `docker-container` |
| `lifecycle.mode` | Exactly `systemd`, `manual-foreground` or `manual-background` |
| lifecycle commands | Exact start, stop, status, readiness, liveness and smoke commands |
| Docker manifest | Required for `docker-container`: `release_mode` (`initial-image`, `image-update` or `override-only`), optional `base_release`, `image_transport`, service/release tag, Registry and manifest digest only when `registry` is selected, local image ID for `local-daemon`/`archive`, `build_mode` (`built` or `reused`), latest alias status, Dockerfile/build evidence, Compose/CLI manifest, declared mounts, container labels, release-bound override manifest and optional override-compaction evidence |
| `persistence_resources` | Required for Docker/Kubernetes: default resource rows, customer decision, default-in-image flag, host path or PVC/PV target, container path, read-only flag, override policy, backup, restore procedure and confirmation record |
| `persistence_confirmation` | Required before mutation: every default resource is `confirmed`, or is explicitly `external-managed` with owner and recovery evidence; missing rows are dry-run only |
| release-bound overrides | Required for Docker when overrides exist: current delta under `<service-root>/releases/<release-id>/overrides/`, ordered `override_chain` of physical release layers, per-file SHA-256, effective mount/container paths, precedence and compatibility evidence; a global `<service-root>/overrides/` directory MUST NOT be used as an effective input |
| persistence mounts | Required for Docker data/config/index paths: host path, container path, purpose, read-only, backup and restore procedure |
| `migration` | Whether migrations exist, compatibility class, runner and approval/backup evidence |
| `retention` | Integer `>=0`; default `5` |

If a required input is unavailable, stop with a dry-run report. Do not infer a health endpoint, process identity, database safety, or stop command.

## Zero-experience delivery contract

When the user is preparing a deployment package or writing an implementation handbook, read the relevant files in this order:

1. [deployment-package.md](references/deployment-package.md) for package identity, mode payloads, offline closure, customer directory confirmation and delivery evidence.
2. [deployment-preflight-matrix.md](references/deployment-preflight-matrix.md) for the exact read-only checks and stop conditions for VM, Docker and an existing Kubernetes cluster.
3. [deployment-handbook.md](references/deployment-handbook.md) for the operator-facing quick path, one-click operations, configuration prompts, acceptance, upgrade, rollback, uninstall and incident handoff.
4. [kubernetes-persistence.md](references/kubernetes-persistence.md) for the existing-cluster PVC/PV gate and no-hostPath rule.
5. [deployment-package-manifest.schema.json](references/deployment-package-manifest.schema.json), [docker-persistence-manifest.schema.json](references/docker-persistence-manifest.schema.json), [kubernetes-persistence-manifest.schema.json](references/kubernetes-persistence-manifest.schema.json), `scripts/package-contract-test.sh` and `scripts/persistence-contract-test.sh` for machine validation.

The generated package and handbook MUST make the first five operator actions obvious:

```text
./doctor.sh       # 只检测，不安装
./deploy.sh       # 首次部署或升级
./service.sh      # 启动、停止、重启、状态、日志
./rollback.sh     # 回到记录的上一成功版本
./uninstall.sh    # 卸载程序，数据默认保留
```

Do not ask a zero-experience operator to hand-edit YAML/JSON/env files, remember systemd/Docker/kubectl commands, select a release by guessing, or continue after a required preflight failure. Every handbook step MUST state purpose, operation, expected output, stop action and completion mark. The package version MUST appear in the handbook title, preflight output, install preview, success report, record and handoff.

Before installation, ask for the deployment mode and print the default persistence resource table. The customer MUST confirm every row as host-persistent, cluster-persistent or external-managed before the selected mode's preflight can pass. For Kubernetes, validate `kubectl`, kubeconfig, context, cluster connectivity, namespace, permissions, architecture, existing PVC/PV binding, storage and image availability; if any required item fails, stop without installing Kubernetes, using hostPath, creating application resources or falling back to VM/Docker.

The one-click preflight contract MUST be visible before installation. The package validator checks static package facts; `./doctor.sh` checks the selected host or existing cluster read-only; `./deploy.sh` accepts only a fresh redacted report whose package SHA, deployment mode, resolved directories and validity window match the current input. Any port conflict, insufficient bytes/inodes, owner/group or read/write/execute permission failure, resource shortfall, dependency/configuration failure, ambiguous process identity or missing rollback reserve MUST leave the run as `dry-run`. The entrypoints MUST NOT automatically kill processes, change ports, delete files, repair permissions, change firewall rules or install Docker/Kubernetes.

## Ordered workflow

Read only the references relevant to the request, then execute these gates in order:

1. Verify the versioned package manifest, package SHA-256, `preflight` contract, supported mode, default persistence resource catalog and customer-confirmed directory table. Ask for each resource decision and run the selected-mode read-only preflight; stop on any missing confirmation or required failure before resolving or writing service paths.
2. Resolve and record `DEPLOY_ROOT` as `service_root`, then resolve physical `releases`, `conf`, `logs`, `run`, `release-records`, and `current`. Acquire `<service-root>/run/deploy.lock` with `flock` or a host-equivalent exclusive lock.
3. Validate the persistence resource manifest before artifact extraction. For Docker, resolve every host-persistent target as an absolute customer-approved path and validate mounts, permissions, space, backup and restore evidence. For Kubernetes, verify every cluster-persistent target is an existing bound or bindable PVC/PV in the confirmed Namespace and reject `hostPath`, anonymous volumes and missing StorageClass. Then validate artifact SHA-256 and archive contents before extracting into staging. For Docker, classify the release before validating transport: if no verified prior Docker release/image exists, require a new image build; if the change is override-only, reuse the recorded image identity and verify it is available or recoverable; if any packaged image input changed, require a new build; if the build compacts overrides, require recorded source-chain evidence and verify the materialized effective tree. Then validate the selected transport: Registry mode requires the resolved manifest digest and pull evidence; local-daemon mode requires an existing local image ID; archive mode requires a SHA-256-verified `docker save` archive and `docker load` evidence. In image-build modes validate Dockerfile/build evidence; in override-only mode validate the recorded base release's Dockerfile/build evidence and exact image identity. Always validate the service/release tag, OCI labels, provenance/SBOM policy, required runtime files, ordered override chain, compaction evidence when present and rendered Compose/CLI/Kubernetes manifest. Reject path traversal, tarbomb, unsafe links, external directory targets, bad permissions, missing required files, bundled live configuration and runtime download/install behavior.
4. Validate external configuration with the selected loader contract. Prefer a dedicated parser; a Shell loader is allowed only after restricted `KEY=value` validation. For Docker, validate every declared host mount physically and never copy a package env file over `<service-root>/conf`.
5. Allocate the next sequence in `release-records/sequence.state` (`0600`, deployment-user owned) while holding the service lock. Persist the allocation/attempt record before promoting the release; a failed attempt consumes the number.
6. Promote a complete staging directory or Docker release descriptor to `releases/<release-id>`. Run the current contract test through both `current/bin/<script>` and `releases/<release-id>/bin/<script>` paths for host-process releases; for Docker, render Compose with physical absolute paths for every release in `override_chain` (never `current`), then validate the release mode, base release when present, transport-specific image identity, labels, mounts, ordered layer precedence and offline/egress-restricted startup. An override-only release must prove that its image identity equals the recorded base release identity. A compaction release must prove that the new image contains the recorded effective override tree and therefore does not depend on deleted source layers.
7. Detect migration content and apply the migration gate. Prefer expand/contract; do not allow an unapproved incompatible or irreversible migration.
8. Transition state `prepared -> validated -> stopped -> switched -> started`. Stop using the selected mode, atomically replace `current` with a same-directory temporary symlink, verify its physical target, and start the host process or exact Docker/Compose identity using the declared environment-loading path.
9. Transition to `health-verified` only after the complete health matrix passes. For manual-foreground, the operator must confirm the foreground process is running before checks; `Ctrl+C` is the stop action.
10. Write a schema-valid record and transition to `recorded`. Only after the release is verified and recorded may Docker update `<service-name>:latest` to the exact verified local image identity; Registry mode updates the remote alias by manifest digest, while local-daemon/archive mode tags the verified local image ID. Re-inspect the alias. If alias update/verification fails, keep the digest- or ID-pinned service running, record `latest_alias.status=failed`, and require an operator retry; do not roll back a healthy service solely for an alias failure. On any release failure, keep the new release/descriptor, record `failed_phase`, leave the previous `latest` unchanged, atomically restore `previous_release`, its image/override inputs and persistence manifest when Docker is used, restart it, and re-run status and health.
11. If rollback health passes, update `latest` to the previous release identity and verify it; Registry mode uses the previous manifest digest and local modes use the previous image ID. State is `rolled-back`. If rollback health fails, state is `failed` with incident evidence and no third-release selection. Release the lock even after interruption via trap/reconcile.
12. Run `retention preview`, review the exact deletion set, then run `retention apply --apply` only after success is recorded. For compaction, this is the only cleanup path: never delete source layers from the image build step. Retention errors never delete protected or uncertain paths; every release referenced by a protected `override_chain` is protected too.

## Reference routing

- [release-layout.md](references/release-layout.md): root, physical path, current contract and layout.
- [release-naming-and-retention.md](references/release-naming-and-retention.md): ID grammar, sequence state, lock, preview/apply and protection set.
- [artifact-and-config-security.md](references/artifact-and-config-security.md): archive, permissions, SHA-256 and env parser/source boundaries.
- [docker-deployment.md](references/docker-deployment.md): Docker image, registry, persistence, override, lifecycle, recovery and image retention contract.
- [dockerfile-standard.md](references/dockerfile-standard.md): Dockerfile structure, build/runtime boundary, resource completeness and no-runtime-download contract.
- [docker-persistence-manifest.schema.json](references/docker-persistence-manifest.schema.json): machine-readable Docker persistent mount and release-bound override manifest schema.
- [kubernetes-persistence.md](references/kubernetes-persistence.md): Kubernetes existing-cluster PVC/PV persistence gate, resource confirmation table and no-hostPath fallback rule.
- [kubernetes-persistence-manifest.schema.json](references/kubernetes-persistence-manifest.schema.json): machine-readable PVC/PV confirmation and no-hostPath schema.
- [docker-release-manifest.schema.json](references/docker-release-manifest.schema.json): machine-readable release unit schema binding image, physical Compose, override checksums and source commit.
- [docker-compose.template.yaml](references/docker-compose.template.yaml): safe Compose starting template; replace service-root and mode-specific image identity after validation.
- [lifecycle-modes.md](references/lifecycle-modes.md): systemd, manual foreground/background, process identity and interruption handling.
- [database-and-health.md](references/database-and-health.md): migration gates and health/smoke matrix.
- [rollback-state-machine.md](references/rollback-state-machine.md): states, transitions, reconcile and incident stop.
- [stack-and-recoverability.md](references/stack-and-recoverability.md): backend/frontend/nginx/migration stacks and service recovery.
- [deployment-checklist.md](references/deployment-checklist.md): executable preflight-to-retention checklist.
- [release-record.schema.json](references/release-record.schema.json): release record schema.
- [knowledge-app-example.md](references/knowledge-app-example.md): historical layout example only; never copy its secrets or hard-code its host.
- [sceneforge-issue-mapping.md](references/sceneforge-issue-mapping.md): map observed deployment findings to v2 controls.
- [deployment-package.md](references/deployment-package.md): versioned package identity, mode payloads, offline closure, package layout, directory confirmation and delivery validation.
- [deployment-handbook.md](references/deployment-handbook.md): zero-experience quick path, one-click deployment/service operations, mode chapters, acceptance, upgrade, rollback, uninstall and handoff.
- [deployment-preflight-matrix.md](references/deployment-preflight-matrix.md): read-only checks, pass conditions and stop actions for VM, Docker and existing Kubernetes.
- [deployment-package-manifest.schema.json](references/deployment-package-manifest.schema.json): machine-readable package identity, supported modes, entrypoints, payloads and file checksums.

Reusable local helpers:

- `scripts/current-contract-test.sh`: safe current/release/service-root path contract test; it does not start a service unless explicitly asked.
- `scripts/retention.sh`: preview by default and explicit `--apply` deletion of an exact safe set.
- `scripts/package-contract-test.sh`: read-only package identity, entrypoint, payload, checksum, link and sensitive-file validator.

## Required report

Use the same keys as the schema, including:

```text
schema_version, service, service_root, host, operator, timestamp, timezone,
package_version, application_version, deployment_mode, runtime_target, container,
lifecycle_mode, environment_loading, version_source, source_commit,
release_id, release_number, artifact, artifact_checksum, previous_release,
current, status, failed_phase, health_check, smoke_check, rollback_target,
rollback_result, retention, deleted_releases, record_path
```

Every report MUST also include redacted `preflight` evidence with `contract_checksum`, `report_id`, `generated_at`, `expires_at`, selected mode checks, port conflict results, free bytes/inodes, permission results, resource results, dependency/configuration results, remediation summaries and evidence paths. The 报告绑定关系 MUST be checked again by `deploy.sh`; it is not a substitute for health verification.

For a Docker report, also include `release_mode`, `base_release`, `build_mode`, `override_chain`, `override_compaction`, image transport, optional Registry, immutable release tag, identity kind and image identity (manifest digest or local image ID), latest alias status/target identity/evidence path, Compose project, container ID when available, physical release root, release-bound Compose path, persistence mount summary, override manifest checksum and effective override files. For a dry run, label it `dry_run: true`, list exact commands and missing inputs, and do not fabricate status, health or checksum results.
