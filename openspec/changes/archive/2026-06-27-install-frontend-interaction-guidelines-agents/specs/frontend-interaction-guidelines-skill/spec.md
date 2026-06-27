## MODIFIED Requirements

### Requirement: Frontend interaction guidelines skill MUST trigger for implementation and review
The skill MUST be discoverable for user requests involving frontend interaction
implementation or review, including pages, components, forms, modals, lists,
dashboards, editors, workflows, buttons, loading behavior, empty states, submit
actions, delete actions, debounce, throttle, keyboard behavior, motion,
responsive interaction, and accessibility-related interaction quality. The
repository documentation MUST list the skill as an available skill and include
installation commands for both global and per-project installation paths.

#### Scenario: User asks to install available skills
- **WHEN** a user follows the repository README installation instructions
- **THEN** the instructions include `frontend-interaction-guidelines`
- **AND** the English and Chinese README files describe when the skill triggers

## ADDED Requirements

### Requirement: Frontend interaction guidelines skill MUST be available from the agents skill root
The skill MUST be installed at
`/Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines` with the same
core assets as the repository skill: `SKILL.md`, `agents/openai.yaml`, and
`references/interaction-checklist.md`.

#### Scenario: Agents skill root is scanned
- **WHEN** an agent scans `/Users/lvdaxianer/.agents/skills`
- **THEN** it can discover `frontend-interaction-guidelines/SKILL.md`
- **AND** the installed skill includes the interaction checklist reference and
  OpenAI agent metadata
