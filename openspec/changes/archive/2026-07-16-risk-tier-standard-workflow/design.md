## Context

The workflow already separates lightweight discussion from persisted changes.
Once a change is persisted, OpenSpec remains valuable as a trace, rollback, and
audit anchor. The pain point is not OpenSpec itself; it is that small standard
changes can inherit the same evidence thickness as broad changes.

## Decision

Add a risk-based standard-change tier section:

- `S` for localized low-risk behavior changes.
- `M` for normal feature, bugfix, configuration, and test changes.
- `L` for broad or risk-sensitive standard changes.

OpenSpec stays mandatory by default for all persisted changes. The tier controls
how compact the OpenSpec content, task boundary, verification, review evidence,
and subagent usage should be. The tier does not remove required gates, task
completion markers, commits, final audit, or archive.

## Risk And Mitigation

- Risk: agents may treat S-tier as permission to skip OpenSpec.
  Mitigation: explicitly state that OpenSpec is the default traceability anchor
  for every persisted change unless the user explicitly opts out.
- Risk: agents may over-document S-tier work.
  Mitigation: define compact evidence expectations for proposal, design, tasks,
  spec delta, verification, and review.
- Risk: file count may become the only classifier.
  Mitigation: classify primarily by behavior risk and use file or module count
  only as a secondary signal.

## Verification

- Add a contract test that checks the workflow names the S/M/L tiers, requires
  OpenSpec traceability by default, and says tiers scale evidence depth.
- Run the focused development-workflow test.
- Run OpenSpec strict validation for this change.
