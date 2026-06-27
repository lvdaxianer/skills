# frontend-interaction-guidelines-skill Specification

## Purpose
TBD - created by archiving change add-frontend-interaction-guidelines-skill. Update Purpose after archive.
## Requirements
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

### Requirement: Frontend interaction guidelines skill MUST load a complete interaction checklist
The skill MUST instruct agents to read
`frontend-interaction-guidelines/references/interaction-checklist.md` before
substantive frontend interaction implementation or review decisions. The
checklist MUST explicitly enumerate frontend interaction experience dimensions.

#### Scenario: Agent prepares to implement or review interactions
- **WHEN** the agent has identified a frontend interaction surface
- **THEN** it reads the interaction checklist reference
- **AND** it uses the checklist to guide implementation or review decisions

### Requirement: Interaction checklist MUST cover core frontend experience dimensions
The checklist MUST cover task paths, state feedback, forms and inputs, errors
and recovery, loading and waiting, empty and boundary states, navigation and
orientation, operability and hit targets, keyboard behavior, motion,
responsive adaptation, information hierarchy, consistency, accessibility, data
changes, permissions and safety, operation reliability, and cross-page state
consistency.

#### Scenario: Agent applies the checklist
- **WHEN** the agent reviews the checklist for a frontend interaction task
- **THEN** it can identify relevant checks for every required interaction
  dimension
- **AND** it does not collapse repeated-trigger protection or cross-page state
  consistency into vague generic feedback

### Requirement: Skill MUST prioritize operation reliability and repeated trigger protection
The skill MUST require focused handling for submit, save, delete, publish, pay,
upload, batch, search, filter, autosave, and infinite-scroll actions. The
requirements MUST distinguish debounce or throttle from destructive-action
safety and MUST state that frontend debounce does not replace backend idempotency
when duplicate requests can affect data.

#### Scenario: Agent handles a submit or destructive action
- **WHEN** an interaction includes submitting, saving, deleting, publishing,
  paying, uploading, or batch processing
- **THEN** the agent checks loading and disabled states, repeated click
  protection, slow-network behavior, failure handling, and recovery
- **AND** destructive or irreversible actions use confirmation, undo, or clear
  consequence communication instead of relying only on debounce
- **AND** the agent considers backend idempotency when duplicate requests can
  affect data integrity

### Requirement: Skill MUST enforce cross-page state and action consistency
The skill MUST require agents to check that the same product uses consistent
interaction patterns for loading, empty, error, success, disabled, confirmation,
destructive action, offline, permission-denied, and long-running task states
across pages or views unless a product-specific reason justifies a difference.

#### Scenario: Agent reviews multiple pages or shared UI states
- **WHEN** an interaction task touches or compares multiple pages, views, or
  shared components
- **THEN** the agent checks whether common states and actions use the same
  behavior, language, placement, timing, and recovery patterns
- **AND** the agent flags inconsistent loading or empty states as interaction
  issues when they would confuse users or increase implementation drift

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

