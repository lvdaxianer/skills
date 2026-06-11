## Context

The repository uses `AGENTS.md` and `CLAUDE.md` as startup context files. They
already point to `development-workflow/SKILL.md`, so they should not drift away
from the skill file as the workflow evolves.

## Goals / Non-Goals

**Goals:**
- Keep both startup context files synchronized with the approved workflow.
- Reflect the current OpenSpec layout, planning commit, TDD, review, archive,
  and final audit report requirements.
- Preserve the same status-reporting and validation expectations in both files.

**Non-Goals:**
- Redesign the startup context format.
- Add new runtime behavior.
- Change the meaning of the workflow gates themselves.

## Decisions

- Treat `AGENTS.md` and `CLAUDE.md` as parallel startup context files that should
  remain semantically identical aside from their opening label.
- Reuse the same workflow language already approved in `development-workflow`.
- Keep the update focused on instructions, not on implementation code.

## Risks / Trade-offs

- Maintaining two mirrored files doubles the chance of future drift, so the
  wording must stay aligned and easy to diff.
- The files need to remain concise, but they must still mention the important
  gates clearly enough for agents to follow them without inference.
