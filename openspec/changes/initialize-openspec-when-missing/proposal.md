## Why

The development workflow requires every persisted change to use
`openspec/changes/<change-name>/`, but it does not say what to do when a project
has no non-hidden `openspec/` directory yet.

That omission can lead agents to treat a hidden `.openspec/` directory as the
project OpenSpec root or to skip durable planning entirely. The workflow should
make the bootstrap step explicit before any change asset is created.

## What Changes

- Require agents to check for a non-hidden project-root `openspec/` directory
  before creating or updating an OpenSpec change.
- If `openspec/` is missing, require OpenSpec scaffold initialization first.
- Clarify that hidden directories such as `.openspec/` do not satisfy the
  project OpenSpec root requirement.
- Document that initialization should choose the Codex/Claude agent
  instruction targets.
- Keep `AGENTS.md` and `CLAUDE.md` aligned with the workflow rule.

## Capabilities

### Modified Capabilities
- `development-workflow`: Adds an explicit OpenSpec bootstrap rule before
  persisted planning.
- `default-context-workflow`: Mirrors the bootstrap requirement in startup
  context files.

## Impact

- Affected documentation: `development-workflow/SKILL.md`, `AGENTS.md`,
  `CLAUDE.md`
- Affected specs: `openspec/specs/development-workflow/spec.md`,
  `openspec/specs/default-context-workflow/spec.md`
- Affected tests: workflow/default context contract checks
- No runtime production code is affected.
