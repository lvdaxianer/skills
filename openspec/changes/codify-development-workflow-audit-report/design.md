## Context

The repository already requires a final audit before archiving completed OpenSpec
changes. The missing piece is a durable report that tells the operator which tasks
finished and which did not.

## Goals / Non-Goals

**Goals:**
- Require a final audit report at the end of every completed workflow.
- Make the report explicitly list completed and incomplete tasks.
- Keep the report tied to the existing final audit and archive gate.

**Non-Goals:**
- Redesign the entire audit process.
- Add new runtime behavior outside the workflow instructions.
- Change the meaning of task completion gates.

## Decisions

- The audit report is a required end-of-work artifact, not an optional note.
- The report must summarize task status in two buckets: completed and incomplete.
- The report is emitted after the final audit gate and before the archive flow is
  considered finished.

## Risks / Trade-offs

- Requiring a report adds one more end-of-work step, but it improves traceability
  and makes partial completion obvious.
- The wording must stay broad enough to work for any future OpenSpec change while
  still being concrete enough for automated checks.
