## Context

This repository uses OpenSpec as the durable planning system. The workflow
already describes the `openspec/changes/<change-name>/` layout and approved
spec locations, but the language should make OpenSpec the source of truth for
all later change/spec work.

## Decisions

- A future persisted change must be represented as an OpenSpec change under
  `openspec/changes/<change-name>/`.
- A future approved specification must be represented under
  `openspec/specs/<capability>/spec.md`.
- Agents must use the OpenSpec workflow and strict validation for creation,
  updates, validation, and archival.
- External notes, design docs, chat summaries, or hidden metadata can provide
  context, but they cannot replace OpenSpec change/spec assets.
- Startup context files will mirror this source-of-truth rule so Codex and
  Claude behave consistently.

## Risks / Trade-offs

- The rule adds ceremony for tiny changes, but keeps planning, review, archive,
  and traceability in one durable system.
- Some exploratory notes may exist outside OpenSpec. They remain allowed as
  context, but the authoritative persisted change/spec must still be OpenSpec.
