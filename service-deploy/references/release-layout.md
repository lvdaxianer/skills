# Release Layout and Physical Path Contract

## Path model

```text
DEPLOY_ROOT = user-provided absolute final service root, default /opt
service_name = lowercase slug used for release IDs, image names and records only
service_root = DEPLOY_ROOT
```

```text
<service_root>/
├── bin/                         # outer management wrappers
├── releases/<release-id>/       # immutable application release
│   ├── bin/                     # version runtime scripts
│   ├── conf/                    # static, non-secret defaults only
│   ├── lib/                     # application and dependencies
│   ├── overrides/               # release-bound delta layer only
│   │   ├── lib/
│   │   ├── html/                # only when an actual runtime path exists
│   │   └── <future-override>/
│   ├── release-manifest.json    # image/Compose/override binding
│   └── container/                # Docker descriptor, image identity and manifests (container target only)
├── current -> releases/<id>     # only active pointer
├── conf/                        # external runtime config/secrets
├── data/                        # business files and non-rebuildable generated data
├── volumes/                     # explicitly declared containerized DB/index data
├── logs/                        # runtime logs
├── run/                         # lock, state, optional pid metadata
└── release-records/             # records and sequence.state
```

`current`, `releases`, and the external `conf` boundary are mandatory. `DEPLOY_ROOT` is already the complete service root; never append `service_name` to it. For Docker, release-bound `overrides` are immutable delta layers; an effective release may reference an ordered chain of earlier release layers without copying them. `data` and `volumes` are created only when declared by the persistence manifest. `bin`, `logs`, `run` and `release-records` are created when needed, but operational record/lock paths MUST be inside service root. The immutable release descriptor remains inside its release; no business data may live only in a container writable layer.

## Physical resolution contract

Every lifecycle script MUST derive its own physical directory before using relative paths:

```sh
SCRIPT_PHYSICAL_DIR=$(CDPATH= cd -- "$(dirname -- "$(readlink -f -- "$0")")" && pwd -P)
# For a version-local script at releases/<release-id>/bin, three parents reach service-root.
SERVICE_ROOT=$(CDPATH= cd -- "$SCRIPT_PHYSICAL_DIR/../../.." && pwd -P)
CURRENT_PHYSICAL=$(readlink -f -- "$SERVICE_ROOT/current")
RELEASES_PHYSICAL=$(CDPATH= cd -- "$SERVICE_ROOT/releases" && pwd -P)
case "$CURRENT_PHYSICAL" in
  "$RELEASES_PHYSICAL"/*) : ;;
  *) echo 'current escapes releases' >&2; exit 64 ;;
esac
```

On hosts without GNU `readlink -f`, use an equivalent `pwd -P`/`realpath` implementation and record the host-specific command. Never use `dirname "$0"` as the final service root when `$0` traverses `current`.

The contract test MUST call both:

```text
/service-root/current/bin/start.sh
/service-root/releases/<release-id>/bin/start.sh
```

It MUST assert identical physical `service_root`, `releases`, and release target values; reject a current link outside releases, a regular directory named current, a dangling link and a symlink whose target escapes through another link.

For `runtime_target=docker-container`, the same physical contract applies to the release descriptor: `current` MUST resolve inside `releases`, and its transport, Registry digest or local image ID, physical Compose manifest, persistence manifest and release-bound override manifest/chain MUST be read from that resolved release. Compose MUST be rendered with absolute host paths for every release in the chain; it MUST NOT rely on `/service-root/current` for a mount source. A Docker container is invalid when its release label, ordered override mounts or mode-specific image identity does not match the resolved descriptor.

## Atomic current switch

After staging is complete, create the temporary link in the same directory and rename it:

```sh
ln -s -- "$service_root/releases/$release_id" \
  "$service_root/.current.$release_id.tmp"
mv -Tf -- "$service_root/.current.$release_id.tmp" "$service_root/current"
test "$(readlink -f -- "$service_root/current")" = \
  "$(readlink -f -- "$service_root/releases/$release_id")"
```

If `mv -Tf` is not supported, stop and use a host-supported same-filesystem atomic replacement. Never switch to staging, a regular directory, or a path outside releases.

## Configuration boundary

Tar extraction MUST target only a staging directory below `releases` and MUST reject entries named `conf`, `logs`, `run`, `release-records`, or their absolute/relative variants. The live file `<service-root>/conf/<name>` remains untouched during release promotion.

Docker host paths MUST resolve under the same physical service root. `conf`, `data`, `volumes`, `logs` and `release-records` are mounted only through a checked manifest; every `override_chain` layer MUST resolve under a release directory and be mounted by its physical absolute path. Never mount a global `<service-root>/overrides` as an effective release input, never mount an override layer over the image's packaged `/app/lib`, and never mount `/var/run/docker.sock`, the host root or a release directory as writable application data.
