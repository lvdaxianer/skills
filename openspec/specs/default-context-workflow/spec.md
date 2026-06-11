# default-context-workflow Specification

## Purpose
Define the repository startup context rules that mirror the approved development workflow for both `AGENTS.md` and `CLAUDE.md`.
## Requirements
### Requirement: Default context files MUST mirror the approved development workflow
`AGENTS.md` and `CLAUDE.md` MUST describe the same workflow rules as
`development-workflow/SKILL.md`, including brainstorming, OpenSpec change
structure, TDD, review gates, commit-per-task, and final audit reporting.

#### Scenario: Startup context is read
- **WHEN** an agent opens `AGENTS.md` or `CLAUDE.md`
- **THEN** the file requires `development-workflow/SKILL.md`
- **AND** the file includes the current planning, TDD, review, commit, and final audit report rules

### Requirement: Default context files MUST stay aligned with each other
`AGENTS.md` and `CLAUDE.md` MUST remain semantically aligned so they do not drift
as the workflow evolves.

#### Scenario: Either startup file is updated
- **WHEN** one startup context file changes
- **THEN** the same workflow rules are reflected in the other startup context file
