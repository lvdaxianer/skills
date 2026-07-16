## Why

The development workflow names a required `openspec` skill even though the
installed OpenSpec integration is a suite of action-specific `openspec-*`
skills. This ambiguity can make agents incorrectly report a missing dependency
or search for a nonexistent `openspec/SKILL.md`.

## What Changes

- Replace the generic `openspec` skill dependency with the concrete OpenSpec
  skill suite used at each workflow stage.
- Keep `openspec validate <change-name> --strict` as an explicit CLI validation
  gate rather than presenting it as a standalone skill.
- Add a contract test that prevents the workflow from reverting to an
  ambiguous single-skill reference.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `development-workflow`: Require action-specific OpenSpec skills for planning,
  implementation, verification, synchronization, and archival.

## Impact

- `development-workflow/SKILL.md`
- `tests/test_development_workflow_openspec_skills.py`
- OpenSpec documentation for the `development-workflow` capability
