# Spec Delta

## MODIFIED Requirements

### Requirement: Generate the fixed reusable architecture

The Skill MUST use the built-in Vue frontend and Java Spring backend architecture, MUST define stable frontend directory responsibilities and dependency directions, and MUST keep business boundaries independent from ORM-specific persistence details.

#### Scenario: New product implementation generation
- **WHEN** the user requests a new product implementation
- **THEN** the output MUST contain a frontend and backend project with the prescribed technology stack, the frontend directories `app`, `layouts`, `router`, `views`, `components`, `stores`, `composables`, `api`, `types`, `utils`, `styles`, `assets`, and `test`, and explicit module boundaries

#### Scenario: Existing frontend project is extended
- **WHEN** the user requests a new capability in an existing frontend project
- **THEN** the Skill MUST reuse equivalent existing directories and boundaries, and MUST only add missing structure incrementally instead of performing unrelated large-scale migration

#### Scenario: Frontend data access boundary
- **WHEN** a frontend page or component reads or changes business data
- **THEN** the page or component MUST call an API Client boundary, shared state MUST use the corresponding Pinia Store when needed, and the page or component MUST NOT assemble backend request details directly

#### Scenario: Persistence replacement boundary
- **WHEN** a business use case reads or changes data
- **THEN** the business-facing repository boundary MUST remain replaceable without exposing MyBatis-Plus types to the domain layer
