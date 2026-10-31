# Lifecycle Modes, Process Identity and Environment Loading

Select one mode before stop/start; do not infer it from files found on a host.

Select `runtime_target=host-process` or `runtime_target=docker-container` separately. The lifecycle mode names remain the same for both targets.

| `lifecycle.mode` | Start | Stop | PID file | Environment loading |
| --- | --- | --- | --- | --- |
| `systemd` | `systemctl start <unit>` | `systemctl stop <unit>` | Not required | unit `EnvironmentFile` |
| `manual-foreground` | restricted env load then `exec` foreground command | operator `Ctrl+C` | Not required | explicit loader/parser |
| `manual-background` | restricted env load then service-approved background command | exact stop command or full identity contract | Optional evidence | explicit loader/parser |

For Docker, the exact identity contract additionally includes Compose project or container name/ID, release label, Registry digest or local image ID, configured user, start time, declared mounts and port ownership. A container ID alone is not sufficient.

## systemd

The unit owns lifecycle and environment loading:

```ini
[Service]
User=knowledge
WorkingDirectory=/service-root/current
EnvironmentFile=/service-root/conf/service-runtime.env
ExecStart=/service-root/current/bin/run-main.sh
Restart=on-failure
RestartSec=5
TimeoutStartSec=90
TimeoutStopSec=30
LimitNOFILE=65536
```

Verify the exact unit's `EnvironmentFile`, `ExecStart`, `WorkingDirectory`, `User`, restart policy and loaded process command line. Use `systemctl stop/start/status`; do not `source` the file in the deployment shell. `Restart=on-failure` is recommended for crashes, not as a substitute for health gates.

## manual-foreground

Use when an operator intentionally owns the terminal. The command must explicitly load the external env through the selected safe loader, then `exec` the main process:

```sh
set -a
. /service-root/conf/service-runtime.env
set +a
exec /usr/bin/java -cp "/service-root/current/lib/*" com.example.Main
```

The example is valid only after restricted env validation. Operator presses `Ctrl+C` to stop. The Skill MUST wait for confirmation that the process is running before status/health checks and must record `environment_loading=explicit Shell loader` or `dedicated env parser`. It must not fabricate asynchronous health evidence.

## manual-background

Allow only with an exact service-owned stop command or a unique process identity contract. The stop priority is:

1. service-owned exact stop command that verifies its target;
2. recorded PID plus all identity checks below;
3. an exact `kill <validated-pid>` only after checks pass.

Never use `killall java`, `pkill java`, `pkill -f java`, a basename-only match, or a PID-only kill. Before stop, validate the process owner equals the declared service user, `/proc/<pid>/cmdline` exactly contains the expected command signature, the target JAR/executable resolves inside the intended release, the process start time from `/proc/<pid>/stat` matches the recorded start time, and the configured listening port belongs to that PID (`ss -ltnp`/service-specific equivalent). If any check is unavailable, stop and report unsafe stop; do not switch or claim rollback.

After background start, capture PID, start time, user, cmdline, artifact path and ports in temporary state. If startup or health fails, stop only the newly captured identity; if cleanup fails, do not start a rollback process until an operator resolves the orphan. A failed `stop` is a hard gate: do not continue current switching or retention.

## docker-container adapters

### Docker systemd

Use systemd to supervise a foreground `docker compose up` or an equivalent exact Docker adapter. The unit MUST use the physically resolved current manifest and MUST declare `User`, `WorkingDirectory`, environment loading, `Restart`, `RestartSec`, `TimeoutStartSec`, `TimeoutStopSec` and `LimitNOFILE`. `ExecStop` MUST stop the declared Compose project/container and MUST NOT delete volumes.

### Docker manual-foreground

Run the selected release's physically rendered Compose file, for example `docker compose -f /service-root/releases/<release-id>/container/compose.yaml up`, or an exact `docker run` without `-d`. The operator owns the terminal and presses `Ctrl+C`. The Skill waits for confirmation that the expected container identity is running before health checks; do not rely on `current` to resolve mount sources.

### Docker manual-background

Run the selected release's physically rendered Compose file with `docker compose ... up -d` or an exact `docker run --name <declared-name>`. Stop priority is exact service-owned Compose/container stop, then the recorded container ID after verifying labels, digest, user, start time, mounts and ports. Never use broad `docker rm -f`, `docker kill` filters or `docker system prune -a`. If identity or stop is ambiguous, fail closed and do not switch or roll back.

Docker overrides are read-only mounts at separate extension points such as `/app/overrides/lib`; they MUST NOT be mounted over packaged `/app/lib`. Changing an override requires an apply/restart and full health/smoke verification.

## Interruption and cleanup

Use `trap` for `EXIT`, `INT`, `TERM` to release the deployment lock and remove only named temporary links/state files. Persist state before a network/SSH-sensitive step. On reconnect run `reconcile`: read state, resolve current, inspect process identity and continue verification or use the recorded rollback target. Never remove a lock directory by age or kill an unknown process.

## Environment loading report

Report only one of `systemd EnvironmentFile`, `explicit Shell loader`, `dedicated env parser`, or `not started`, plus the config path. Direct execution of `current/bin/start.sh` does not inherit a systemd `EnvironmentFile`; it must load the file itself or invoke a wrapper that does.
