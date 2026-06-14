## MODIFIED Requirements

### Requirement: Default context files MUST mirror the approved development workflow
`AGENTS.md` and `CLAUDE.md` MUST describe the same workflow rules as
`development-workflow/SKILL.md`, including brainstorming, Stage Boundaries,
OpenSpec bootstrap and planning requirements, commit requirements, gate rules,
and final audit reporting.

#### Scenario: Startup context is read
- **WHEN** an agent opens `AGENTS.md` or `CLAUDE.md`
- **THEN** the file requires `development-workflow/SKILL.md`
- **AND** the file includes the current brainstorming, stage boundaries,
  OpenSpec bootstrap and planning, commit body/footer, gate, and final audit
  report rules
