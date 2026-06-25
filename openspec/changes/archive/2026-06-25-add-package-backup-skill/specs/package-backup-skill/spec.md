## ADDED Requirements

### Requirement: Package backup skill MUST trigger for archive creation and extraction tasks
The skill MUST be discoverable for user requests involving packaging, backup
archives, zip archive creation, restore operations, unzip, extraction, or
equivalent file archive workflows.

#### Scenario: User asks to package a target
- **WHEN** a user asks an agent to package, back up, zip, restore, unzip, or
  extract files or directories
- **THEN** the agent uses the `package-backup` skill
- **AND** the agent applies the skill before selecting archive names or running
  shell commands

### Requirement: Package backup skill MUST load the script-derived reference before acting
The skill MUST require agents to read
`package-backup/references/package_backup.md` before performing any package or
restore action. The reference MUST be treated as the local behavior contract
derived from `/Users/lvdaxianer/Downloads/shell-main/package_backup.sh`.

#### Scenario: Agent prepares an archive command
- **WHEN** the agent is about to create, restore, unzip, or extract an archive
- **THEN** it reads `package-backup/references/package_backup.md`
- **AND** it follows the documented behavior contract instead of inventing a
  different archive convention

### Requirement: Package backup skill MUST preserve the package_backup.sh archive contract
The skill reference MUST preserve the source script's core behavior: zip archives
only, archive names formatted as `[name].[type].[yyyyMMdd][sequence].zip`,
default type `backup`, pre-restore snapshot type `pre-restore`, type values that
are non-empty and contain neither `/` nor `.`, two-digit sequences starting at
`00`, and non-overwriting archive path selection.

#### Scenario: Agent creates a package backup
- **WHEN** the agent packages an existing file or directory
- **THEN** it creates a `.zip` archive beside the target
- **AND** it names the archive according to the script format and validation
  rules
- **AND** it selects the next unused two-digit sequence instead of overwriting an
  existing archive

### Requirement: Package backup skill MUST preserve restore safety behavior
The skill reference MUST preserve the source script's restore safety behavior:
restore input must be an existing `.zip` file, archive entries must reject
absolute paths and parent-directory traversal, the archive must contain exactly
one top-level file or directory, the archive filename's source name must match
that top-level object, and an existing restore target must be snapshotted before
removal and extraction.

#### Scenario: Agent restores a package backup
- **WHEN** the agent restores an archive
- **THEN** it validates the zip file, top-level root, path safety, and archive
  filename consistency before extraction
- **AND** it creates a pre-restore snapshot when the destination object already
  exists
- **AND** it removes the existing destination only after the snapshot step has
  succeeded
