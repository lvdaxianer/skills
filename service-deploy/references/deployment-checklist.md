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
- [ ] Resolve `runtime_target` as `host-process` or `docker-container`; for Docker select exactly one `image_transport`: `registry`, `local-daemon` or `archive`. Record the immutable release tag, Registry manifest digest or local image ID, latest alias status, Compose/CLI manifest, project/name labels and mode-specific evidence.
- [ ] For `registry`, verify Registry URL/auth, push/pull and manifest digest; for `local-daemon`, inspect the preloaded local image ID without `docker login`/`pull`; for `archive`, verify the archive SHA-256 before `docker load` and inspect the loaded image ID. Never require a Registry when the selected mode is local.
- [ ] For Docker, read and apply `dockerfile-standard.md`: verify digest-pinned bases, scoped `.dockerignore`, runtime stage, non-root user, `/app` layout, local entrypoint and required packaged resources.
- [ ] For Docker, run `docker buildx build --check` and an offline or egress-restricted startup test; prove entrypoint/startup/healthcheck does not download or install resources.
- [ ] For Docker, classify every `conf`, `data`, `overrides`, `volumes`, `logs` and `run` path with backup/restore policy; reject container writable-layer-only business data.
- [ ] For Docker, validate rendered mounts physically, reject `/app/lib` replacement, Docker socket/host-root mounts and implicit anonymous business volumes.
- [ ] For Docker, validate override manifest, JAR/config checksums, deterministic precedence and compatibility evidence without printing values.
- [ ] For manual-background, validate user/cmdline/artifact/start-time/port identity and exact stop contract.
- [ ] Detect migrations, compatibility class, runner, backup and approval evidence.

## 2. Prepare and validate

- [ ] Lock and allocate next never-used three-digit sequence in `release-records/sequence.state` (`0600`); persist attempt before promotion.
- [ ] Build and regex-validate `<service-name>-<YYYYMMDDHHmmss>-<version-or-git-short-sha>-<three-digit-sequence>`; use `manual` if no Git/version.
- [ ] Extract only into a new staging directory below releases; never overwrite conf/logs/run/release-records.
- [ ] Run the current contract test against both current and physical release script paths.
- [ ] Promote complete staging directory to immutable release path.
- [ ] For Docker, promote the immutable release descriptor containing `image_transport`, release tag, mode-specific image identity and persistence/override manifests; do not build from production context.

## 3. Stop, switch and start

- [ ] Record `previous_release` and write state `validated`.
- [ ] Stop with declared adapter; status must prove old identity is down. Stop failure blocks switching.
- [ ] State `stopped`; atomically replace current via same-directory temporary symlink; verify physical target.
- [ ] State `switched`; start via systemd EnvironmentFile, restricted Shell loader or dedicated parser.
- [ ] State `started`; verify process/service user, cmdline, loaded artifact and port ownership.
- [ ] For Docker, verify exact container/project identity, service/release labels, Registry digest or local image ID, configured user, mounts and port ownership.
- [ ] For foreground mode, operator confirms process running before health checks; Ctrl+C remains the stop contract.

## 4. Health verification

- [ ] Run status, readiness and liveness with declared timeout/retry/interval.
- [ ] Inspect bounded startup logs for fatal errors without copying secrets.
- [ ] Check database, Redis, object storage and other declared dependencies.
- [ ] Check Nginx config/proxy/TLS/listener boundary where applicable.
- [ ] Run real read-only business smoke API; web stacks also check homepage and History fallback.
- [ ] Prove loaded JAR/executable comes from current release; process existence or Actuator UP alone is insufficient.
- [ ] For Docker, prove the effective image digest and override classpath/configuration match the current descriptor; container `running` alone is insufficient.
- [ ] For Docker, verify registry/package/code/model repositories are blocked at runtime; allow only declared business dependencies such as database, Redis or object storage.
- [ ] Only after health/smoke pass and the verified release record is written, update `latest` under the lock: Registry mode uses the exact manifest digest; local-daemon/archive tags the exact local image ID. Inspect the alias and compare the mode-specific identity with the record.

## 5. Rollback and interruption

- [ ] On failure, retain failed release and state `failed` with `failed_phase`.
- [ ] Stop only the new process identity; if stop fails, stop and request operator action.
- [ ] Atomically restore recorded previous current, start it and rerun status/health.
- [ ] For Docker, restore the previous Registry digest or local image ID, persistence manifest and override manifest; for archive mode, require a verified rollback archive when the image is not loaded. Never remove volumes during rollback.
- [ ] After rollback health passes, update `latest` to the previous mode-specific identity and verify it; if alias update fails, preserve the healthy pinned service and record a retry-required alias failure.
- [ ] If rollback passes, state `rolled-back`; if it fails, state `failed`, report incident and do not choose a third release.
- [ ] After SSH interruption, run reconcile from durable state; never remove unknown locks or processes.

## 6. Record and retention

- [ ] Write a schema-valid record with all required fields and redaction rules.
- [ ] Run `retention.sh preview <service-root> 5`, record exact deletion candidates.
- [ ] After a verified success, run `retention.sh apply <service-root> 5 --apply`; protect current/previous/active/failed/unverified.
- [ ] Record `deleted_releases`, release `record_path`, final current and retention result.
- [ ] For Docker, retain image identities referenced by protected releases and verified rollback archives; delete local images only by exact unreferenced image ID; never use `docker system prune -a`.
- [ ] Protect the identity referenced by `latest`; a failed/unverified release MUST NOT move or replace the alias.
- [ ] Release the lock and return the required report.
