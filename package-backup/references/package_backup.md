# package_backup.sh Behavior Contract

This reference captures the archive behavior required by
`/Users/lvdaxianer/Downloads/shell-main/package_backup.sh`.

## Archive Creation

- Output archives are zip files only.
- Archive names use `[name].[type].[yyyyMMdd][sequence].zip`.
- The default type is `backup`.
- The restore snapshot type is `pre-restore`.
- Type values must be non-empty and must not contain `/` or `.`.
- The sequence is two-digit and starts at `00`.
- When a candidate archive path already exists, choose the next unused path.

## Restore Input

- Restore input must be an existing `.zip` file.
- Archive entries must reject absolute paths.
- Archive entries must reject parent-directory traversal.
- The archive must contain exactly one top-level file or directory.
- The archive filename source name must match that top-level object.

## Restore Safety

- When the destination already exists, create a snapshot before replacing it.
- Use the `pre-restore` snapshot type for that backup.
- remove the existing target only after the snapshot succeeds, so restore
  cleanup never happens before the pre-restore backup exists.
- Restore only after the zip file, root object, and filename checks pass.

## Operational Notes

- The reference is the behavior contract for packaging and extraction work.
- The contract should be updated whenever the source shell script changes.
