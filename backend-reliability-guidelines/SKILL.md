---
name: backend-reliability-guidelines
description: "Use for backend implementation and backend review: APIs, services, controllers, jobs, queues, webhooks, migrations, configuration, validation, authorization, idempotency, transactions, concurrency, error handling, observability, security, performance, testing, and backend behavior that must stay correct under duplicate requests, retries, partial failure, wrong environment config, or production debugging pressure."
---

# Backend Reliability Guidelines

Use this skill to make backend behavior safe, recoverable, observable, and
consistent under production failure modes. This skill complements framework and
code-review skills: it focuses on reliability, data correctness, permission
boundaries, environment safety, and operational recovery.

## Skill Conflict Resolution (Meta-Rule)

This skill must not contradict `code-review-spec`, `frontend-interaction-guidelines`,
`logging-boundaries`, or `ddd`. If a literal conflict appears, defer to the
authoritative skill for that domain and do not restate its rules here.

| Domain | Authoritative skill |
|--------|---------------------|
| Backend reliability (idempotency, transactions, concurrency, migrations, env isolation, fail-fast, business audit) | **this skill** |
| Code-level red lines (comments, naming, method length, null safety, params, duplication, magic numbers) | `code-review-spec` |
| Frontend interaction (debounce, optimistic UI, state consistency, destructive action confirmation) | `frontend-interaction-guidelines` |
| Production logging discipline (levels, traceId, masking, MDC propagation, Actuator hot-toggle) | `logging-boundaries` |
| DDD strategic/tactical design (aggregates, domain events, repository boundaries, four-layer architecture) | `ddd` |

When this skill's rules touch another domain, cite the authoritative skill
rather than duplicating its detail.

## Required Reference

Read `backend-reliability-guidelines/references/backend-checklist.md` before substantive backend
implementation or review decisions.

If the reference cannot be read, stop and report that backend reliability
guidelines are unavailable.

## Mode Selection

### Implementation mode

Use implementation mode when building or changing backend behavior.

1. Identify the backend surface: API endpoint, service method, controller, job,
   queue consumer, webhook handler, migration, configuration, or integration.
2. Identify the business action and high-risk effects: create, update, delete,
   publish, pay, refund, import, export, allocate inventory, change quota,
   change permissions, send notifications, or synchronize external state.
3. Read the checklist reference and apply the relevant dimensions.
4. Define the backend contract before finalizing behavior: inputs, outputs,
   stable errors, authorization boundary, idempotency strategy, transaction
   boundary, concurrency protection, configuration environment, observability,
   and recovery path.
5. Preserve or create consistent backend patterns for shared errors, validation,
   authorization, configuration, retries, audit logging, and job recovery across
   services.
6. Verify with realistic duplicate-request, retry, unauthorized, invalid-input,
   concurrent-write, external-failure, migration, configuration, and recovery
   scenarios when applicable.

### Review mode

Use Review mode when auditing existing backend behavior.

1. Identify the backend surface, caller, data touched, and business consequence.
2. Read the checklist reference and inspect the relevant dimensions.
3. Prioritize findings by production impact, data integrity risk, security risk,
   and recovery difficulty.
4. Report findings with this severity grouping:
   - `必须修复`: Causes unauthorized access, data loss, duplicate payment or
     duplicate core data, production configuration risk, sensitive data leak,
     unrecoverable failure, or broken core flow.
   - `应该修复`: Clearly harms idempotency, transaction safety, concurrency
     safety, validation, stable errors, observability, retry behavior, migration
     safety, or test confidence.
   - `可优化`: Improves performance, maintainability, naming, diagnostics,
     developer experience, or operational polish.

## Non-Negotiable Backend Rules

- Every data-changing API, service, job, webhook, and batch action must define
  authentication and authorization boundaries.
- Server-side validation is required for all client-controlled input. Frontend
  validation is user experience, not a trust boundary.
- Backend configuration must be separated by environment, for example
  `application-dev.properties`, `application-test.properties`,
  `application-staging.properties`, and `application-prod.properties` where this
  pattern applies.
- Production configuration must fail fast when required production config or
  secrets are missing; it must not silently fall back to development defaults.
- Secrets must not be committed in environment config files. Use secret
  managers, environment variables, or deployment-provided secret injection.
- Local, development, and test configuration must never point to production
  databases, queues, buckets, payment, email, SMS, webhook, or paid external
  service endpoints.
- Data-changing operations that may be retried or repeated must have backend
  idempotency. Frontend debounce, disabled buttons, or optimistic UI state do
  not replace backend idempotency.
- Money, inventory, quota, permissions, publication, deletion, and batch import
  flows must define transaction boundaries, concurrency protection, and recovery
  behavior.
- Background jobs, queue consumers, and webhook handlers must tolerate duplicate
  delivery, retry safely, and leave a recoverable failure record.
- Errors must be stable for callers, useful for recovery, and safe from leaking
  stack traces, internal schema, secrets, or sensitive data.
- Logs and metrics must let operators trace a production issue without exposing
  passwords, tokens, keys, full identity numbers, or payment details.
- Database migrations must account for production data volume, compatibility
  with currently deployed code, rollback or repair paths, and online safety.
