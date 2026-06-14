## Context

The workflow already mandates OpenSpec planning, but new or imported projects
may not have an `openspec/` directory. OpenSpec also uses hidden metadata files
and directories in some contexts, so the workflow needs to distinguish the
project's durable spec root from hidden implementation details.

## Decisions

- Before persisting requirements, agents must check for `openspec/` at the
  current project root.
- A hidden `.openspec/` directory or file is not a substitute for the project
  OpenSpec root.
- If `openspec/` is absent, agents must initialize OpenSpec with the scaffold
  before creating `openspec/changes/<change-name>/`.
- During scaffold initialization, agents select Codex and Claude instruction
  targets so both startup contexts are generated or updated for the project.
- Once initialization succeeds, the existing `spec-driven` layout and strict
  validation rules continue to apply.

## Risks / Trade-offs

- OpenSpec initialization may modify project instruction files before a change
  proposal exists. This is intentional: without the project `openspec/` root,
  there is nowhere durable to place the change asset.
- Some projects may already have hidden OpenSpec metadata. Requiring the
  visible `openspec/` root avoids ambiguity and keeps planning assets easy to
  inspect in normal repository navigation.
