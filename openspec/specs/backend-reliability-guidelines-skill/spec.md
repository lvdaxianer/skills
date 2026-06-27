# backend-reliability-guidelines-skill Specification

## Purpose
TBD - created by archiving change add-backend-reliability-guidelines-skill. Update Purpose after archive.
## Requirements
### Requirement: Backend reliability guidelines skill MUST trigger for implementation and review
The skill MUST be discoverable for user requests involving backend
implementation or review, including APIs, services, controllers, jobs, queues,
webhooks, database writes, migrations, configuration, validation,
authorization, idempotency, transactions, concurrency, error handling,
observability, security, performance, and testing.

#### Scenario: Agent handles backend implementation or review
- **WHEN** a user asks to implement or review backend behavior
- **THEN** the agent can discover `backend-reliability-guidelines/SKILL.md`
- **AND** the skill describes both implementation mode and review mode

### Requirement: Backend reliability guidelines skill MUST load a complete backend checklist
The skill MUST instruct agents to read
`backend-reliability-guidelines/references/backend-checklist.md` before
substantive backend implementation or review decisions. The checklist MUST
explicitly enumerate backend reliability dimensions.

#### Scenario: Agent prepares to implement or review backend behavior
- **WHEN** the agent has identified a backend surface
- **THEN** it reads the backend checklist reference
- **AND** it uses the checklist to guide implementation or review decisions

### Requirement: Checklist MUST cover backend reliability dimensions
The checklist MUST cover API contracts, validation, authentication and
authorization, configuration and environment separation, idempotency,
transactions and consistency, concurrency, error handling, background jobs and
queues, webhooks and external services, database migrations, observability,
security and privacy, performance and scalability, and testing requirements.

#### Scenario: Agent applies the checklist
- **WHEN** the agent reviews the checklist for a backend task
- **THEN** it can identify relevant checks for every required reliability
  dimension
- **AND** it does not collapse idempotency, authorization, configuration
  separation, or transaction boundaries into vague generic review feedback

### Requirement: Skill MUST enforce configuration and environment separation
The skill MUST require explicit environment-specific configuration such as
`application-dev.properties`, `application-test.properties`,
`application-staging.properties`, and `application-prod.properties` where this
pattern applies. Production configuration MUST NOT silently fall back to
development defaults, and secrets MUST NOT be committed in environment config
files.

#### Scenario: Agent handles backend configuration
- **WHEN** a backend task touches application configuration or environment
  behavior
- **THEN** the agent checks that configuration is separated by environment
- **AND** production fails fast when required production configuration or
  secrets are missing
- **AND** development or test configuration does not point to production
  databases, queues, object storage, payment, email, SMS, webhook, or external
  API endpoints

### Requirement: Skill MUST prioritize idempotency, consistency, and recovery
The skill MUST require focused handling for duplicate requests, retries,
concurrent writes, transactions, external-service partial failure, background
job retries, webhook duplicate delivery, and data recovery paths. The
requirements MUST state that frontend debounce or disabled buttons do not
replace backend idempotency when duplicate requests can change data.

#### Scenario: Agent handles a high-risk backend action
- **WHEN** backend behavior creates, updates, deletes, publishes, imports,
  exports, pays, allocates inventory, changes quota, or processes a webhook or
  job
- **THEN** the agent checks idempotency, authorization, transaction boundaries,
  concurrency protection, retry behavior, and recovery path
- **AND** repeated requests or repeated message delivery cannot create duplicate
  core business effects

