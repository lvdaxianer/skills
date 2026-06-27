## ADDED Requirements

### Requirement: Code review spec MUST require Chinese code comments when comments are written or modified
The code review spec skill entry point MUST state that newly written or modified
code comments use Chinese comments, so future reviews enforce the user's
comment language preference.

#### Scenario: Reviewing a change that writes or updates comments
- **WHEN** reviewed code adds or modifies code comments
- **THEN** the code review skill requires those comments to be written in
  Chinese
- **AND** the rule does not require changing unrelated existing comments outside
  the reviewed diff
