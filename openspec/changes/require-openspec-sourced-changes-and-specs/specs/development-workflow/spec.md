## MODIFIED Requirements

### Requirement: Development workflow MUST use one OpenSpec change per independent change
The development workflow MUST persist each independent change under
`openspec/changes/<change-name>/` using the local OpenSpec `spec-driven` layout.
Before persisting a change, the workflow MUST verify that the project root
contains a non-hidden `openspec/` directory. If it does not, the workflow MUST
initialize the OpenSpec scaffold first and select Codex/Claude instruction
targets. Hidden `.openspec` paths MUST NOT be treated as the project OpenSpec
root. Future persisted changes and approved specs MUST be based on the project
OpenSpec workflow: changes are represented under `openspec/changes/`, approved
specs are represented under `openspec/specs/`, and non-OpenSpec documents MUST
NOT replace OpenSpec change/spec assets as the authoritative source.

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
