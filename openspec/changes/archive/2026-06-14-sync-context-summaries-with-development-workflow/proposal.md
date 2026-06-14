## Why

The default context files already point at `development-workflow/SKILL.md`, but
they still read like a short summary rather than a fuller mirror of the workflow.
That makes it easy for the Codex and Claude startup context to drift from the
actual workflow stages, especially around the planning, commit, and gate rules.

## What Changes

- Expand `AGENTS.md` and `CLAUDE.md` so they mirror the workflow structure more
  closely.
- Include the stage boundaries, OpenSpec planning rules, commit requirements,
  gate rules, and required status format in both startup context files.
- Keep the two startup files semantically aligned.
- Add contract coverage so the mirror stays complete.

## Capabilities

### Modified Capabilities
- `default-context-workflow`: Startup context files become fuller mirrors of the
  approved development workflow.

## Impact

- Affected documentation: `AGENTS.md`, `CLAUDE.md`
- Affected tests: default-context workflow contract tests
- No runtime production code is affected.
