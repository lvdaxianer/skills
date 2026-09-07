---
name: frontend-interaction-guidelines
description: "Use for frontend interaction implementation and frontend interaction review: pages, components, forms, modals, lists, dashboards, editors, workflows, buttons, loading, empty states, submit/delete actions, debounce/throttle, drag and drop, selection and batch operations, tooltips/popovers/menus, keyboard behavior, motion, responsive interaction, accessibility interaction quality, operation reliability, cross-page state consistency, runtime resilience, and page lifecycle behavior."
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

## Scope

This skill covers interaction behavior: states, feedback, recovery, operability,
and consistency. It does not cover visual style, code style, build and tooling,
build-time bundle performance, or backend API design. Runtime responsiveness is
interaction quality and is in scope: long tasks, jank, memory leaks, error
boundaries, resource load failures, and page lifecycle behavior.

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
4. Report findings with this severity grouping (labels stay in Chinese for
   consistency with product-facing reports):
   - `必须修复` (must-fix): Causes misoperation, data loss, duplicate submission,
     inaccessible interaction, broken recovery, or blocked core flow.
   - `应该修复` (should-fix): Clearly harms speed, clarity, consistency,
     feedback, or stability.
   - `可优化` (nice-to-have): Improves polish, delight, expert efficiency, or
     perceived responsiveness.

## Non-Negotiable Interaction Rules

- Submit, save, publish, pay, upload, delete, and batch actions must protect
  against repeated triggering and slow networks.
- Destructive or irreversible actions must not rely only on debounce; use
  confirmation, undo, or clear consequence communication.
- Delete actions must require an explicit confirmation step (confirmation
  dialog, typed confirmation, or equivalent) before the delete request is
  sent. A single click on a delete control must never execute the delete
  directly, regardless of surface (button, icon button, menu item, row
  action, batch action, keyboard shortcut).
- Delete and other destructive action controls must use a distinct destructive
  visual treatment so users can recognize them before activation. The default
  destructive color is red; any product-level override must be documented and
  applied consistently across every surface.
- Frontend debounce/throttle does not replace backend idempotency when duplicate
  requests can change data.
- Out-of-date async responses must not overwrite newer state: rapid search,
  filter, or tab switching must cancel or ignore stale results (for example
  through request sequencing or `AbortController`).
- Optimistic updates must include failure rollback or visible recovery.
- The same product must use consistent loading, empty, error, success, disabled,
  confirmation, destructive action, offline, permission-denied, and long-running
  task patterns across pages unless there is an explicit product reason to
  differ.
