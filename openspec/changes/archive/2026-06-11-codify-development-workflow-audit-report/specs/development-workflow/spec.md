## ADDED Requirements

### Requirement: Development workflow MUST emit a final audit report after all tasks finish
After the final audit passes, the development workflow MUST emit an audit report
that lists which OpenSpec tasks were completed and which OpenSpec tasks were not
completed.

#### Scenario: Change is fully executed
- **WHEN** every planned task has been processed and the final audit has passed
- **THEN** the workflow emits an audit report
- **AND** the report lists completed tasks
- **AND** the report lists unfinished tasks, if any remain

### Requirement: Development workflow MUST make the final audit report part of completion
The development workflow MUST treat the audit report as part of the completed
change closing sequence before archive completion is considered done.

#### Scenario: Final audit completes
- **WHEN** the workflow reaches the end-of-change closing sequence
- **THEN** the audit report is produced before the change is treated as fully closed
