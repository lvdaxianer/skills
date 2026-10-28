# Deployment Checklist v2

Mark every gate with a command output, record path or explicit operator confirmation. Do not infer success from intent.

## 1. Preflight (read-only)

- [ ] Validate absolute `deploy_root`, lowercase `service_name`, release ID fields and `service_root` boundary.
- [ ] Resolve `current` with physical paths; record current, previous and reject outside/dangling/regular-directory targets.
- [ ] Acquire `run/deploy.lock`; install traps for lock and named temporary state cleanup.
- [ ] Check disk warning/critical thresholds, owner/group, service user, runtime version and permissions.
- [ ] Verify artifact SHA-256; if policy requires, verify signature/provenance/SBOM.
- [ ] Inspect tar members for absolute/`../` paths, links, tarbomb, forbidden directories and devices.
- [ ] Confirm required files, executable scripts, owner/group and release layout.
- [ ] Check external env owner/group, mode, parser grammar, required key names/non-empty status and typed formats without printing values.
- [ ] Resolve lifecycle mode, exact start/stop/status/health commands and environment-loading mechanism.
- [ ] For manual-background, validate user/cmdline/artifact/start-time/port identity and exact stop contract.
- [ ] Detect migrations, compatibility class, runner, backup and approval evidence.

## 2. Prepare and validate

- [ ] Lock and allocate next never-used three-digit sequence in `release-records/sequence.state` (`0600`); persist attempt before promotion.
- [ ] Build and regex-validate `<service-name>-<YYYYMMDDHHmmss>-<version-or-git-short-sha>-<three-digit-sequence>`; use `manual` if no Git/version.
- [ ] Extract only into a new staging directory below releases; never overwrite conf/logs/run/release-records.
- [ ] Run the current contract test against both current and physical release script paths.
- [ ] Promote complete staging directory to immutable release path.

## 3. Stop, switch and start

- [ ] Record `previous_release` and write state `validated`.
- [ ] Stop with declared adapter; status must prove old identity is down. Stop failure blocks switching.
- [ ] State `stopped`; atomically replace current via same-directory temporary symlink; verify physical target.
- [ ] State `switched`; start via systemd EnvironmentFile, restricted Shell loader or dedicated parser.
- [ ] State `started`; verify process/service user, cmdline, loaded artifact and port ownership.
- [ ] For foreground mode, operator confirms process running before health checks; Ctrl+C remains the stop contract.

## 4. Health verification

- [ ] Run status, readiness and liveness with declared timeout/retry/interval.
- [ ] Inspect bounded startup logs for fatal errors without copying secrets.
- [ ] Check database, Redis, object storage and other declared dependencies.
- [ ] Check Nginx config/proxy/TLS/listener boundary where applicable.
- [ ] Run real read-only business smoke API; web stacks also check homepage and History fallback.
- [ ] Prove loaded JAR/executable comes from current release; process existence or Actuator UP alone is insufficient.

## 5. Rollback and interruption

- [ ] On failure, retain failed release and state `failed` with `failed_phase`.
- [ ] Stop only the new process identity; if stop fails, stop and request operator action.
- [ ] Atomically restore recorded previous current, start it and rerun status/health.
- [ ] If rollback passes, state `rolled-back`; if it fails, state `failed`, report incident and do not choose a third release.
- [ ] After SSH interruption, run reconcile from durable state; never remove unknown locks or processes.

## 6. Record and retention

- [ ] Write a schema-valid record with all required fields and redaction rules.
- [ ] Run `retention.sh preview <service-root> 5`, record exact deletion candidates.
- [ ] After a verified success, run `retention.sh apply <service-root> 5 --apply`; protect current/previous/active/failed/unverified.
- [ ] Record `deleted_releases`, release `record_path`, final current and retention result.
- [ ] Release the lock and return the required report.
