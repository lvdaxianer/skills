# Design

## Context

The existing Skill treats a release as an immutable directory selected by `current`, with external configuration, records and runtime state outside releases. The Docker extension must preserve that model while acknowledging that a container image contains packaged defaults and that a service may need operator-supplied JAR/configuration deltas. The user also requires a clear answer for which data survives container recreation.

## Goals / Non-Goals

**Goals:**

- Represent a Docker deployment as an immutable image digest plus an immutable release descriptor selected through `current`.
- Make host persistence explicit for config/secrets, business data, certificates, logs, deployment records and declared override inputs.
- Keep packaged defaults visible and add a deterministic, read-only overlay for approved JAR/configuration deltas.
- Reuse the three existing lifecycle modes and the existing state machine, health matrix, rollback target and five-release retention rules.
- Provide schema evidence for image identity, mounts and override contents without recording secret values.

**Non-Goals:**

- Kubernetes, Helm, Swarm or a general cluster scheduler.
- Automatically inferring whether application data is rebuildable.
- Hot-loading arbitrary JARs or configuration without a restart/recreate.
- Treating a mutable container writable layer as a backup or recovery source.
- Making a registry, database, object store or certificate authority part of the Skill.

## Decisions

### Runtime target is separate from lifecycle mode

Add `runtime_target=host-process|docker-container`; keep `lifecycle_mode` as `systemd|manual-foreground|manual-background`. This prevents Docker from breaking the existing host modes and allows systemd to supervise a Docker/Compose adapter. A separate fourth lifecycle mode was rejected because it would duplicate the stop/start/health state machine.

### The release descriptor, not the image filesystem, is selected by `current`

`current` points to `releases/<release-id>/container/`, which contains the image digest, Compose/CLI manifest, persistence manifest and override manifest checksum. The container is accepted only when labels, digest, mounts and ports match that descriptor. This preserves atomic current switching and makes a container rebuild reproducible.

### Persistence has explicit classes

The service root owns `conf/`, `data/`, `overrides/`, `volumes/`, `logs/`, `run/` and `release-records/`. `conf/`, non-rebuildable `data/`, declared `volumes/`, certificates, overrides and release records are durable inputs. `run/`, PID/lock metadata, temporary files, caches and the container writable layer are ephemeral. A database or object store outside the host is preferred; if a database runs in Docker, its data directory is a separately declared volume with a backup/restore procedure.

### Overlay is an extension point, not a directory replacement

The image keeps `/app/lib` and default configuration. Host `overrides/lib` is mounted read-only at `/app/overrides/lib`; the entrypoint or service launcher builds an effective classpath with override JARs first and packaged JARs second. Configuration uses the service-declared merge semantics. Directly mounting over `/app/lib`, replacing entrypoints, mounting the Docker socket or mounting the host root is rejected. This avoids accidentally hiding defaults or granting host control.

### Override changes are recorded deployment inputs

`overrides/manifest.yaml` declares each file, mode (`add`, `replace`, or config merge), checksum, reason and compatibility evidence. Applying an override validates the manifest, restarts/recreates the exact current container, runs the full health matrix and records the resulting manifest checksum. A failed operation restores the previous override manifest and runtime; an unrecorded file dropped into the directory is not active.

### Image and data retention are separate

Release retention protects current/previous/active/failed/unverified descriptors. A registry image digest is retained while any running or protected descriptor references it. Exact digest deletion is allowed only after preview and reference checks. `docker system prune -a`, implicit volume deletion and `docker compose down --volumes` remain forbidden by default.

### Build and deploy are separate trust boundaries

Builds run from a trusted source commit with pinned base image, no embedded secrets, SBOM/provenance and OCI labels. Production pulls an already verified digest and does not build from an unreviewed context. The server's deployment record stores references and checksums, not credentials or secret values.

## Risks / Trade-offs

- [Classpath conflict] An override JAR can shadow an incompatible packaged class → require manifest compatibility evidence, deterministic order, checksum capture and full restart health checks.
- [Data classification error] A service may call a cache a source of truth → require the service owner to classify each mount and provide a restore procedure before enabling it.
- [Registry loss] A previous digest may be unavailable during rollback → require registry retention/replication policy and treat missing digest as an incident, never choose a third release.
- [Secret backup exposure] Persistent config and volumes may contain secrets → restrict ownership/mode and use encrypted, access-controlled backups; records contain names/checksums only.
- [Compose interpolation escape] A manifest can resolve a host path outside service-root → render with an explicit service-root and resolve every host path before create.

## Migration Plan

1. Add the Docker capability references, schema and templates without changing existing host-process behavior.
2. For a Docker service, classify each existing container mount and move required data out of the writable layer into declared host paths or external services.
3. Build and push an image with immutable digest, OCI labels, SBOM/provenance and a default configuration/lib set.
4. Create the first Docker release descriptor and persistence/override manifest; run dry-run validation and compare the effective mounts/classpath.
5. Deploy through `systemd`, manual foreground, or manual background using the existing state machine and full health matrix.
6. To roll back, restore the recorded previous descriptor, digest, override manifest and mounts; rerun health. Do not automatically roll back database schema.
7. Apply release retention only after a verified record; clean unreferenced images separately through exact digest operations.

## Open Questions

None. Service-specific questions such as whether a vector index is rebuildable belong in the deployment manifest and must be answered before deployment.
