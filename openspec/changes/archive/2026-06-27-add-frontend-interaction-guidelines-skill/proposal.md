## Why

Agents currently rely on broad frontend design guidance, product guidance, or
generic review rules when implementing and reviewing frontend interaction
behavior. That leaves important experience details easy to miss: repeated
submission protection, destructive-action safety, consistent loading and empty
states across pages, keyboard behavior, error recovery, and device-specific
interaction quality.

## What Changes

- Add a new `frontend-interaction-guidelines` skill for frontend interaction
  implementation and review work.
- Keep `SKILL.md` focused on trigger rules, mode selection, workflow, and output
  expectations.
- Add a detailed interaction checklist reference covering frontend interaction
  experience dimensions, including operation reliability and cross-page state
  consistency.
- Add focused text contract coverage so future edits preserve the trigger
  contract, checklist coverage, operation reliability rules, and consistency
  requirements.

## Capabilities

### Added Capabilities

- `frontend-interaction-guidelines-skill`: Frontend interaction implementation
  and review tasks must use a dedicated interaction experience workflow and
  checklist.

## Impact

- Affected documentation: new skill directory, skill metadata, and checklist
  reference.
- Affected tests: new text contract test for the skill.
- Runtime behavior changes only when an agent selects this skill for frontend
  interaction implementation or review work.
