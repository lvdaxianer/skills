# development-ready-demo Specification

## Purpose
让文字需求或设计图能够被转化为视觉接近、交互完整、结构可维护且能够继续复用的前后端 Demo，避免产出只适合一次性展示的临时代码。

## Requirements

### Requirement: Accept independent design inputs

The Skill MUST accept a text requirement or a design image as an independent input, and MUST treat both as valid starting points without requiring the other input.

#### Scenario: Text-only input
- **WHEN** the user provides a text requirement without a design image
- **THEN** the Skill MUST derive the relevant pages, user flows, data boundaries, interaction states, and acceptance criteria from the text

#### Scenario: Image-only input
- **WHEN** the user provides a design image without a text requirement
- **THEN** the Skill MUST derive visible structure and likely interactions, and MUST record assumptions for behavior that cannot be confirmed from the image

### Requirement: Require brainstorming before implementation

The Skill MUST use `superpowers:brainstorming` during requirement discussion and MUST obtain confirmation of the clarified design before creating or modifying implementation files.

#### Scenario: Unclear requirement
- **WHEN** a material page, workflow, data, permission, or interaction decision is ambiguous
- **THEN** the Skill MUST clarify the decision during brainstorming before implementation begins

#### Scenario: Design not approved
- **WHEN** the user has not approved the clarified design
- **THEN** the Skill MUST remain in discussion and MUST NOT generate implementation code

### Requirement: Generate the fixed reusable architecture

The Skill MUST use the built-in Vue frontend and Java Spring backend architecture, and MUST keep business boundaries independent from ORM-specific persistence details.

#### Scenario: New demo generation
- **WHEN** the user requests a new Demo
- **THEN** the output MUST contain a frontend and backend project with the prescribed technology stack and explicit module boundaries

#### Scenario: Persistence replacement boundary
- **WHEN** a business use case reads or changes data
- **THEN** the business-facing repository boundary MUST remain replaceable without exposing MyBatis-Plus types to the domain layer

### Requirement: Apply domain quality skills

The Skill MUST apply the frontend interaction, backend reliability, logging boundary, and code review rules to the corresponding implementation surfaces.

#### Scenario: Frontend interaction implementation
- **WHEN** the Demo contains forms, lists, destructive actions, asynchronous requests, or cross-page state
- **THEN** the output MUST include the required loading, empty, error, disabled, confirmation, recovery, pagination, and stale-response behavior

#### Scenario: Backend implementation
- **WHEN** the Demo contains APIs, services, persistence, configuration, or data-changing operations
- **THEN** the output MUST define server-side validation, stable errors, authorization boundaries, transaction and idempotency behavior where relevant, environment separation, and safe observability

### Requirement: Use test-driven implementation

The Skill MUST require TDD for behavior changes: a focused test MUST fail for the intended missing behavior before the implementation is written, then pass after the smallest suitable implementation and refactoring.

#### Scenario: Backend behavior change
- **WHEN** a backend use case or API behavior is added or changed
- **THEN** the output MUST include tests for the main success path and relevant validation, authorization, duplicate-request, failure, or recovery paths

#### Scenario: Frontend behavior change
- **WHEN** a frontend interaction or state transition is added or changed
- **THEN** the output MUST include tests for the user-visible behavior and relevant loading, failure, retry, repeated-trigger, or stale-response paths

### Requirement: Deliver verification evidence and reuse guidance

The Skill MUST deliver a runnable Demo together with startup instructions, test commands, API documentation when public routes exist, seed or example data, explicit assumptions, and a summary of reusable boundaries.

#### Scenario: Verification succeeds
- **WHEN** focused tests, broader checks, and the final review pass
- **THEN** the delivery MUST report the commands run and their fresh results before claiming completion

#### Scenario: Verification fails
- **WHEN** a required test, build, review, or documentation check fails
- **THEN** the Skill MUST report the failure and MUST NOT claim the Demo is complete
