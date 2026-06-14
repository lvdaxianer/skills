# default-context-workflow Specification

## Purpose
Define the repository startup context rules that mirror the approved development workflow for both `AGENTS.md` and `CLAUDE.md`.
## Requirements
### Requirement: Default context files MUST mirror the approved development workflow
`AGENTS.md` and `CLAUDE.md` MUST describe the same workflow rules as
`development-workflow/SKILL.md`, and they MUST do so in the same hard-mandatory
style. Startup context files that live in the home directories MUST be hard
pointers to the canonical skill and MUST NOT duplicate the workflow text.

#### Scenario: Startup context is read
- **WHEN** an agent opens `AGENTS.md` or `CLAUDE.md`
- **THEN** the file requires `development-workflow/SKILL.md`
- **AND** the file uses the same hard-mandatory wording style as the canonical skill
- **AND** the home-context files point to the canonical skill instead of repeating the full workflow

### Requirement: Default context files MUST stay aligned with each other
`AGENTS.md` and `CLAUDE.md` MUST remain semantically aligned so they do not drift
as the workflow evolves.

#### Scenario: Either startup file is updated
- **WHEN** one startup context file changes
- **THEN** the same workflow rules are reflected in the other startup context file

