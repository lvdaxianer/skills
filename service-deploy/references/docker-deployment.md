# Docker Deployment, Persistence and Incremental Overrides

## Scope and target selection

Docker is an optional `runtime_target=docker-container`; it does not remove the existing `host-process` target or the three lifecycle modes `systemd`, `manual-foreground` and `manual-background`. Kubernetes, Helm, Swarm and cluster scheduling are outside this reference.

The Docker release is the tuple. `registry` is optional and the selected
transport MUST be recorded in the release descriptor:

```text
release-id
image_transport: registry | local-daemon | archive
service-name:<release-id>
registry/service-name@sha256:<digest> (registry mode)
service-name:<release-id> + local image ID (local-daemon/archive)
service-name:latest (verified alias state)
container/compose.yaml or an equivalent CLI manifest
docker-persistence-manifest.json
override manifest and its checksum
```

`current` MUST point to the release descriptor under `releases/<release-id>/`. A container is accepted only when its labels, image digest, Compose project, mounts and ports match the current descriptor.

## Build contract

Build on a trusted build host or CI worker from a named source commit. Production MUST NOT build from an unreviewed context by default.

The Dockerfile MUST also satisfy [dockerfile-standard.md](dockerfile-standard.md). Build-time network access is allowed only on the trusted build host/CI worker for pinned, checksum- or signature-verified inputs. Runtime startup MUST NOT download or install software, code, packages, models, scripts or other resources to complete the image. The image must contain those resources, or a declared read-only persistent mount must supply them before start.

The build MUST:

1. pin every base image to a digest;
2. use a complete `.dockerignore` and a reproducible build context;
3. avoid secrets in `ARG`, `ENV`, image layers, build logs and labels;
4. use a non-root runtime user unless the service owner records a justified exception;
5. include only packaged defaults, application code and declared libraries;
6. add OCI labels for service, release ID, source commit, source URL and build timestamp;
7. generate an SBOM and provenance attestation when policy requires them;
8. produce an image reference and immutable digest before deployment.

The build MUST keep build tools, package-manager caches and credentials out of the runtime stage. `ENTRYPOINT`, `CMD`, `HEALTHCHECK` and startup hooks MUST be local and deterministic. A local loopback health probe is allowed, but `curl`/`wget` output MUST NOT be saved, executed or used to fetch a runtime dependency.

Example build commands. The publish step is conditional; the release system
supplies the values and MUST never print credentials:

```sh
docker buildx build \
  --provenance=true --sbom=true \
  --label org.opencontainers.image.revision="$SOURCE_COMMIT" \
  --label org.opencontainers.image.version="$RELEASE_ID" \
  --tag "$SERVICE:$RELEASE_ID" \
  .

# registry mode only: publish the same immutable tag
docker tag "$SERVICE:$RELEASE_ID" "$REGISTRY/$SERVICE:$RELEASE_ID"
docker push "$REGISTRY/$SERVICE:$RELEASE_ID"

docker image inspect "$SERVICE:$RELEASE_ID" \
  --format '{{.Id}} {{json .Config.Labels}}'

# registry mode only
docker buildx imagetools inspect "$REGISTRY/$SERVICE:$RELEASE_ID"
```

The deployment record MUST store `image_transport`, the service/release tag,
the optional Registry, and exactly one image identity: a Registry manifest
digest in `registry` mode or a local image ID in `local-daemon`/`archive` mode.
The release tag MUST never be reused. `latest` is allowed only as a moving
alias for the most recently verified release; it is not a deployment artifact
and MUST fail validation when no immutable identity has been resolved.

## Release tag and `latest` alias contract

Use the following references for one service:

```text
<registry>/<service-name>:<release-id>       # registry mode historical tag
<service-name>:<release-id>                  # local-daemon/archive historical tag
<registry>/<service-name>:latest             # registry mode verified alias
<service-name>:latest                        # local verified alias
<registry>/<service-name>@sha256:<digest>    # registry production identity
<service-name>:<release-id> + local image ID  # local production identity
```

The release tag is created with the image and, in Registry mode only, pushed
to the Registry. It contains the full release ID and is never overwritten or
reused. A short SHA-only tag such as `5119d6f` is not a standard deployment
identity because it hides timestamp and sequence information. If `docker
images` shows the same image ID on multiple rows, those rows are tags/aliases
for one image, not necessarily multiple builds; the release record must still
identify the canonical release tag and the mode-specific immutable identity.

`latest` MUST be updated only after all of the following have succeeded:

1. the selected transport resolved and verified the immutable identity; Registry mode additionally pushed and inspected the release tag;
2. the container was started by the resolved digest;
3. status, readiness, liveness, dependency and business smoke checks passed;
4. the release record was written as verified/recorded.

In `registry` mode, update the alias to the exact digest under the deployment
lock, then inspect it again:

```sh
docker buildx imagetools create \
  --tag "$REGISTRY/$SERVICE:latest" \
  "$IMAGE_DIGEST"
docker buildx imagetools inspect "$REGISTRY/$SERVICE:latest"
```

In Registry mode, the inspected `latest` digest MUST equal the recorded
release digest. A failed or unverified release MUST leave the previous
`latest` unchanged. If the service is already healthy but alias update or
verification fails, do not roll back the service; record
`latest_alias.status=failed`, preserve the digest-pinned runtime and retry the
alias operation. After a healthy rollback, update `latest` to the previous
release identity and verify it.

For `local-daemon` and `archive`, update the local alias only after health and
record success:

```sh
docker tag "$SERVICE:$RELEASE_ID" "$SERVICE:latest"
docker image inspect "$SERVICE:latest" --format '{{.Id}} {{json .Config.Labels}}'
```

The inspected local image ID MUST equal the recorded release image ID. A local
image ID MUST NOT be written as a fake `sha256:` Registry manifest digest.

## Image transport and pull contract

Select exactly one mode before stopping the current runtime:

| Mode | Required identity | Allowed commands | Registry requirement |
| --- | --- | --- | --- |
| `registry` | resolved manifest digest | `docker push`, `docker pull`, `docker buildx imagetools inspect` | Registry URL/auth required; secrets never recorded |
| `local-daemon` | local image ID from `docker image inspect` | local inspect, tag and run commands | no Registry, login or pull |
| `archive` | SHA-256 of `docker save` archive plus loaded local image ID | `sha256sum -c`, `docker load`, local inspect/tag/run | no Registry, login or pull |

Registry mode pushes a human-readable immutable tag `<service>:<release-id>` and
maintains `latest` only after verification, but deploys only:

```text
registry.example/<service>@sha256:<64-hex-digest>
```

Before container creation:

```sh
docker pull "$IMAGE_DIGEST"
docker image inspect "$IMAGE_DIGEST" \
  --format '{{json .RepoDigests}} {{json .Config.Labels}}'
```

The deployment MUST compare the pulled digest and labels with the manifest.
Registry authentication is an external secret input; it MUST NOT be written to
release records or command output. If the digest cannot be pulled or inspected,
stop before stopping the current runtime.

For local-daemon mode, validate the already-loaded image before stopping:

```sh
docker image inspect "$SERVICE:$RELEASE_ID" \
  --format '{{.Id}} {{json .RepoTags}} {{json .Config.Labels}}'
```

Record the exact `Id`, release tag, OCI labels and local daemon identity. Do
not run `docker pull`, `docker login` or `docker buildx imagetools`.

For archive mode, create or receive the archive before the deployment gate:

```sh
sha256sum -c "$IMAGE_ARCHIVE.sha256"
docker load --input "$IMAGE_ARCHIVE"
docker image inspect "$SERVICE:$RELEASE_ID" \
  --format '{{.Id}} {{json .RepoTags}} {{json .Config.Labels}}'
```

The checksum MUST be verified before `docker load`; the loaded image ID and
release tag MUST match the manifest. Archive mode is not a substitute for a
Registry and MUST retain the verified archive until every protected rollback
reference has another verified source.

Before accepting the image, run the Dockerfile lint and runtime startup contract from [dockerfile-standard.md](dockerfile-standard.md). Prefer `--network none`; if the service requires a database, Redis, object store or another declared business dependency, use an egress-restricted network that allows only those exact targets. Registry, OS package, language package, code and model repositories MUST remain blocked. A blocked business dependency is a dependency-health failure; an attempted software/resource download is an image-contract failure and MUST fail the release.

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

Also verify the runtime image contract before stop: `Config.User` is the declared non-root user, `WorkingDir` is `/app`, `Entrypoint` resolves inside the image, required `/app/bin` and `/app/lib` resources exist, and the startup process does not execute download/install commands. Inspect bounded logs, process command lines and declared filesystem changes; do not rely on `running` or an image healthcheck alone.

After start, prove all declared checks:

- container status and exact identity;
- readiness and liveness with the service timeout/retry policy;
- bounded startup logs without secret values;
- database/Redis/object-store/index dependency probes;
- Nginx config/proxy/TLS checks where applicable;
- read-only business API smoke tests;
- loaded image digest and effective override/classpath evidence.
- offline or egress-restricted startup evidence showing no undeclared resource download.

Container running, `docker inspect` success or an HTTP `200` alone is insufficient.

## Rollback and recovery

On failure, stop only the new container identity, restore the recorded previous `current`, image digest, Compose manifest, persistence manifest and override manifest, recreate the exact previous container and rerun status/readiness/liveness/dependency/smoke checks. A previous image or required mount that cannot be restored makes rollback `failed` and requires incident handling; do not select a third release. Application rollback never automatically rolls back a database schema.

After SSH interruption or host reboot, `reconcile` MUST inspect durable state, `current`, registry availability, mounts, labels and image digest before creating anything. `manual-background` has no automatic reboot recovery; use an operator runbook or choose systemd.

## Retention and image cleanup

The five-release policy applies to release descriptors. Before deleting an old descriptor, resolve exact paths under `releases/` and confirm its image identity (Registry digest or local image ID) is not referenced by current, previous, active, failed, unverified, or another retained release. Delete a local image only by its exact image ID after that reference check. Registry retention is separate from local Docker cache and verified archive retention. An emergency disk cleanup MUST preserve persistent data, failed/unverified releases, verified rollback archives and all referenced images.

## Kubernetes boundary

If the deployment target is Kubernetes, stop and use a Kubernetes-specific standard. Do not translate this Compose/Docker contract into `kubectl` commands implicitly.
