## MODIFIED Requirements

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
