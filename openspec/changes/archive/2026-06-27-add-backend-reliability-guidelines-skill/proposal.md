## Why

Agents currently rely on broad backend, security, or review guidance when
implementing and reviewing backend behavior. That makes important production
failure modes easy to miss: duplicate requests, unsafe retries, concurrent
writes, unclear transaction boundaries, environment configuration mixups,
partial external-service failures, weak permission checks, and poor incident
diagnostics.

## What Changes

- Add a new `backend-reliability-guidelines` skill for backend implementation
  and review work.
- Keep `SKILL.md` focused on trigger rules, required reference loading, mode
  selection, workflow, and non-negotiable backend reliability rules.
- Add a detailed backend checklist reference covering API contracts,
  validation, authorization, environment-specific configuration, idempotency,
  transactions, concurrency, error handling, jobs, webhooks, migrations,
  observability, security, performance, and tests.
- Add focused text contract coverage so future edits preserve the trigger
  contract, checklist coverage, configuration separation rules, and reliability
  requirements.

## Capabilities

### Added Capabilities

- `backend-reliability-guidelines-skill`: Backend implementation and review
  tasks must use a dedicated reliability workflow and checklist.

## Impact

- Affected documentation: new skill directory, skill metadata, and checklist
  reference.
- Affected tests: new text contract test for the skill.
- Runtime behavior changes only when an agent selects this skill for backend
  implementation or review work.
