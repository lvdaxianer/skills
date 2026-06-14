# development-workflow Specification

## Purpose
Define the mandatory development workflow for this repository, including when to use brainstorming, when to persist an OpenSpec change, how to execute TDD and review gates, when to commit, and when to archive completed work.
## Requirements
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
Before persisting a change, the workflow MUST verify that the project root
contains a non-hidden `openspec/` directory. If it does not, the workflow MUST
initialize the OpenSpec scaffold first and select Codex/Claude instruction
targets. Hidden `.openspec` paths MUST NOT be treated as the project OpenSpec
root.
Future persisted changes and approved specs MUST be based on the project
OpenSpec workflow. Changes MUST live under `openspec/changes/`, approved specs
MUST live under `openspec/specs/`, and non-OpenSpec documents MUST NOT replace
OpenSpec change/spec assets as the authoritative source.

#### Scenario: User approves persisted planning
- **WHEN** requirements are ready to be written to files
- **THEN** the workflow creates or updates `openspec/changes/<change-name>/`
- **AND** the change includes `proposal.md`, `design.md`, `tasks.md`, and one or more `specs/<capability>/spec.md` files
- **AND** the workflow validates the change with `openspec validate <change-name> --strict`

#### Scenario: Project has no OpenSpec root
- **WHEN** requirements are ready to be written to files
- **AND** the project root does not contain a non-hidden `openspec/` directory
- **THEN** the workflow initializes the OpenSpec scaffold before creating a change
- **AND** the scaffold initialization selects Codex and Claude instruction targets
- **AND** hidden paths such as `.openspec` are not accepted as the project OpenSpec root

#### Scenario: Future change or spec is persisted
- **WHEN** a future change or approved spec must be persisted
- **THEN** the change is created, updated, validated, and archived through the project OpenSpec workflow
- **AND** approved specs live under `openspec/specs/<capability>/spec.md`
- **AND** external notes or non-OpenSpec documents are not treated as authoritative substitutes

### Requirement: Development workflow MUST commit planning before implementation
The development workflow MUST commit the validated OpenSpec planning asset before
any production implementation starts.

#### Scenario: OpenSpec planning passes validation
- **WHEN** the OpenSpec change validates successfully
- **THEN** the workflow creates an independent planning commit
- **AND** implementation does not begin before that commit succeeds

### Requirement: Development workflow MUST process implementation tasks one at a time
The development workflow MUST select the next unchecked OpenSpec task and complete
the full gate sequence before moving to another task. Each task commit MUST be a
Chinese Conventional Commit created with full style and MUST include a non-empty
body and non-empty footer.

#### Scenario: Implementing an OpenSpec task
- **WHEN** an unchecked task is selected
- **THEN** `superpowers:test-driven-development` writes the smallest useful failing test first
- **AND** the workflow confirms RED, implements minimal GREEN, runs focused and broader verification, runs a Superpowers audit against the OpenSpec spec, runs canonical `code-review-spec`, fixes required issues, marks exactly that task complete, and creates one Chinese Conventional Commit with subject, body, and footer

#### Scenario: Creating a task commit
- **WHEN** the workflow reaches the commit gate for a completed task
- **THEN** it applies `commit --style=full`
- **AND** the commit message body explains what changed and why
- **AND** the commit message footer includes traceability metadata such as `Refs: <OpenSpec change/task>`

### Requirement: Development workflow MUST archive only after final audit
The development workflow MUST run a final Superpowers audit over the completed
change before archiving the OpenSpec change.

#### Scenario: All OpenSpec tasks are complete
- **WHEN** every task in the change has passed its gates and been committed
- **THEN** the workflow runs a final Superpowers audit over code, specs, and task status
- **AND** only after the audit passes, archives the OpenSpec change and commits the archive result when files change

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
