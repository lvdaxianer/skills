## Context

This repository stores skills used by coding agents. The development workflow
skill is a high-leverage instruction file: unclear stage boundaries can cause
agents to write files in the wrong spec format, skip TDD gates, or mark tasks
complete before review and commit.

OpenSpec is available through the local `openspec` CLI. The default schema is
`spec-driven`, with artifacts ordered as `proposal -> specs -> design -> tasks`.

## Goals / Non-Goals

**Goals:**
- Make the workflow deterministic enough to resume after interruption.
- Keep requirement discussion separate from durable change assets.
- Use the OpenSpec change layout accepted by `openspec validate --strict`.
- Preserve planning commits and per-task implementation commits.
- Route code review and commit behavior through the user-approved pointer skills
  while retaining their canonical sources.

**Non-Goals:**
- Redesign OpenSpec itself.
- Change canonical `code-review-spec` or commit standards.
- Add runtime code.

## Decisions

- Requirement exploration remains conversational and uses
  `superpowers:brainstorming`.
- Once the user chooses to persist requirements, create or update exactly one
  OpenSpec change for the independent change.
- A valid OpenSpec change includes `.openspec.yaml`, `proposal.md`, `design.md`,
  `tasks.md`, and one or more `specs/<capability>/spec.md` delta files.
- The OpenSpec planning gate requires `openspec validate <change-name> --strict`.
- Implementation starts only after the OpenSpec planning asset is committed.
- Each task is completed only after TDD, broader verification, Superpowers audit,
  canonical code review, task checkbox update, and a Chinese Conventional Commit.
- Final completion requires a full Superpowers audit and OpenSpec archival.

## Risks / Trade-offs

- The workflow is intentionally strict and may feel heavy for tiny edits, but the
  repository explicitly prefers durable planning and gated execution.
- Keeping pointer skills for `code-review-spec` and `commit` means the workflow
  must name both pointer paths and canonical sources to avoid accidental drift.
