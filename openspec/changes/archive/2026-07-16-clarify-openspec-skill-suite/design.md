## Context

OpenSpec installs action-specific skills whose names start with `openspec-`.
There is no umbrella `openspec/SKILL.md`; the directory named `openspec/` stores
change and specification assets. The workflow currently conflates these two
concepts by naming a required `openspec` skill.

## Goals / Non-Goals

**Goals:**

- Map each workflow stage to the concrete OpenSpec skill that governs it.
- Preserve strict CLI validation as an explicit gate.
- Make the distinction enforceable through a focused contract test.

**Non-Goals:**

- Create an umbrella OpenSpec skill.
- Rewrite the generated OpenSpec action skills.
- Change the OpenSpec artifact layout or validation command.

## Decisions

- Treat `openspec-new-change` plus `openspec-continue-change`, or
  `openspec-ff-change`, as the planning entry points. This matches the installed
  artifact workflow without forcing a single planning style.
- Use `openspec-apply-change`, `openspec-verify-change`, and
  `openspec-archive-change` for implementation, final verification, and
  archival respectively. Use `openspec-sync-specs` when approved delta specs
  need synchronization.
- Keep `openspec validate <change-name> --strict` in the workflow itself because
  none of the action-specific skill names represents that CLI gate.
- Add one contract test that asserts the concrete names and rejects the old
  generic required-source wording. A textual contract is appropriate because
  this repository already tests workflow policy through marker-based tests.

Alternatives considered:

- Add `openspec/SKILL.md`: rejected because it would duplicate the generated
  action-specific skills and blur the asset-directory boundary.
- Keep the generic name and add an explanatory sentence: rejected because skill
  discovery still cannot resolve a skill named exactly `openspec`.

## Risks / Trade-offs

- More names make the required-source section longer. This is mitigated by
  grouping them by workflow stage rather than listing every optional OpenSpec
  command skill.
- Generated skill names could change in a future OpenSpec release. The contract
  test will expose that integration change instead of allowing silent drift.
