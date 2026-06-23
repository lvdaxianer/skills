## MODIFIED Requirements

### Requirement: Development workflow MUST emit a final audit report after all tasks finish
After the final audit passes, the development workflow MUST emit an audit report
that lists which OpenSpec tasks were completed and which OpenSpec tasks were not
completed. The report MUST also include a final review summary covering which
changes in this modification were good and why, which original code or workflow
aspects were poor and why, and how those poor aspects should be corrected.

#### Scenario: Change is fully executed
- **WHEN** every planned task has been processed and the final audit has passed
- **THEN** the workflow emits an audit report
- **AND** the report lists completed tasks
- **AND** the report lists unfinished tasks, if any remain
- **AND** the report summarizes what this modification did well and why it was
  good
- **AND** the report summarizes what was poor in the original code or workflow,
  why it was poor, and how to correct or improve it
