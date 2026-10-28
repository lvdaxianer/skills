# Deployment Checklist

Use this order for every deployment. Mark each gate with command output or a file path; do not infer success from intent.

## 1. Preflight (read-only)

- Confirm `deploy_root` is absolute and resolve `service_root`.
- Confirm the service name and release ID do not contain path separators or shell metacharacters.
- Inspect `current` and record its resolved target, or record that no current release exists.
- Confirm the target release path is under `service_root/releases/` and is not already present.
- Check artifact presence, checksum, archive type, disk space, ownership, and required runtime version.
- Check the external configuration file exists, is readable, and has required key names. Do not print values.
- Resolve lifecycle commands and health checks. Confirm whether they are scripts, direct commands, or an optional systemd adapter.
- Acquire a service-level deployment lock so two releases cannot allocate the same sequence number or switch `current` concurrently.

## 2. Prepare

- Allocate the next never-used service-local sequence number and write the release ID to the release record/state before publishing.
- Extract/copy the artifact into a staging directory under the service root.
- Verify expected files, executable permissions, ownership, and checksum.
- Confirm the package does not contain live secrets or an instruction to overwrite external configuration.
- Promote the complete staging directory to the final immutable `releases/<release-id>` path.

## 3. Switch and start

- Record the old `current` target as `previous_release`.
- Stop the service using its declared stop command.
- Create a temporary symlink to the final release and atomically replace `current`.
- Confirm `readlink -f current` equals the new release path.
- Start the service using its declared start command. systemd is optional.

## 4. Verify

- Run the declared status check and confirm the expected process/service state.
- Run the application health check, including a meaningful endpoint or operation when available.
- Check logs for startup failure without copying secret-bearing lines into the report.
- Verify the process working directory or loaded artifact resolves through the new release when the service exposes that evidence.

## 5. Roll back on failure

- Stop the failed release.
- Atomically restore `current` to `previous_release`.
- Start the previous release and rerun status and health checks.
- Keep the failed release and write a record with `failed_phase`, `previous_release`, and rollback result.
- If rollback health also fails, stop and report the incident; do not delete either release or guess a third target.

## 6. Record and clean

- Write a success record only after health verification passes; otherwise write a failure/rolled-back record.
- Include service, root, release ID, timestamp with timezone, source metadata, checksums, old/current targets, status, health result, and retention result.
- Exclude env values, passwords, tokens, API keys, private keys, and full secret-bearing URLs.
- Preview and apply the default five-release retention policy, protecting current, previous, active, failed, and unverified releases.
- Release the service lock and return a concise deployment report.
