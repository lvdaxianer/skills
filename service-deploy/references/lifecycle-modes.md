# Lifecycle Modes, Process Identity and Environment Loading

Select one mode before stop/start; do not infer it from files found on a host.

| `lifecycle.mode` | Start | Stop | PID file | Environment loading |
| --- | --- | --- | --- | --- |
| `systemd` | `systemctl start <unit>` | `systemctl stop <unit>` | Not required | unit `EnvironmentFile` |
| `manual-foreground` | restricted env load then `exec` foreground command | operator `Ctrl+C` | Not required | explicit loader/parser |
| `manual-background` | restricted env load then service-approved background command | exact stop command or full identity contract | Optional evidence | explicit loader/parser |

## systemd

The unit owns lifecycle and environment loading:

```ini
[Service]
User=knowledge
WorkingDirectory=/opt/knowledge-app/current
EnvironmentFile=/opt/knowledge-app/conf/knowledge-runtime.env
ExecStart=/opt/knowledge-app/current/bin/run-main.sh
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

## Interruption and cleanup

Use `trap` for `EXIT`, `INT`, `TERM` to release the deployment lock and remove only named temporary links/state files. Persist state before a network/SSH-sensitive step. On reconnect run `reconcile`: read state, resolve current, inspect process identity and continue verification or use the recorded rollback target. Never remove a lock directory by age or kill an unknown process.

## Environment loading report

Report only one of `systemd EnvironmentFile`, `explicit Shell loader`, `dedicated env parser`, or `not started`, plus the config path. Direct execution of `current/bin/start.sh` does not inherit a systemd `EnvironmentFile`; it must load the file itself or invoke a wrapper that does.
