## Context

The current workflow closes a change with final audit, OpenSpec archive, and a
final audit report that lists completed and unfinished tasks. The new request
adds an evaluative summary so each completed change also records concrete
quality lessons.

## Decisions

- Add the requirement to the final audit report stage because it is already the
  place where the workflow summarizes completed and unfinished work.
- Require five explicit summary topics:
  - which changes in this modification were good,
  - why those changes were good,
  - which original code or workflow aspects were bad,
  - why those aspects were bad,
  - how to correct or improve them.
- Keep the summary mandatory only after all planned tasks finish, so normal
  per-task commits and gates do not gain extra ceremony.
- Update tests to look for durable marker text in `development-workflow/SKILL.md`.

## Risks / Trade-offs

- The summary adds a little more closing work, but it preserves useful context
  that would otherwise be lost after the task is complete.
- The workflow should not require praise for its own sake. The wording should
  ask for concrete observations and corrections grounded in the actual change.
