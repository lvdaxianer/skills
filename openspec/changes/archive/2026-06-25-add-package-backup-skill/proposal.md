## Why

Agents currently have no dedicated skill that tells them how to handle packaging
and extraction tasks according to the repository owner's backup script rules.
That creates room for inconsistent archive names, unsafe restore behavior, or
missing pre-restore snapshots.

## What Changes

- Add a new skill for package backup and restore operations.
- Require the skill to load a reference document derived from
  `/Users/lvdaxianer/Downloads/shell-main/package_backup.sh` before performing
  any archive creation or extraction action.
- Encode the script's required behavior: zip-only output, canonical archive
  naming, type validation, non-overwrite sequence selection, single-root restore
  validation, path traversal rejection, and pre-restore snapshot creation.
- Add focused text contract coverage so future edits preserve the mandatory
  trigger, reference loading rule, and core script-derived constraints.

## Capabilities

### Added Capabilities

- `package-backup`: Archive and extraction operations must follow the
  `package_backup.sh` behavior contract.

## Impact

- Affected documentation: new skill directory and reference document.
- Affected tests: new text contract test for the skill.
- Runtime behavior changes only when an agent chooses a package or extraction
  workflow through this skill.
