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
7. Apply the async operation lifecycle below to every state-changing action,
   including delete, save, submit, publish, pay, upload, import, and batch work.

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

### Async Operation Lifecycle

Use one observable lifecycle for state-changing actions so users can tell what
has started, what is still running, and what they can do next:

- Enter `pending` or `busy` immediately after activation. The initiating
  control MUST show a loading or equivalent busy state and MUST prevent
  repeated activation until the request reaches a terminal state. For work
  that completes in under roughly 300 ms, the control MAY remain disabled
  without showing a spinner to avoid flicker.
- Keep the initiating surface visible by default while the request is pending.
  In a confirmation dialog, the confirm action MUST remain loading until the
  request succeeds or fails; the dialog MUST NOT disappear without feedback
  while the delete, save, publish, payment, upload, import, or batch request
  is still in flight. If a documented product reason requires closing the
  surface, the affected row, item, or task area MUST retain a visible pending
  state and MUST prevent an equivalent action from being started again.
- Apply data and navigation changes only after confirmed success. Only then
  may the interface close the dialog or drawer, navigate, clear input, remove
  an item, or report completion.
- On failure, timeout, cancellation, or loss of connectivity, stop loading and
  restore a safe actionable state. Preserve relevant input, selection, and
  context, explain the next useful action, and provide retry, undo, cancel, or
  another supported recovery path. Optimistic changes MUST roll back or have
  an equally visible recovery path.
- Long-running work MUST distinguish submitted, queued, processing, completed,
  failed, and cancelled states. Show progress or an estimate when available,
  offer cancellation when supported, and preserve or restore the task status
  across refresh, navigation, and return to the product.
- Define close, Escape, click-outside, refresh, navigation, and background-task
  behavior while work is pending. These paths MUST NOT silently discard the
  request or leave the user unable to discover its final outcome.
- Pending, success, failure, cancellation, and recovery MUST use semantic
  status feedback that assistive technology can perceive and MUST remain
  consistent for equivalent actions across pages.

## Non-Negotiable Interaction Rules

- The project component library is mandatory when it provides a component or
  interaction primitive that meets the requirement. Before writing a custom
  component, inspect the project's configured component library and reuse the
  matching component; do not reimplement an existing library component for
  convenience, styling preference, or minor API differences.
- A custom component is permitted only when the component library has no
  suitable component or primitive. The implementation evidence must record the
  library search performed, the missing capability, and why composition of
  existing library components cannot satisfy the requirement. This is a hard
  gate for implementation and review; missing evidence fails the gate.
- Component-to-component communication must use the smallest possible
  dependency contract. Parent and child components must pass only the stable
  identifier required to locate the data (for example, an `id`); the receiving
  component must resolve the current data through the appropriate store, query,
  or data-access layer. Do not pass whole entities, large object graphs, or
  unrelated fields through component props merely for convenience. This is a
  hard implementation and review gate; violating it fails the task audit.
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
- List queries must use explicit pagination to bound network transfer, memory use,
  and rendering work; unbounded full-list queries are not permitted.

### List/table refresh anti-flicker

- List and table refreshes MUST keep existing content mounted while a refresh is
  pending. Do not bind the list's display condition to `loading` (for example,
  `v-if="!loading && items.length"`), because that unmounts and remounts the
  entire list. Inspect pagination, summary, and other accompanying regions for
  the same problem.
- A list's display condition MUST depend on whether data exists, not on whether
  a refresh is in progress. During manual refresh or polling, keep the previous
  content visible and show busy feedback on the initiating refresh control.
  Full-page loading or an initial placeholder is allowed only when the first
  request has no data to display.
- Refresh merges MUST use a stable unique item ID as the row key and perform a
  shallow row comparison. Reuse the existing object reference for unchanged
  rows and update only rows with real changes; do not replace the whole list in
  a way that rebuilds every row unnecessarily.
- Manual refresh and automatic polling MUST use the same ID-based incremental
  update path. Polling MUST NOT force a full-list remount or full-page loading
  state merely because fresh data is being requested.
- Verification MUST intercept the list request and delay it by about one second.
  While the request is in flight, assert that the list DOM node remains the same
  instance and that no initial-loading placeholder appears. Add or update the
  relevant tests, and require all tests and type checks to pass.
- Changes made to address refresh flicker MUST remain scoped to the refresh,
  mounting, merge, and verification logic; do not alter unrelated behavior.

- When paginated list items expose intermediate state such as progress, the list
  response must provide a stable data ID for every trackable item. The frontend
  must request that state separately by ID and apply incremental updates only to
  changed IDs; it must not refresh or replace the entire page to update progress.
- When an existing list item has an independent state or field update, such as
  enable/disable, start/stop, pause/resume, publish/unpublish, archive/restore,
  approve/reject, pin/unpin, read/unread, or an ordinary field edit, the
  frontend must merge the successful response into the matching stable ID and
  update only the affected fields. It must not re-request, replace, or refresh
  the entire list by default. Creating and deleting items are structural
  changes and are outside this rule. If the successful update changes the
  current filter, sort position, or page membership, a follow-up list query is
  allowed only to correct that structure after the local update succeeds.
- Out-of-date async responses must not overwrite newer state: rapid search,
  filter, or tab switching must cancel or ignore stale results (for example
  through request sequencing or `AbortController`).
- Optimistic updates must include failure rollback or visible recovery.
- The same product must use consistent loading, empty, error, success, disabled,
  confirmation, destructive action, offline, permission-denied, and long-running
  task patterns across pages unless there is an explicit product reason to
  differ.
