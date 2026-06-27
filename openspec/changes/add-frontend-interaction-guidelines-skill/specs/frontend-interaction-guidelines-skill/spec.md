## ADDED Requirements

### Requirement: Frontend interaction guidelines skill MUST trigger for implementation and review
The skill MUST be discoverable for user requests involving frontend interaction
implementation or review, including pages, components, forms, modals, lists,
dashboards, editors, workflows, buttons, loading behavior, empty states, submit
actions, delete actions, debounce, throttle, keyboard behavior, motion,
responsive interaction, and accessibility-related interaction quality.

#### Scenario: User asks to implement a frontend interaction
- **WHEN** a user asks an agent to build or modify a frontend page, component,
  form, modal, list, dashboard, editor, or workflow with interaction behavior
- **THEN** the agent uses the `frontend-interaction-guidelines` skill
- **AND** the agent applies the implementation workflow before finalizing the UI
  behavior

#### Scenario: User asks to review frontend experience
- **WHEN** a user asks an agent to review frontend interaction experience,
  usability, button behavior, state feedback, form behavior, or equivalent UI
  interaction quality
- **THEN** the agent uses the `frontend-interaction-guidelines` skill
- **AND** the agent reports interaction findings by severity

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
