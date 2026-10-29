# Multi-component Stack and Service Recoverability

## Stack manifest

For backend/frontend/nginx/database migration deployments, require one manifest containing `deployment_id`, component release IDs, compatibility range, artifact/image checksums, runtime target, lifecycle mode, migration status, persistence mounts and rollback order. Backend and frontend MUST share the same deployment ID when they are released as one user-visible stack; independently versioned components need an explicit compatibility range.

Recommended order:

1. validate all artifacts and Nginx config;
2. run expand/compatible database migration;
3. deploy backend and verify readiness/dependencies;
4. publish frontend assets and verify cache/fallback behavior;
5. switch/reload Nginx only after backend and frontend smoke tests are ready;
6. run homepage, History fallback, API proxy and TLS/host smoke tests.

On partial failure, reverse traffic exposure first, then frontend, backend and only the migration recovery procedure that is explicitly safe. Do not automatically reverse an irreversible schema change. Preserve all component releases and write one stack record referencing component records.

For Docker stacks, each component uses an immutable Registry digest or local image ID and explicit host persistence manifest. Frontend/backend overrides and persistent data are component-scoped unless the stack manifest declares a shared mount. A container recreation MUST use the same declared volumes and override checksums; a Compose project MUST not rely on an anonymous volume for business data.

Nginx checks MUST include `nginx -t`, configured listen address/port, TLS certificate validity/ownership, upstream target and firewall boundary. Management ports such as `8081` MUST bind to the intended private interface or be firewall-restricted; they must not be publicly exposed. TLS, certificates, listeners and firewall rules belong to the infrastructure/operator boundary unless the manifest explicitly assigns them to the deployment.

## Recoverability

`manual-background` does not recover automatically after server reboot; either supply an operator runbook that reconciles the state and starts the exact release, or recommend systemd. systemd is preferred for unattended services because it can provide `Restart=on-failure`, `RestartSec`, `TimeoutStartSec`, `TimeoutStopSec`, `LimitNOFILE`, `User`, `WorkingDirectory` and journald integration. These values are service-specific inputs, not universal defaults.

Use a non-root service user with only release read/execute, conf read, logs write and run/record permissions. Root startup is a documented risk: a compromised package or command can modify the host. Apply log rotation with bounded retention/compression, alert at a warning disk threshold (for example 20%) and stop at a critical threshold (for example 10%) before staging new artifacts. Retention must not delete failed/unverified releases merely to recover space.

After a crash or reboot, inspect the last state/record, current target, service user, cmdline, ports and health before starting anything. Do not start a second instance based only on a missing PID file.

For Docker, inspect the exact Compose project/container labels, Registry digest or local image ID, required mounts, persistent data paths and override manifest before recreation. `manual-background` does not auto-recover after reboot; systemd is recommended for unattended Docker services. Never recover by `docker system prune`, broad container filters or volume deletion.
