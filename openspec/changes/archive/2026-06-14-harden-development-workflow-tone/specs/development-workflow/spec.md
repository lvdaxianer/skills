## MODIFIED Requirements

### Requirement: Development workflow MUST be treated as mandatory and non-optional
The development workflow MUST read as a hard rule set. It MUST use direct
mandatory language, including "must", "must not", and "do not", so the user
cannot reasonably interpret the workflow as optional guidance. Any deviation
from the workflow MUST be treated as noncompliant.

#### Scenario: User reads the workflow
- **WHEN** an agent reads `development-workflow/SKILL.md`
- **THEN** the text makes the workflow mandatory
- **AND** the text does not present the gates as optional suggestions
- **AND** the text tells the agent to treat deviations as noncompliant

### Requirement: Development workflow MUST keep startup context files as hard pointers
The startup context files MUST point to `~/.claude/skills/development-workflow/SKILL.md`
as the single canonical source. They MUST NOT duplicate the workflow rules in
full, so future edits happen in one place.

#### Scenario: Home context files are read
- **WHEN** an agent opens the Claude/Codex home-context files
- **THEN** the files point to the canonical development-workflow skill
- **AND** they do not repeat the full workflow text
