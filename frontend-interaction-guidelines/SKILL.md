---
name: frontend-interaction-guidelines
description: "Use for frontend interaction implementation and frontend interaction review: pages, components, forms, modals, lists, dashboards, editors, workflows, buttons, loading, empty states, submit/delete actions, debounce/throttle, keyboard behavior, motion, responsive interaction, accessibility interaction quality, operation reliability, and cross-page state consistency."
---

# Frontend Interaction Guidelines

Use this skill to make frontend interactions reliable, understandable, and
consistent across a product. This skill complements visual design skills: it
focuses on behavior, states, feedback, recovery, and interaction quality.

## Required Reference

Read `frontend-interaction-guidelines/references/interaction-checklist.md`
before substantive frontend interaction implementation or review decisions.

If the reference cannot be read, stop and report that frontend interaction
guidelines are unavailable.

## Mode Selection

### Implementation mode

Use implementation mode when building or changing frontend UI behavior.

1. Identify the user's core task path and the interaction surface.
2. Identify high-risk actions: submit, save, delete, publish, pay, upload,
   batch operations, autosave, search, filters, and infinite scroll.
3. Read the checklist reference and apply the relevant dimensions.
4. Define required states before finalizing UI behavior: loading, disabled,
   success, error, empty, offline, permission denied, and long-running task.
5. Preserve or create consistent interaction patterns for shared states and
   actions across pages.
6. Verify the implemented interaction with realistic slow-network, failure,
   repeated-click, keyboard, mobile, and empty-data scenarios when applicable.

### Review mode

Use Review mode when auditing existing frontend interaction experience.

1. Identify the page, component, or workflow being reviewed.
2. Read the checklist reference and inspect the relevant dimensions.
3. Prioritize findings by user impact and reliability risk.
4. Report findings with this severity grouping:
   - `必须修复`: Causes misoperation, data loss, duplicate submission,
     inaccessible interaction, broken recovery, or blocked core flow.
   - `应该修复`: Clearly harms speed, clarity, consistency, feedback, or
     stability.
   - `可优化`: Improves polish, delight, expert efficiency, or perceived
     responsiveness.

## Non-Negotiable Interaction Rules

- Submit, save, publish, pay, upload, delete, and batch actions must protect
  against repeated triggering and slow networks.
- Destructive or irreversible actions must not rely only on debounce; use
  confirmation, undo, or clear consequence communication.
- Frontend debounce/throttle does not replace backend idempotency when duplicate
  requests can change data.
- Optimistic updates must include failure rollback or visible recovery.
- The same product must use consistent loading, empty, error, success, disabled,
  confirmation, destructive action, offline, permission-denied, and long-running
  task patterns across pages unless there is an explicit product reason to
  differ.
