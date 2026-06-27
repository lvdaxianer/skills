## Context

The user wants a new skill that activates both when implementing frontend
interactions and when reviewing frontend interaction experience. The skill must
make agents explicitly enumerate what "frontend interaction experience" means,
with special attention to repeated submission, deletion safety, debounce and
throttle behavior, and unified loading and empty states across pages.

## Decisions

- Create a skill named `frontend-interaction-guidelines` because it is concise,
  discoverable, and describes the intended scope: interaction rules rather than
  broad visual design.
- Use `SKILL.md` for trigger metadata, mode selection, workflow, and result
  format. This keeps activation lightweight and makes the essential procedure
  visible immediately after the skill is loaded.
- Store the full checklist in
  `frontend-interaction-guidelines/references/interaction-checklist.md` so the
  skill remains concise while still providing a complete checklist for
  implementation and review tasks.
- Cover both implementation and review modes:
  - Implementation mode identifies the user's task path, high-risk actions,
    required states, consistency requirements, and verification expectations
    before changing UI code.
  - Review mode reports issues grouped by `必须修复`, `应该修复`, and `可优化`.
- Treat operation reliability as a high-priority category, not a minor state
  detail. Submit, save, delete, publish, pay, upload, and batch operations must
  protect against repeated triggering, slow networks, failed requests, and
  accidental destructive actions.
- Treat cross-page consistency as a high-priority category. Loading, empty,
  error, success, disabled, confirmation, destructive action, offline, and
  permission-denied states must use consistent interaction patterns across the
  same product unless there is an explicit product reason to differ.

## Checklist Scope

The reference checklist must cover at least these dimensions:

- Task path experience.
- State feedback.
- Form and input experience.
- Error and recovery experience.
- Loading and waiting experience.
- Empty and boundary states.
- Navigation and orientation.
- Operability and hit targets.
- Keyboard and shortcut behavior.
- Motion and transitions.
- Responsive and device adaptation.
- Information hierarchy and readability.
- Consistency and expectation matching.
- Accessibility experience.
- Data change and real-time behavior.
- Permission, privacy, and safety.
- Operation reliability and repeated trigger protection.
- Cross-page state and action consistency.

## Risks / Trade-offs

- If the checklist is too long, agents may apply it superficially. The workflow
  must force agents to identify the current interaction surface and high-risk
  actions first, then load the checklist and apply the relevant items.
- This skill may overlap with `frontend-design`, `interface-design`, and
  `product-manager`. The boundary is interaction behavior quality: visual style
  and product strategy remain in their respective skills, while this skill
  governs frontend interaction states, flows, reliability, and consistency.
