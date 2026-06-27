## Context

The user wants a backend counterpart to `frontend-interaction-guidelines`.
The skill must guide both implementation and review work, with emphasis on
preventing production incidents rather than enforcing narrow style rules.
The user specifically required environment-specific configuration files such
as `application-dev.properties` and `application-prod.properties`.

## Decisions

- Create a skill named `backend-reliability-guidelines` because the intended
  scope is backend correctness and incident prevention under real production
  pressure.
- Use `SKILL.md` for trigger metadata, required reference loading, mode
  selection, workflow, review severity categories, and non-negotiable rules.
  This keeps the essential procedure visible as soon as the skill is loaded.
- Store the full checklist in
  `backend-reliability-guidelines/references/backend-checklist.md` so the skill
  remains concise while still providing complete review coverage.
- Cover both implementation and review modes:
  - Implementation mode identifies the backend surface, business action,
    failure modes, contracts, consistency rules, environment configuration, and
    verification expectations before changing backend code.
  - Review mode reports findings grouped by `必须修复`, `应该修复`, and `可优化`.
- Treat environment-specific configuration as a non-negotiable backend
  reliability category. Development, test, staging, and production behavior must
  be separated explicitly, production must not fall back to development
  defaults, and secrets must not be committed.
- Treat idempotency, authorization, transactions, concurrency, jobs, webhooks,
  migrations, observability, and security as first-class checklist categories.

## Checklist Scope

The reference checklist must cover at least these dimensions:

- API contract.
- Validation.
- Authentication and authorization.
- Configuration and environment separation.
- Idempotency.
- Transactions and consistency.
- Concurrency control.
- Error handling.
- Background jobs and queues.
- Webhooks and external services.
- Database and migrations.
- Observability.
- Security and privacy.
- Performance and scalability.
- Testing requirements.
- Review severity categories.

## Risks / Trade-offs

- If the checklist becomes a generic backend best-practices document, agents may
  apply it superficially. The workflow must force agents to identify the current
  backend surface, business action, and high-risk failure modes first.
- This skill may overlap with `code-review-spec`, security review guidance, or
  framework-specific backend skills. The boundary is backend reliability
  behavior: it does not replace language/framework rules, but it makes
  production failure modes explicit before implementation or review is accepted.
