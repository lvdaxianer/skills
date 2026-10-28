# Lifecycle Modes and Environment Loading

The release workflow is shared. Select a lifecycle mode before any stop or start operation; do not infer the mode only from files found on the host.

## Mode contract

| `lifecycle.mode` | Start | Stop | PID file | systemd |
| --- | --- | --- | --- | --- |
| `systemd` | `systemctl start <unit>` | `systemctl stop <unit>` | Not required | Required |
| `manual-foreground` | Explicit env load, then `exec` the main process in the terminal | Operator presses `Ctrl+C` | Not required | Not required |
| `manual-background` | Explicit env load, then service-approved background command | Exact service stop command or unique process contract | Optional | Not required |

All modes still require a status check and an application-level health check when the service provides one. If a mode cannot safely perform a required action, pause and report the exact manual command instead of guessing.

## Systemd mode

The unit owns environment loading and lifecycle operations:

```ini
[Service]
EnvironmentFile=/opt/knowledge-app/conf/knowledge-runtime.env
ExecStart=...
```

The deployment procedure checks that the env file exists and is readable, then uses the unit's start/stop/status commands. It must not print the file's values.

## Manual foreground mode

This mode is for an operator who wants to start and stop the service from a terminal without systemd or a PID file. The command must explicitly load the external environment before `exec`:

```sh
set -a
. /opt/knowledge-app/conf/knowledge-runtime.env
set +a
exec java -cp "/opt/knowledge-app/current/lib/*" \
  cc.lvdaxianer.kbsearch.engine.app.KnowledgeApplication
```

The operator keeps the terminal attached and presses `Ctrl+C` to stop the process. The Skill may prepare the release and print this command, but must wait for confirmation that the operator started it before claiming health verification. If the env file is not Shell-compatible, the service must provide a compatible loader; do not guess a parser.

## Manual background mode

Background mode is allowed only when the service supplies a safe stop contract. A PID file is optional, but the stop action must identify only the intended release, for example a service-owned stop script or an exact command signature. Never use `killall java`, `pkill java`, or an unreviewed broad `pkill -f` pattern.

If there is no safe stop contract, use `manual-foreground` or stop and ask the operator to provide one. Do not claim automatic rollback if the failed process cannot be safely stopped.

## Environment loading rule

`<service-root>/conf/knowledge-runtime.env` is external runtime configuration:

- systemd mode: systemd reads it through `EnvironmentFile` and injects variables into the service process;
- Shell mode: the start command or service-owned wrapper explicitly loads it before starting the main process;
- direct execution of `current/bin/start.sh` does not load it automatically just because a systemd unit references it.

Reports record only the loading mechanism and file path, never variable values.
