## Why

The repository has two default context files, `AGENTS.md` and `CLAUDE.md`, that
should stay in sync with the workflow instructions. They currently still reflect
an older summary of the development flow and do not include the newer OpenSpec
change structure, pointer-skill routing, or final audit report requirement.

## What Changes

- Sync `AGENTS.md` and `CLAUDE.md` with the current `development-workflow`
  process.
- Add the explicit OpenSpec change layout and validation requirements.
- Add the final audit report requirement so the default context and the skill
  file describe the same end-of-work behavior.

## Capabilities

### New Capabilities
- `default-context-workflow`: Keeps the repository startup context aligned with
  the development workflow skill.

### Modified Capabilities
- `AGENTS.md`: Updated to match the approved development workflow.
- `CLAUDE.md`: Updated to match the approved development workflow.

## Impact

- Affected documentation: `AGENTS.md`, `CLAUDE.md`
- Affected workflow assets: `openspec/changes/codify-default-context-workflow/`
