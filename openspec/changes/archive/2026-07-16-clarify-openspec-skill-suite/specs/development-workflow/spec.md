## ADDED Requirements

### Requirement: Development workflow MUST use action-specific OpenSpec skills
The development workflow MUST identify the installed action-specific OpenSpec
skills used at each stage and MUST NOT require a nonexistent umbrella
`openspec` skill. The strict OpenSpec validation command MUST remain an explicit
CLI gate independent of skill selection.

#### Scenario: Workflow creates planning artifacts
- **WHEN** an agent starts or completes OpenSpec planning
- **THEN** it uses `openspec-new-change` with `openspec-continue-change`, or uses `openspec-ff-change`
- **AND** it validates the completed change with `openspec validate <change-name> --strict`

#### Scenario: Workflow executes and closes a change
- **WHEN** an agent implements, verifies, synchronizes, or archives an OpenSpec change
- **THEN** it uses the corresponding `openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs`, or `openspec-archive-change` skill
- **AND** it does not search for or require `openspec/SKILL.md`
