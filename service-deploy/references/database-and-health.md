# Database Migration and Health Verification

## Migration gate

Before stop/switch, inspect the release manifest and migration directories. Record `migration.present`, runner, version range and compatibility class. If no migration exists, record `not_present`; do not silently assume schema compatibility.

Flyway or another automatic runner is allowed only when the service contract explicitly permits it, the migration is transactionally safe for that database, the lock/timeout behavior is known, and the release record names the runner. Otherwise run migrations as a separate reviewed step before application switch.

Require one of:

- **expand/contract**: add nullable columns/tables/indexes first, deploy code that reads both forms, backfill, then remove old fields only in a later release;
- **forward/backward compatible**: old and new code can both operate during the switch;
- **approved exception**: incompatible or irreversible migration has a verified backup, restore evidence, maintenance window and named human approval.

Code rollback does not roll back database schema. If a migration has run, rollback must use the migration recovery plan; never claim that changing `current` restored the database. An irreversible migration without backup/approval is a hard stop before switch.

## Health matrix

Declare exact commands, timeout, retry count and interval before deployment. A recommended baseline is timeout `90s`, 18 retries, 5 seconds apart; services may use stricter values but must record them.

1. **Status**: `systemctl is-active`, exact service status command, or a service-owned status command; prove the expected service user and state.
2. **Readiness**: readiness endpoint/command proves the service can accept traffic and dependencies required for traffic are ready.
3. **Liveness**: liveness endpoint/command proves the process event loop is responsive; it is not sufficient alone.
4. **Startup logs**: inspect bounded recent logs for fatal startup, bind, classloading, migration or dependency errors; redact sensitive lines.
5. **Dependencies**: verify database, Redis, object storage and other declared dependencies using non-destructive probes.
6. **Proxy**: validate `nginx -t` or equivalent, then test the configured proxy path and TLS/host routing.
7. **Business smoke**: call at least one real read-only API operation; for a web app test homepage, History fallback and API proxy.
8. **Loaded artifact**: inspect cmdline/classpath/working directory or a service diagnostic to prove the JAR/executable resolves beneath the new current release. For Docker, also inspect the container image digest, release label, effective override manifest and declared persistent mounts.

For Docker, a container being `running`, `docker inspect` succeeding or an image healthcheck passing is not a complete health result. The service MUST still run the declared readiness, liveness, dependency and business smoke checks. If a local database, Redis, object store or index is containerized, probe the exact Compose service and verify its data mount is the declared persistent path.

If a check is not applicable, record a reason and an explicit `not_applicable`; do not replace it with “process exists”. Any failed required check marks the release failed and enters rollback rules.
