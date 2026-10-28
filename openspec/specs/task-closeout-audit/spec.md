# Task Closeout Audit

## Purpose

为任务完成后的 Git 收尾提供可重复、证据明确的审计和自动清理能力，帮助用户确认任务是否合并，并自动移除已确认合并且安全的临时分支和 worktree。

## Requirements

### Requirement: Explicit read-only invocation

The system SHALL provide the `task-closeout-audit` skill for explicit invocation
through `/task-closeout-audit`. It SHALL only mutate Git state for a task whose
merge evidence is proven and whose cleanup passes the documented safety checks.

#### Scenario: User invokes the audit command

- **WHEN** the user invokes `/task-closeout-audit` from within a Git repository
- **THEN** the skill scans the repository and automatically cleans only proven-merged, safe task resources without asking for confirmation

### Requirement: Repository task inventory

The system SHALL inspect all locally discoverable task branches under `features/`
or `fixes/`, all registered Git worktrees, and each available `.source_branch`
record associated with a task worktree.

#### Scenario: Task branch and worktree are both present

- **WHEN** a task branch has a registered worktree
- **THEN** the report identifies the task branch, worktree path, source branch metadata, whether the worktree has uncommitted changes, and cleanup state

#### Scenario: Historical task naming is non-canonical

- **WHEN** a local task branch uses a historical name under `features/` or `fixes/` that does not match the current emoji naming convention
- **THEN** the audit includes it and marks naming irregularity as a warning instead of excluding it

### Requirement: Evidence-based merge and cleanup status

The system SHALL report a task as merged only when the recorded source branch exists and Git proves the task branch tip is an ancestor of that source branch. For a proven-merged task, it SHALL remove the clean, non-current task worktree under the configured task-worktree root and delete its local task branch without asking for confirmation. It SHALL preserve resources when evidence is unknown or negative, the worktree is dirty, current, locked, outside the configured root, or cleanup fails.

#### Scenario: Merged clean task is cleaned automatically

- **WHEN** a task branch is an ancestor of its existing recorded source branch, its registered worktree is under the task-worktree root, and the worktree is clean and not the current checkout
- **THEN** the system removes the task worktree, deletes the merged local task branch, and reports both cleanup actions as successful

#### Scenario: Merged dirty task is preserved

- **WHEN** a merged task worktree contains uncommitted changes
- **THEN** the system does not remove the worktree or branch and reports that cleanup was skipped because the worktree is dirty

#### Scenario: Unmerged or unknown task is preserved

- **WHEN** the source branch is missing, metadata is unavailable, or the task tip is not an ancestor of the source branch
- **THEN** the system performs no cleanup and reports the corresponding `UNKNOWN` or `NOT_MERGED` evidence

#### Scenario: Cleanup failure does not cascade

- **WHEN** worktree removal fails
- **THEN** the system does not attempt to delete the associated branch and reports the worktree removal failure

### Requirement: Cleanup-aware report

The system SHALL include a machine-readable cleanup state for every discovered task and aggregate counts for cleaned, skipped, and failed cleanup outcomes. The final user-visible response SHALL be written entirely in Chinese, including table headers, status descriptions, cleanup results, warnings, summary counts, and limitations. Stable machine-record keys MAY remain internal and SHALL NOT be presented as the user-facing report.

#### Scenario: Mixed cleanup outcomes are summarized

- **WHEN** the repository contains merged clean, merged dirty, unmerged, and unknown tasks
- **THEN** the report includes each task's merge evidence, resource state, cleanup result, and aggregate cleanup counts without claiming skipped resources were deleted

#### Scenario: No task records are discoverable

- **WHEN** no task branch or task worktree is discoverable in the repository
- **THEN** the report says that no discoverable task records remain and explicitly avoids claiming that every historical task was merged and cleaned up

#### Scenario: User-visible report is Chinese

- **WHEN** the Skill presents the audit result to the user
- **THEN** all visible headings, table fields, status meanings, cleanup explanations, warnings, and limitations are expressed in Chinese, while branch names and file paths remain unchanged
