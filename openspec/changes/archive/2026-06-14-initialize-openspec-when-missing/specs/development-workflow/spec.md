## MODIFIED Requirements

### Requirement: Development workflow MUST use one OpenSpec change per independent change
The development workflow MUST persist each independent change under
`openspec/changes/<change-name>/` using the local OpenSpec `spec-driven` layout.
Before persisting a change, the workflow MUST verify that the project root
contains a non-hidden `openspec/` directory. If it does not, the workflow MUST
initialize the OpenSpec scaffold first and select Codex/Claude instruction
targets. Hidden `.openspec` paths MUST NOT be treated as the project OpenSpec
root.

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
