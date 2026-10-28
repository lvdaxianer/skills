---
name: service-deployment-standard
description: "Use this skill whenever the user asks to deploy, upgrade, rollback, restart, publish, or standardize a service on a Linux host, especially when they mention release directories, a current symlink, external env/config files, /opt, /uinnova/deploy, Shell start/stop scripts, systemd, retention, or backups. Enforce a versioned immutable release workflow with a configurable deployment root, externalized configuration, atomic current switching, health validation, auditable rollback, and default retention of five releases."
compatibility: "Linux shell utilities, SSH when a remote host is in scope, and service-specific lifecycle/health commands. systemd is optional."
---

# Service Deployment Standard

Use this skill as the default operating procedure for service deployment. It is a deployment standard, not a service-specific script: resolve the service's paths and lifecycle commands from the request or the service package, then apply the same safety gates.

## Operating principles

- Treat each release directory as immutable after validation. Never overwrite the active release in place.
- Keep runtime configuration and secrets outside release directories. Do not print secret values, copy them into reports, or commit them.
- Use a configurable deployment root. Default to `/opt`; use the user-provided absolute path when one is supplied.
- Use the service's own start, stop, status, and health commands. Do not make systemd a prerequisite.
- Switch `current` only after the new release is complete and verified. A failed health check must restore the previous pointer.
- Keep the old release as the rollback backup. Do not duplicate the whole application unless a separate data or configuration snapshot is required.
- Default to retaining the five newest verified releases per service, with protected releases excluded from cleanup.
- Before cleanup, show or record the exact deletion set. Never delete a path that has not been resolved and checked as a release directory under the intended service root.

## Required inputs

Resolve these values before changing a host:

| Input | Rule |
| --- | --- |
| `deploy_root` | User-provided absolute path; default `/opt` |
| `service_name` | Stable lowercase service slug used in paths and release IDs |
| `artifact` | Local or remote package/directory and its checksum |
| `version_source` | Git short SHA, package version, or `manual` |
| `release_number` | Service-local monotonic sequence, three digits, never reused |
| `config_path` | External configuration under `<service-root>/conf/` |
| `lifecycle.mode` | `systemd`, `manual-foreground`, or `manual-background` |
| lifecycle commands | Stop, start, status, and health check supplied by the service |
| `retention` | Number of verified releases; default `5` |

If any required input is unknown, inspect the package or host without changing it. Ask for the missing value only when it cannot be safely derived. Never guess a production path, command, or health endpoint.

## Standard workflow

Read the relevant references before acting:

- [release-layout.md](references/release-layout.md) for path resolution and `current` handling.
- [release-naming-and-retention.md](references/release-naming-and-retention.md) for release IDs, sequence state, and cleanup.
- [deployment-checklist.md](references/deployment-checklist.md) for the ordered preflight, deploy, verify, rollback, and report gates.
- [lifecycle-modes.md](references/lifecycle-modes.md) for systemd/manual lifecycle adapters and environment loading.
- [knowledge-app-example.md](references/knowledge-app-example.md) only when the target resembles the known `knowledge-app` layout.

Then execute the following sequence:

1. Resolve `service_root = deploy_root/service_name` and verify that every target path stays beneath it.
2. Inspect the current `current` target, available releases, required external config keys, disk space, permissions, artifact checksum, and lifecycle commands. Do not read secret values.
3. Allocate the next service-local release number without reuse and build the release ID:

   ```text
   <service-name>-<YYYYMMDDHHmmss>-<git-short-sha>-<number>
   ```

   Replace the Git field with the package version, or with `manual` if neither Git metadata nor a package version exists.
4. Prepare the artifact in a new staging directory, validate its contents and permissions, and promote it to `releases/<release-id>`. Do not modify `current` yet.
5. Verify the external configuration exists, is readable by the service, and contains the declared required keys. Do not copy a version-bundled env file over the external config.
6. Record the previous `current` target, stop the service with the selected lifecycle adapter, atomically point `current` at the new release, and start it with the selected adapter. Do not infer the mode from a host; require `lifecycle.mode`.
7. For `manual-foreground`, output the explicit environment-loading and start command, let the operator start it and use `Ctrl+C` to stop it, then wait for operator confirmation before health checks. For `manual-background`, require an exact stop contract before starting. For `systemd`, use the unit's `EnvironmentFile` and lifecycle commands.
8. Run status and application health checks. On success, write a release record with the release ID, old target, checksum, lifecycle mode, environment-loading mode, status, and rollback target.
9. On any failed validation or health check, restore `current` to the recorded old target, stop/restart using the selected adapter, recheck the old release, retain the failed directory, and write a failure record with the failed phase.
10. After a successful verification, preview and apply retention cleanup. Keep current, previous, failed/unverified, active, and the five newest verified releases.

## Safety gates

- Do not run cleanup until the target list has been resolved, restricted to the service's `releases/` directory, and recorded.
- Do not remove the current or rollback target, even if it is older than the configured retention count.
- Do not replace a `current` directory with a regular directory; repair the layout or stop and report the conflict.
- Do not declare success from a process start alone; require the configured status and health checks.
- Do not require a PID file. In `manual-foreground`, use a foreground `exec` command and `Ctrl+C`; in `manual-background`, require an exact stop command or unique process contract.
- Never use broad process termination such as `killall java`; it can stop unrelated services.
- Do not assume systemd's `EnvironmentFile` is sourced by a direct Shell launch. Shell mode must explicitly load the external env file before starting the main process.
- Do not include env-file values, API keys, passwords, tokens, private keys, or full connection URLs in output.
- Do not claim a remote deployment succeeded unless the remote command output verifies the final pointer and service health.

## Required deployment report

Return a concise report containing:

```text
service: <service_name>
service_root: <absolute service root>
lifecycle_mode: systemd | manual-foreground | manual-background
environment_loading: systemd EnvironmentFile | explicit Shell loader | not started
release: <release id>
previous_release: <resolved previous target or none>
current: <resolved final current target>
artifact_checksum: <checksum>
status: verified | rolled_back | failed
health_check: passed | failed
rollback_target: <resolved target or none>
retention: <count and deleted release IDs, or none>
record: <release record path>
```

If the deployment is not executed, clearly label the report as a dry-run and list the exact commands and missing approvals/inputs instead of fabricating results.
