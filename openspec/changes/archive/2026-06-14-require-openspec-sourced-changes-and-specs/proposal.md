## Why

The workflow now requires a visible project-root `openspec/` directory before
persisted planning starts. It still needs to state that future change proposals
and approved specifications must come from that OpenSpec workflow, not from
ad hoc files or manually maintained parallel spec sources.

Without this rule, an agent could create a compliant-looking document outside
OpenSpec and later drift away from the validated change/spec lifecycle.

## What Changes

- Require future persisted changes to be created, updated, validated, and
  archived through the project OpenSpec workflow.
- Require future approved specs to live under `openspec/specs/<capability>/`
  and be updated by OpenSpec change application/archive flow.
- Forbid treating non-OpenSpec documents as authoritative substitutes for
  OpenSpec change/spec assets.
- Keep `AGENTS.md` and `CLAUDE.md` aligned with the stricter workflow rule.

## Capabilities

### Modified Capabilities
- `development-workflow`: Adds a source-of-truth rule for future change and
  spec assets.
- `default-context-workflow`: Mirrors the OpenSpec source-of-truth rule in
  startup context files.

## Impact

- Affected documentation: `development-workflow/SKILL.md`, `AGENTS.md`,
  `CLAUDE.md`
- Affected specs: `openspec/specs/development-workflow/spec.md`,
  `openspec/specs/default-context-workflow/spec.md`
- Affected tests: workflow/default context contract checks
- No runtime production code is affected.
