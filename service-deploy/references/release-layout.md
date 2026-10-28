# Release Layout and Physical Path Contract

## Path model

```text
deploy_root  = user-provided absolute path, default /opt
service_name = lowercase slug
service_root = deploy_root/service_name
```

```text
<service_root>/
├── bin/                         # outer management wrappers
├── releases/<release-id>/       # immutable application release
│   ├── bin/                     # version runtime scripts
│   ├── conf/                    # static, non-secret defaults only
│   └── lib/                     # application and dependencies
├── current -> releases/<id>     # only active pointer
├── conf/                        # external runtime config/secrets
├── logs/                        # runtime logs
├── run/                         # lock, state, optional pid metadata
└── release-records/             # records and sequence.state
```

`current`, `releases`, and the external `conf` boundary are mandatory. `bin`, `logs`, `run` and `release-records` are created when needed, but record/lock paths MUST be inside service root.

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
