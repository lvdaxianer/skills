# Backend Reliability Checklist

Apply the relevant checks for the current backend surface. Do not treat this as
a code style checklist; focus on whether the backend remains correct under
duplicate requests, retries, concurrency, partial failure, wrong environment
config, unauthorized callers, and production incident debugging.

## Backend Reliability Dimensions

### API contract

- The request shape, response shape, pagination, sorting, filtering, and error
  format are stable for callers.
- HTTP status codes and business error codes have clear meanings.
- Backward compatibility is considered for existing frontend, mobile, internal,
  and third-party callers.
- Internal exceptions, stack traces, database column names, and implementation
  details are not exposed as public API behavior.

### Validation

- Every client-controlled input is validated on the server.
- Validation covers type, length, enum, format, money precision, time ranges,
  file size, file type, and batch size where relevant.
- Update operations use allowed-field lists so callers cannot modify protected
  fields by submitting extra properties.
- Validation errors preserve useful caller context and explain the rejected
  field without exposing sensitive internals.

### Authentication and authorization

- Each endpoint, service entrypoint, job trigger, webhook, and internal API has
  an explicit authentication expectation.
- Authorization checks resource ownership, tenant, organization, project, role,
  and operation permissions as needed.
- Read, update, delete, export, and batch operations verify access to every
  affected resource, not only to the route.
- Admin and internal paths have stronger controls than ordinary user paths and
  are not accidentally exposed.

### Configuration and environment separation

- Backend configuration is explicitly separated by environment, for example
  `application-dev.properties`, `application-test.properties`,
  `application-staging.properties`, and `application-prod.properties` where this
  pattern applies.
- Environment selection is explicit and visible at startup.
- Production configuration must not silently fall back to development defaults.
- Production startup must fail fast when required production configuration or
  secrets are missing.
- Secrets must not be committed in configuration files. Use secret managers,
  environment variables, encrypted deployment config, or runtime secret
  injection.
- Development or test configuration must never point to production databases,
  queues, object storage, payment, email, SMS, webhook, or third-party API
  endpoints.
- Configuration keys stay structurally consistent across environments unless a
  documented operational reason explains the difference.
- Dangerous integrations are isolated by environment: database, cache, message
  queue, object storage, payment, email, SMS, webhook, analytics, and external
  API endpoints.

### Idempotency

- Create, update, delete, publish, pay, refund, import, export, allocation, and
  batch operations define what happens when duplicate requests arrive.
- Data-changing operations that callers may retry use backend idempotency keys,
  unique constraints, business request IDs, deduplication records, or safe state
  transitions.
- Frontend debounce, disabled buttons, and loading states are not treated as a
  substitute for backend idempotency.
- Repeated requests, retries, webhook duplicate delivery, and duplicate message
  consumption cannot create duplicate core business effects.
- Idempotency records have appropriate retention, uniqueness scope, and response
  replay behavior.

### Transactions and consistency

- Multi-table or multi-step writes have clear transaction boundaries.
- Money, inventory, quota, permission, publication, deletion, and state-machine
  changes protect business invariants.
- External calls inside or around transactions are deliberate; the design avoids
  holding database locks while waiting on slow external systems unless justified.
- Cross-service or cross-resource work defines a compensation, reconciliation,
  eventual-consistency, or manual repair path.
- State transitions reject invalid jumps, such as cancelled work becoming
  successful without an explicit recovery design.

### Concurrency control

- Concurrent writes to the same resource use an explicit protection strategy:
  unique constraints, conditional updates, optimistic locks, pessimistic locks,
  version columns, compare-and-swap, or serialized workers.
- Read-then-update logic is safe from race conditions.
- Inventory, balance, quota, approval, publication, and allocation flows are
  checked under concurrent requests.
- Batch operations preserve per-item business rules and do not bypass
  single-item invariants.

### Error handling

- Error responses use a stable structure that callers can handle.
- Business errors, validation errors, authentication errors, authorization
  errors, conflicts, rate limits, upstream failures, and internal failures are
  distinguishable.
- Recoverable errors include the next useful caller action when appropriate.
- Exceptions are not swallowed silently, and unexpected failures preserve enough
  context for diagnostics.
- Upstream service errors distinguish timeout, rate limit, authentication
  failure, business rejection, malformed response, and unknown failure.

### Background jobs and queues

- Jobs and queue consumers are safe to retry.
- Message consumption is idempotent and records enough input context to diagnose
  failures.
- Failed jobs move to a dead-letter queue, failure table, retry dashboard, or
  other recoverable failure record.
- Long-running tasks persist status instead of relying only on process memory.
- Scheduled jobs avoid duplicate execution across multiple application
  instances.

### Webhooks and external services

- Webhooks verify signature, source, token, or another trustworthy authenticity
  signal.
- Webhook handlers tolerate duplicate delivery, retry, and out-of-order events.
- External service calls have timeouts, bounded retries, and error
  classification.
- Sandbox and production endpoints are separated by environment configuration.
- Local state is not marked finally successful before external success is known
  unless a compensation or reconciliation design exists.

### Database and migrations

- Migrations are tracked, repeatable, reviewable, and safe for the target data
  volume.
- Production migration plans consider table locks, long-running writes, index
  creation, data backfills, and compatibility with currently deployed code.
- Column additions, removals, renames, and type changes are deployable in safe
  steps when old and new code may run at the same time.
- Data repair scripts are auditable and include verification steps.
- Deletes consider soft delete, archive, audit, retention, and recovery needs.

### Observability

- Logs include request ID, trace ID, user ID, tenant ID, organization ID, and
  core business IDs when available.
- Critical business operations produce audit logs that identify actor, target,
  action, time, and result.
- Metrics cover success rate, failure rate, latency, queue depth, retry count,
  external-service failure rate, and migration or job progress where relevant.
- Alerts exist for core failures that require operator action.
- Logs, metrics, and traces let an operator reconstruct a production incident
  without exposing secrets or sensitive personal data.

### Security and privacy

- The backend is protected against SQL injection, command injection, path
  traversal, SSRF, mass assignment, broken access control, and unsafe file
  upload paths.
- Sensitive data is encrypted, hashed, tokenized, or masked according to its
  risk and retention needs.
- Passwords, tokens, API keys, private keys, full identity numbers, full payment
  details, and session secrets are not written to logs or error responses.
- Cookies, sessions, tokens, and internal admin endpoints use appropriate
  security settings.
- Exports and debug endpoints do not bypass privacy boundaries.

### Performance and scalability

- List endpoints are paginated and bounded.
- Query plans avoid obvious N+1 queries and missing indexes on high-volume
  access paths.
- Bulk imports, exports, reports, and external synchronization are chunked,
  streamed, queued, or otherwise bounded.
- Database calls, cache calls, queue operations, and external calls use
  appropriate timeouts.
- Cache usage defines invalidation, freshness, and failure behavior.

### Testing requirements

- Tests cover success, validation failure, authentication failure,
  authorization failure, duplicate requests, concurrent writes, external
  failure, and recovery path for high-risk behavior.
- Idempotency, transaction boundaries, state transitions, permission checks,
  and migration safety receive focused tests when touched.
- Background jobs and webhooks test retries, duplicate delivery, failed message
  handling, and recoverability.
- Configuration changes verify active environment behavior and prevent
  production from using development or test defaults.
- Tests do not depend on production-like mutable shared infrastructure.

## Review Severity

- `必须修复`: Unauthorized access, data loss, duplicate payment, duplicate core
  data, production configuration risk, sensitive data leak, unrecoverable
  failure, or broken core backend flow.
- `应该修复`: Weak idempotency, unclear transaction boundaries, concurrency
  risk, unstable error contract, missing validation, insufficient observability,
  unsafe migration path, retry ambiguity, or missing tests for high-risk
  behavior.
- `可优化`: Performance tuning, clearer naming, smaller service boundaries,
  better diagnostics, more useful metrics, simpler recovery tooling, or improved
  developer experience.
