# Module API Documentation Gate

## Purpose

Require complete REST API documentation, grouped by business module, whenever
an externally exposed Controller or API route changes.

## Requirements

### Requirement: Trigger the REST API documentation authority
The development workflow MUST require `rest-api-documentation` whenever a task
creates or modifies an externally exposed Controller or API route. The workflow
MUST require the task record to identify the affected public Controllers/routes
and the business module assigned to each one.

#### Scenario: Public route is added or changed
- **WHEN** a task adds or changes an externally exposed Controller or API route
- **THEN** the task MUST load `rest-api-documentation` and record the affected
  route-to-module mapping before the API documentation gate can pass

#### Scenario: No public route is affected
- **WHEN** a task does not add or change an externally exposed Controller or API route
- **THEN** the task MUST explicitly record that the REST API documentation gate
  is not applicable and continue with the remaining workflow gates

### Requirement: Maintain module-scoped API documents
For every affected business module, the implementation project MUST create or
update exactly one module document at `apis/<module>.md` beneath its repository
root. The module document MUST contain endpoint sections for all affected public
Controllers/routes in that module and MUST follow the complete contract required
by `rest-api-documentation`.

#### Scenario: Several order routes change together
- **WHEN** multiple public Controllers/routes in the order business module are
  added or modified
- **THEN** their endpoint sections MUST be maintained in one document such as
  `apis/orders.md`, rather than separate documents per endpoint or Controller

#### Scenario: A module document already exists
- **WHEN** an affected business module already has `apis/<module>.md`
- **THEN** the task MUST update that existing document without moving unrelated
  module endpoints into a new per-endpoint document

### Requirement: Enforce Controller documentation coverage
The REST API documentation gate MUST fail when an affected public Controller or
route is absent from its assigned module document, when a required module
document is missing, or when a documented endpoint omits a required REST API
contract section. The task boundary, broader verification, final audit, and code
review evidence MUST record the coverage result.

#### Scenario: Documentation coverage is complete
- **WHEN** each affected public Controller/route is represented in its assigned
  `apis/<module>.md` and each endpoint section is complete
- **THEN** the REST API documentation gate MUST pass and its evidence MUST be
  included in verification and review records

#### Scenario: A public Controller lacks documentation
- **WHEN** an affected public Controller/route has no endpoint section in its
  assigned module document
- **THEN** the REST API documentation gate MUST fail until the module document
  is corrected and the same gate is re-run
