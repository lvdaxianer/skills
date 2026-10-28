# Docker Deployment, Persistence and Incremental Overrides

## Scope and target selection

Docker is an optional `runtime_target=docker-container`; it does not remove the existing `host-process` target or the three lifecycle modes `systemd`, `manual-foreground` and `manual-background`. Kubernetes, Helm, Swarm and cluster scheduling are outside this reference.

The Docker release is the tuple:

```text
release-id
image@sha256:<digest>
container/compose.yaml or an equivalent CLI manifest
docker-persistence-manifest.json
override manifest and its checksum
```

`current` MUST point to the release descriptor under `releases/<release-id>/`. A container is accepted only when its labels, image digest, Compose project, mounts and ports match the current descriptor.

## Build contract

Build on a trusted build host or CI worker from a named source commit. Production MUST NOT build from an unreviewed context by default.

The build MUST:

1. pin every base image to a digest;
2. use a complete `.dockerignore` and a reproducible build context;
3. avoid secrets in `ARG`, `ENV`, image layers, build logs and labels;
4. use a non-root runtime user unless the service owner records a justified exception;
5. include only packaged defaults, application code and declared libraries;
6. add OCI labels for service, release ID, source commit, source URL and build timestamp;
7. generate an SBOM and provenance attestation when policy requires them;
8. produce an image reference and immutable digest before deployment.

Example build/publish commands (the release system supplies the values; never print credentials):

```sh
docker buildx build \
  --provenance=true --sbom=true \
  --label org.opencontainers.image.revision="$SOURCE_COMMIT" \
  --label org.opencontainers.image.version="$RELEASE_ID" \
  --tag "$REGISTRY/$SERVICE:$RELEASE_ID" \
  --push .

docker buildx imagetools inspect "$REGISTRY/$SERVICE:$RELEASE_ID"
```

The deployment record MUST store the resulting digest. A mutable tag such as `latest`, `dev` or `snapshot` is not a deployment artifact and MUST fail validation when no digest is present.

## Registry and pull contract

Push a human-readable immutable tag `<service>:<release-id>`, but deploy only:

```text
registry.example/<service>@sha256:<64-hex-digest>
```

Before container creation:

```sh
docker pull "$IMAGE_DIGEST"
docker image inspect "$IMAGE_DIGEST" \
  --format '{{json .RepoDigests}} {{json .Config.Labels}}'
```

The deployment MUST compare the pulled digest and labels with the manifest. Registry authentication is an external secret input; it MUST NOT be written to release records or command output. If the digest cannot be pulled or inspected, stop before stopping the current runtime.

## Persistence contract

The service root is the only default host boundary. A custom `deploy_root` continues to work exactly as it does for host releases.

| Class | Default host location | Container treatment | Backup requirement |
| --- | --- | --- | --- |
| runtime config/secrets | `<service-root>/conf/` | read-only bind mount or `EnvironmentFile` | encrypted/access-controlled backup |
| TLS/Nginx config | `<service-root>/conf/tls/`, `<service-root>/conf/nginx/` | read-only | certificate/key backup under security policy |
| business files | `<service-root>/data/` | read-write only at declared subpaths | MUST have restore procedure |
| containerized database/index | `<service-root>/volumes/<name>/` | dedicated read-write volume | MUST have database/index backup or rebuild evidence |
| incremental override | `<service-root>/overrides/` | read-only | record and backup manifest/files |
| logs | `<service-root>/logs/` or journald | write-only/log driver | bounded rotation and capacity alert |
| release/audit state | `<service-root>/release-records/` and `current` | not normally mounted | MUST be retained for recovery |
| runtime state | `<service-root>/run/` | optional temporary mount | never the sole source of truth |
| temp/cache | container `/tmp` or declared cache volume | ephemeral/rebuildable | no backup |

The container writable layer MUST NOT contain the only copy of business data, configuration, certificates, deployment records or non-rebuildable indexes. Every bind mount or volume MUST be listed in the persistence manifest with `host_path`, `container_path`, `purpose`, `read_only`, `backup` and `restore_procedure`.

Prefer an external database, Redis, Milvus/Elasticsearch and object store. If any runs in Docker, its data directory is a separate declared volume; `docker compose down --volumes` is a destructive operation and is forbidden in the normal release path.

## Defaults and incremental overrides

The image MAY contain default configuration and default `/app/lib`. The host overlay MUST be mounted at a separate path:

```yaml
volumes:
  - /service-root/overrides/lib:/app/overrides/lib:ro
  - /service-root/conf:/app/config/overrides:ro
```

Never mount `/service-root/overrides/lib` on `/app/lib`: that hides every packaged library. The service launcher MUST document deterministic precedence, normally:

```text
packaged defaults < external base config < external override config < environment variables
override JARs before packaged JARs on the classpath
```

The service-specific merge rules MUST be declared for properties, YAML or JSON. If a format cannot be safely merged, require a complete external replacement file and record that decision.

`overrides/manifest.yaml` or JSON MUST list every override file, its mode (`add`, `replace` or `merge`), SHA-256, reason and compatibility evidence. Only regular files in declared extension points are allowed. Startup scripts, entrypoints, Docker socket, host root, release switching scripts and arbitrary host paths are not valid overrides.

An operator MUST apply overrides through the deployment workflow. Dropping a JAR into the directory does not activate it until validation, restart/recreate, health and smoke checks complete. The record stores names, checksums, load order and manifest checksum, never file contents or secrets.

## Container lifecycle modes

### `systemd` (recommended for unattended services)

The unit supervises a foreground Docker/Compose adapter and uses the current manifest. It MUST declare `User`, `WorkingDirectory`, `EnvironmentFile` or dedicated loader, `Restart`, start/stop timeouts, `LimitNOFILE` and exact `ExecStart`/`ExecStop`. The adapter MUST not use `--volumes` on stop.

### `manual-foreground`

Use `docker compose -f /service-root/current/container/compose.yaml up` or an equivalent `docker run` command without `-d`. The operator owns the terminal and uses `Ctrl+C`; health checks begin only after the operator confirms the exact container is running.

### `manual-background`

Use `docker compose ... up -d` or an exact `docker run --name <declared-name>`. Stop priority is:

1. service-owned exact Compose project/container stop;
2. recorded container ID after label, image, user, start-time, mount and port checks;
3. an exact container stop for the validated ID.

Never use broad container-name filters, `docker rm -f $(docker ps -aq)`, `docker kill $(docker ps -q)`, `docker system prune -a` or a PID-only host kill. A failed stop is a hard gate and blocks current switching, retention and rollback continuation.

## Validation and health

Before stop, render and validate without creating containers:

```sh
docker compose -f /service-root/current/container/compose.yaml config
```

Resolve every host mount physically and reject paths outside service-root, protected release paths, undeclared device/FIFO targets and writable mounts for config/secret/override paths. Verify the target image digest, labels, Compose project, container user, ports, required mounts and no forbidden Docker socket/root mounts.

After start, prove all declared checks:

- container status and exact identity;
- readiness and liveness with the service timeout/retry policy;
- bounded startup logs without secret values;
- database/Redis/object-store/index dependency probes;
- Nginx config/proxy/TLS checks where applicable;
- read-only business API smoke tests;
- loaded image digest and effective override/classpath evidence.

Container running, `docker inspect` success or an HTTP `200` alone is insufficient.

## Rollback and recovery

On failure, stop only the new container identity, restore the recorded previous `current`, image digest, Compose manifest, persistence manifest and override manifest, recreate the exact previous container and rerun status/readiness/liveness/dependency/smoke checks. A previous image or required mount that cannot be restored makes rollback `failed` and requires incident handling; do not select a third release. Application rollback never automatically rolls back a database schema.

After SSH interruption or host reboot, `reconcile` MUST inspect durable state, `current`, registry availability, mounts, labels and image digest before creating anything. `manual-background` has no automatic reboot recovery; use an operator runbook or choose systemd.

## Retention and image cleanup

The five-release policy applies to release descriptors. Before deleting an old descriptor, resolve exact paths under `releases/` and confirm its image digest is not referenced by current, previous, active, failed, unverified, or another retained release. Delete an image only by its exact digest after that reference check. Registry retention is separate from local Docker cache retention. An emergency disk cleanup MUST preserve persistent data, failed/unverified releases and all referenced images.

## Kubernetes boundary

If the deployment target is Kubernetes, stop and use a Kubernetes-specific standard. Do not translate this Compose/Docker contract into `kubectl` commands implicitly.
