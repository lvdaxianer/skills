# Spec Delta

## Purpose

为任务完成后的 Git 收尾提供可重复、只读且证据明确的审计能力，帮助用户确认
任务是否合并，以及临时分支和 worktree 是否仍然存在。

## ADDED Requirements

### Requirement: Explicit read-only invocation

The system SHALL provide the `task-closeout-audit` skill for explicit invocation
through `/task-closeout-audit`, and the audit SHALL NOT modify Git refs, worktrees,
files, or repository configuration.

#### Scenario: User invokes the audit command

- **WHEN** the user invokes `/task-closeout-audit` from within a Git repository
- **THEN** the skill runs the repository audit and produces a report without
  executing merge, branch deletion, worktree removal, or file-writing operations

### Requirement: Repository task inventory

The system SHALL inspect all locally discoverable task branches under `features/`
or `fixes/`, all registered Git worktrees, and each available `.source_branch`
record associated with a task worktree.

#### Scenario: Task branch and worktree are both present

- **WHEN** a task branch has a registered worktree
- **THEN** the report identifies the task branch, worktree path, source branch
  metadata, and whether the worktree has uncommitted changes

#### Scenario: Historical task naming is non-canonical

- **WHEN** a local task branch uses a historical name under `features/` or `fixes/`
  that does not match the current emoji naming convention
- **THEN** the audit includes it and marks naming irregularity as a warning instead
  of excluding it

### Requirement: Evidence-based merge and cleanup status

The system SHALL report merge status only when the source branch exists and Git
proves the task branch tip is an ancestor of that source branch; missing source
metadata or deleted objects SHALL be reported as unknown rather than inferred as
successful completion.

#### Scenario: Task is merged but resources remain

- **WHEN** the task branch is an ancestor of its recorded source branch and the
  task branch or worktree still exists
- **THEN** the report states that the task is merged and identifies each remaining
  resource separately

#### Scenario: Task is not merged

- **WHEN** the task branch exists but its tip is not an ancestor of the recorded
  source branch
- **THEN** the report states that the task is not merged and does not recommend
  deletion as completed cleanup

#### Scenario: Evidence is insufficient

- **WHEN** the task branch has no readable source metadata, the source branch is
  missing, or both branch and worktree records have already disappeared
- **THEN** the report marks the relevant merge or lifecycle state as unknown and
  explains which evidence is unavailable

### Requirement: Actionable summary without destructive action

The system SHALL produce a human-readable summary that distinguishes merged,
unmerged, partially cleaned, orphaned, and unknown states, and SHALL provide
read-only evidence or suggested follow-up commands without running cleanup.

#### Scenario: Repository contains mixed task states

- **WHEN** the repository contains multiple tasks with different merge, branch,
  worktree, or metadata states
- **THEN** the report includes one row per discovered task and an aggregate count
  for each relevant state

#### Scenario: No task records are discoverable

- **WHEN** no task branch or task worktree is discoverable in the repository
- **THEN** the report says that no discoverable task records remain and explicitly
  avoids claiming that every historical task was merged and cleaned up
