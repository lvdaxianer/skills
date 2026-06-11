## ADDED Requirements

### Requirement: Development workflow MUST separate discussion from persisted planning
The development workflow MUST use `superpowers:brainstorming` while requirements
are still being discussed, and MUST create or update an OpenSpec change only when
the user chooses to persist requirements into files.

#### Scenario: User discusses requirements
- **WHEN** the user is clarifying requirements, alternatives, or acceptance criteria
- **THEN** the workflow uses `superpowers:brainstorming`
- **AND** it does not require OpenSpec files until the user chooses to persist the change

### Requirement: Development workflow MUST use one OpenSpec change per independent change
The development workflow MUST persist each independent change under
`openspec/changes/<change-name>/` using the local OpenSpec `spec-driven` layout.

#### Scenario: User approves persisted planning
- **WHEN** requirements are ready to be written to files
- **THEN** the workflow creates or updates `openspec/changes/<change-name>/`
- **AND** the change includes `proposal.md`, `design.md`, `tasks.md`, and one or more `specs/<capability>/spec.md` files
- **AND** the workflow validates the change with `openspec validate <change-name> --strict`

### Requirement: Development workflow MUST commit planning before implementation
The development workflow MUST commit the validated OpenSpec planning asset before
any production implementation starts.

#### Scenario: OpenSpec planning passes validation
- **WHEN** the OpenSpec change validates successfully
- **THEN** the workflow creates an independent planning commit
- **AND** implementation does not begin before that commit succeeds

### Requirement: Development workflow MUST process implementation tasks one at a time
The development workflow MUST select the next unchecked OpenSpec task and complete
the full gate sequence before moving to another task.

#### Scenario: Implementing an OpenSpec task
- **WHEN** an unchecked task is selected
- **THEN** `superpowers:test-driven-development` writes the smallest useful failing test first
- **AND** the workflow confirms RED, implements minimal GREEN, runs focused and broader verification, runs a Superpowers audit against the OpenSpec spec, runs canonical `code-review-spec`, fixes required issues, marks exactly that task complete, and creates one Chinese Conventional Commit

### Requirement: Development workflow MUST archive only after final audit
The development workflow MUST run a final Superpowers audit over the completed
change before archiving the OpenSpec change.

#### Scenario: All OpenSpec tasks are complete
- **WHEN** every task in the change has passed its gates and been committed
- **THEN** the workflow runs a final Superpowers audit over code, specs, and task status
- **AND** only after the audit passes, archives the OpenSpec change and commits the archive result when files change
