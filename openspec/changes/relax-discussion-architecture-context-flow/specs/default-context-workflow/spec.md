## MODIFIED Requirements

### Requirement: Default context files MUST distinguish lightweight discussion from development execution
`AGENTS.md` and `CLAUDE.md` MUST allow pure requirement discussion, option
comparison, architecture design, research summaries, and quick architecture
document drafts to proceed without the full `development-workflow` loop when
those tasks do not change code, tests, configuration, refactoring, committed
project documentation, OpenSpec assets, or git commits.

#### Scenario: Fast architecture design is requested
- **WHEN** the user asks for requirement discussion, architecture design, or a
  quick architecture design document
- **AND** the request does not require code, tests, configuration, refactoring,
  committed project documentation, OpenSpec assets, or git commits
- **THEN** the startup context permits a lightweight response or document draft
- **AND** it does not require OpenSpec planning, TDD, code-review-spec, or
  commit-per-task gates

#### Scenario: Design work becomes implementation work
- **WHEN** a lightweight discussion or architecture task later requires code,
  tests, configuration, refactoring, committed project documentation, OpenSpec
  assets, or git commits
- **THEN** the agent must switch into `development-workflow` before making those
  implementation or durable project changes

### Requirement: Default context files MUST stay aligned with each other
`AGENTS.md` and `CLAUDE.md` MUST remain semantically aligned so they do not drift
as the workflow evolves.

#### Scenario: Either startup file is updated
- **WHEN** one startup context file changes
- **THEN** the same workflow rules are reflected in the other startup context file
