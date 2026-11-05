# Release Naming, Sequence State and Retention

## Release ID grammar

```text
<service-name>-<YYYYMMDDHHmmss>-<version-or-git-short-sha>-<three-digit-sequence>
```

Validation:

```regex
^([a-z0-9][a-z0-9-]{0,62})-([0-9]{14})-([A-Za-z0-9][A-Za-z0-9._+~-]{0,63})-([0-9]{3})$
```

The service slug MUST be lowercase and cannot contain separators, whitespace or shell metacharacters. Timestamp uses deployment host local time in 24-hour format; timezone and offset go in the record. Source field priority is the first seven characters of a valid Git SHA, normalized package version, then literal `manual`. Never invent a SHA or version. The release ID becomes immutable once allocated.

Examples:

```text
kbsearch-20261028100814-c0de704-001
kbsearch-20261028101530-v1.2.3-002
kbsearch-20261028102000-manual-003
```

## Sequence allocation

Use these paths:

```text
<service-root>/run/deploy.lock
<service-root>/release-records/sequence.state
<service-root>/release-records/<release-id>.json
```

`sequence.state` is a single decimal integer, deployment-user owned, mode `0600`; create parent directories mode `0750` where the service policy permits. Acquire an exclusive service lock with `flock -x` (or an equivalent OS lock) before reading, incrementing and writing the state. Write to a same-directory temp file, `fsync` when available, and rename atomically. The lock remains held through release record/attempt creation so a concurrent process cannot allocate or publish the same sequence.

The allocator MUST:

1. Read the highest number from `sequence.state` and managed release records/directories.
2. Choose `max_seen + 1`; reject `000` and any number over `999` unless the format is explicitly extended in a future version.
3. Persist the increment before release promotion and record the allocation as an attempt.
4. Never decrement or reuse the number after failed, interrupted or deleted releases.

If `sequence.state` is missing but release records exist, reconstruct only from verified records under the lock, write the next value, and report the repair. If state is corrupt or there are conflicting records, stop; do not guess.

## Retention

`retention.sh preview <service-root> [count]` computes but does not delete. `retention.sh apply <service-root> [count] --apply` deletes only the exact preview set; without `--apply` it remains a preview. Default count is `5` and MUST be an integer `>=0`.

Protected set:

1. physical target of `current`;
2. recorded `previous_release`;
3. active/deployed release and any release currently under validation;
4. every release with status `failed`, `rolled-back`, `prepared`, `validated`, `stopped`, `switched`, `started` or no trustworthy record;
5. explicitly operator-protected releases.

The keep set is the newest `count` verified releases plus the protected set. Before deletion, resolve each candidate with `readlink -f`, assert it is a direct child directory of the physical `<service-root>/releases`, assert its basename matches release ID grammar, and reject unknown/corrupt/history directories. Delete the directory itself with `rm -rf -- "$candidate"` only after those checks; never use `rm -rf "$service_root"`, a glob, or a broad path. Record `deleted_releases` and the exact preview in the release record.

If disk is below the service's critical threshold, do not delete unverified releases to make space. First stop the deployment, report the threshold and safe candidates, and require an operator-approved emergency cleanup using the same path checks.

Historical release directories that predate the sequence suffix are preserved unless explicitly mapped to a managed record; an orphaned current target, unknown directory or damaged directory is preserved and reported.

For `runtime_target=docker-container`, retention has a second reference check: keep every Registry digest or local image ID referenced by current, previous, active, failed, unverified or retained release descriptors, and keep verified archive checksums needed for rollback. It MUST also protect every release ID listed in the `override_chain` of any protected release; deleting a base layer while a newer release references it is forbidden. Delete only an exact unreferenced local image or archive after the release preview is accepted. Image cleanup is not a substitute for release retention and MUST NOT delete `data`, `volumes`, `conf` or any release layer under `overrides`. Never use `docker system prune -a` or a volume-destructive Compose command as retention.
