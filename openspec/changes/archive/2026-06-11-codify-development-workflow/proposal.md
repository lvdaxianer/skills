## Why

The current development workflow skill mentions OpenSpec, brainstorming, TDD,
audit, code review, and commits, but it does not clearly define the stage
boundaries or the OpenSpec directory shape. This makes generated workflow output
easy to confuse with other spec systems and weakens the handoff between planning,
implementation, review, and archival.

## What Changes

- Clarify that requirement discussion uses `superpowers:brainstorming`.
- Clarify that durable requirement assets use one OpenSpec change per independent
  change.
- Define the required OpenSpec change file layout and strict validation command.
- Preserve a planning commit before production implementation starts.
- Define the per-task loop: TDD RED/GREEN, broader verification, Superpowers
  audit, canonical `code-review-spec`, task mark-complete, and canonical commit.
- Define final audit and OpenSpec archive after all tasks finish.

## Capabilities

### New Capabilities
- `development-workflow`: Governs the repository development lifecycle from
  requirement discussion through OpenSpec planning, TDD implementation, review,
  commit, and archive.

### Modified Capabilities
- `development-workflow`: Clarifies existing workflow requirements and makes
  OpenSpec structure explicit.

## Impact

- Affected documentation: `development-workflow/SKILL.md`
- Affected workflow assets: `openspec/changes/codify-development-workflow/`
- No runtime production code is affected.
