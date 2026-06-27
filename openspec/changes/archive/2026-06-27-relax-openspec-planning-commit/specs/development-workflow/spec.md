# development-workflow Specification Delta

## Modified Requirements

### Requirement: Development workflow MUST validate planning before implementation
The development workflow MUST create or update and validate the OpenSpec planning
asset before any production implementation starts. The workflow MUST NOT require
that validated planning asset to be committed as an independent planning commit by
default. Instead, the workflow MUST commit OpenSpec planning files together with
the first atomic task commit that carries a complete business module. A standalone
OpenSpec or documentation commit is allowed only when the change itself is
documentation-only or when no business implementation remains to carry the
document update.

#### Scenario: OpenSpec planning passes validation before business implementation
- **WHEN** the OpenSpec change validates successfully
- **THEN** implementation may begin without creating a standalone planning commit
- **AND** the OpenSpec planning files are included in the next atomic task commit
  that carries a complete business module

#### Scenario: Change has only documentation or OpenSpec state
- **WHEN** the change is documentation-only
- **OR** no business implementation remains to carry an OpenSpec or documentation update
- **THEN** the workflow may create a standalone documentation/OpenSpec commit

### Requirement: Development workflow MUST process implementation tasks one at a time
The development workflow MUST select the next unchecked OpenSpec task and complete
the full gate sequence before moving to another task. Each task commit MUST be a
Chinese Conventional Commit created with full style and MUST include a non-empty
body and non-empty footer. Task commits SHOULD carry at least one complete
business module, and MUST include related OpenSpec planning files when they have
not yet been committed.

#### Scenario: Creating a task commit
- **WHEN** the workflow reaches the commit gate for a completed task
- **THEN** it applies `commit --style=full`
- **AND** the commit message body explains what changed and why
- **AND** the commit message footer includes traceability metadata such as `Refs: <OpenSpec change/task>`
- **AND** the staged files include the task's related OpenSpec planning files
  when those files have not yet been committed
