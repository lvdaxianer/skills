# SceneForge Deployment Findings and v2 Controls

This mapping records the observed deployment failure classes without including host credentials or environment values.

| SceneForge finding | v2 control | Acceptance evidence |
| --- | --- | --- |
| `current/bin/startup.sh` resolved the wrong service root through a symlink | Physical `$0` resolution plus three-parent version-local root calculation | Contract test calls current and physical release paths and compares service-root/releases/current |
| Release directories had no enforced sequence grammar | Strict release ID regex and service-local sequence allocator | `sequence.state` mode `0600`, exclusive lock, failed attempt consumes number |
| Archive integrity was implicit | SHA-256, optional/conditional signature and provenance gate | `sha256sum -c`, provenance result in record |
| Tar path traversal/tarbomb risk was unspecified | Reject absolute/`../` members, unsafe links, forbidden external directories and extra top-level layout | Pre-extraction member scan and staging-only promotion |
| Runtime env loading depended on launch path | Explicit systemd EnvironmentFile vs restricted Shell loader vs dedicated parser | `environment_loading` in record; no values printed |
| Shell `source` could execute commands | Conservative `KEY=value` grammar and owner/mode/key/type checks | Unsafe syntax fails before switch |
| Background stop relied too much on PID | User, full cmdline, artifact, start time and port ownership checks | Exact stop contract or hard stop |
| Startup/health evidence was too weak | Status/readiness/liveness, dependencies, logs, proxy, business smoke and loaded artifact matrix | All declared checks recorded, process existence alone rejected |
| Database migration rollback was ambiguous | Migration detection, Flyway policy, expand/contract and irreversible approval/backup gate | Migration evidence and schema recovery plan |
| Rollback could guess another version | Explicit state machine and recorded previous release only | Rollback health failure becomes incident `failed` |
| Five-version retention lacked an executor | `retention.sh preview` then explicit `apply --apply` with path boundary checks | Exact `deleted_releases`, protected set preserved |
| Multi-component deployment responsibilities were unclear | Stack manifest, shared deployment ID/compatibility, ordered publish and reverse failure handling | Nginx/TLS/port/homepage/History/API proxy checks |
| Docker persistence and incremental override behavior was undefined | Separate runtime target, explicit `conf/data/overrides/volumes/release-records` classes and read-only override mounts | Container recreation preserves required data; override manifest and restore procedure validate |
| Host JAR override could hide packaged libraries or bypass release audit | Mount overrides at a separate path, load deterministically before packaged `lib`, require checksum/manifest/apply/restart | `/app/lib` replacement is rejected; effective override checksums are recorded |

The original deployment layout remains compatible: historical release directories are preserved and are not renamed merely to satisfy the new suffix. New releases must use the v2 contract.
