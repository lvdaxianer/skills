## Why

The current development workflow treats most standard changes with the same
execution weight. That preserves safety, but it makes small localized behavior
changes feel too slow because the evidence burden resembles a larger cross-module
feature.

The workflow needs risk-based execution tiers that keep OpenSpec traceability for
every persisted change while scaling the thickness of planning, verification,
review, and subagent orchestration evidence.

## What Changes

- Add S/M/L standard-change tiers based primarily on behavior risk.
- Require OpenSpec for every persisted change by default, with compact evidence
  for low-risk changes and fuller evidence for higher-risk changes.
- Clarify that tiers adjust execution strength, not gate order or traceability.
- Add contract coverage so future workflow edits keep OpenSpec mandatory while
  supporting risk-scaled evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `development-workflow`: classify standard changes by behavior risk and scale
  evidence depth without dropping OpenSpec traceability.

## Impact

- `development-workflow/SKILL.md`
- `tests/test_development_workflow_skill.py`
- OpenSpec documentation for the `development-workflow` capability
