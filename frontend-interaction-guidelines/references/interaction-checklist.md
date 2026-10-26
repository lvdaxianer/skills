# Frontend Interaction Checklist

Apply the relevant checks for the current interaction surface. Do not treat this
as a visual style checklist; focus on what the user can do, what the system
communicates, and how safely the interaction behaves.

## Interaction Dimensions

### Task path experience

- The primary user goal is visible and reachable without unnecessary steps.
- Primary, secondary, and destructive actions are visually and behaviorally
  distinct.
- The flow avoids repeated input and preserves user progress across reasonable
  interruptions.

### State feedback

- Click, hover, active, focus, disabled, loading, success, and error states are
  visible where they matter.
- Feedback appears close to the action that caused it.
- The interface distinguishes local component work from whole-page work.

### Form and input experience

- Labels, required fields, defaults, placeholders, validation timing, and helper
  text match the user's task.
- Validation explains how to fix the issue and preserves entered data.
- Focus, Enter, Escape, paste, formatting, and submission behavior are
  predictable.
- File upload covers drag-over, progress, cancel, and failure-retry states, and
  communicates type and size constraints before the upload starts.

### Error and recovery experience

- Errors use user-facing language and name the next useful action.
- Retry, undo, cancel, back, draft save, or contact paths exist when they matter.
- The user does not lose work because of validation, network failure, navigation,
  or refresh.
- Low-cost reversible actions prefer undo over blocking confirmation; the undo
  affordance and its time window are visible. High-cost or irreversible actions
  still require explicit confirmation.

### Loading and waiting experience

- Short, long, local, background, and blocking work use appropriate loading
  patterns.
- Skeletons, progress, optimistic updates, or queued states are used when they
  reduce uncertainty.
- Loading does not freeze unrelated usable parts of the page.
- Feedback timing matches the wait: work under roughly 300 ms shows no loader to
  avoid flicker, medium waits show a local spinner or skeleton, and long waits
  show progress or an estimate with a cancel path when the work can be stopped.

### Empty and boundary states

- First-use, no-data, no-results, filtered-out, permission-denied, offline,
  overflow, very-long-text, and narrow-screen states are handled.
- Empty states explain what happened and offer the next useful action when one
  exists.
- Boundary states preserve layout instead of causing jumps or overlapping text.

### Navigation and orientation

- Users can tell where they are, where they came from, and where they can go.
- Back, breadcrumb, tabs, sidebars, dialogs, drawers, and nested routes preserve
  expected orientation.
- Modal and overlay layering does not trap users without a clear exit.
- Dialogs, tabs, filters, and pagination that represent shareable state are
  reflected in the URL, and browser back/forward and refresh restore the expected
  view.

### Operability and hit targets

- Buttons, icons, checkboxes, row actions, drag handles, and touch targets are
  large enough and spaced well enough for the device.
- Common actions are near the content they affect.
- Dangerous actions are separated from frequent safe actions.
- Delete and other destructive controls use a distinct destructive visual
  treatment (default red) recognizable before activation, applied consistently
  across button, icon button, menu item, row action, and batch action surfaces.

### Drag, drop, and reorder

- Dragging shows clear state: the dragged item, valid drop targets, and invalid
  drop targets are visually distinguishable.
- Escape cancels an in-progress drag and restores the original state.
- Dragging is never the only way to perform the action: keyboard and touch
  users have an equivalent path (for example move buttons, menus, or
  reorder controls).
- Long lists auto-scroll when dragging near a container edge.
- The drop result is confirmed visually, and moves with significant
  consequences (cross-group moves, destructive reorders) offer undo.

### Selection and batch operations

- "Select all on this page" and "select all results" are distinct actions and
  the interface makes clear which one is active.
- Shift-click range selection works in multi-select lists where users expect
  it, and the selected count is always visible.
- The batch action bar has a stable position and does not cover the content or
  controls it relates to.
- Selection behavior across pagination, filter, and search changes is defined
  and consistent: whether selections persist, shrink, or reset is never a
  surprise.
- Batch results support partial success: per-item success and failure are
  reported, and failed items can be retried individually without re-running
  the whole batch.

### Tooltips, popovers, and menus

- Hover-only functionality always has an equivalent click, keyboard, or touch
  path; nothing is discoverable only by hovering.
- Tooltips use a hover-intent delay so passing the cursor across the screen
  does not flash tooltips.
- Popovers and menus flip or reposition at viewport edges instead of being
  clipped.
- Close behavior is consistent: Escape and click-outside close transient
  layers, and scroll or resize behavior (close, reposition, or follow) is
  defined per layer type and applied consistently.
- Nested layers close in order and a parent closing also closes its children.

### Keyboard and shortcut behavior

- Tab order follows the visual and task order.
- Focus is visible, restored after dialogs, and trapped only when appropriate.
- Enter, Escape, arrow keys, typeahead, shortcuts, and screen-reader interaction
  match user expectations.

### Motion and transitions

- Motion explains state changes: enter, exit, expand, collapse, reorder, drag,
  save, load, or completion.
- Durations are restrained and do not delay core work.
- Reduced-motion preferences are respected when motion could distract or harm.

### Responsive and device adaptation

- Desktop, tablet, mobile, narrow-screen, and high-density data states keep the
  core task usable.
- Text, buttons, popovers, tables, toolbars, and sticky elements do not overlap
  or overflow their containers.
- Touch, mouse, and keyboard interactions each have a usable path.

### Information hierarchy and readability

- The most important content and action are identifiable at a glance.
- Labels, helper text, errors, badges, timestamps, and metadata are clear and
  placed where users need them.
- Dense tools remain scannable without hiding critical status.

### Consistency and expectation matching

- Similar controls behave the same way in the same product.
- Copy, placement, timing, icons, confirmation patterns, and recovery patterns
  match existing product conventions.
- Differences are intentional and tied to a real task difference.

### Accessibility experience

- Semantic elements, names, roles, focus states, contrast, and ARIA are correct
  for the interaction.
- Meaning is not conveyed by color alone.
- Screen-reader users can understand state changes, errors, and completion.

### Data change and real-time behavior

- Save status, sync status, stale data, refresh, notifications, unread counts,
  conflict states, and collaborative edits are visible when relevant.
- Realtime updates do not steal focus or erase in-progress user work.
- The user can distinguish saved, saving, failed, and unsaved changes.
- Connection loss in polling or websocket-driven views is visible, with automatic
  reconnect and a clear recovered state.
- Every list query uses explicit pagination; unbounded full-list queries are not
  allowed because network, memory, and rendering costs grow with data size.
- When a paginated list displays intermediate state such as progress, each
  trackable item exposes a stable data ID, state is requested separately by ID,
  and only changed IDs are updated incrementally. Updating progress must not
  re-fetch or replace the entire page.

### Notifications and transient feedback

- Toasts auto-dismiss at a readable speed, can be dismissed manually, and never
  cover the content or actions they relate to.
- Repeated or simultaneous notifications stack, deduplicate, or summarize instead
  of flooding the screen.
- Critical outcomes are not communicated only through transient messages; the
  result stays discoverable in the interface and is announced to screen readers.

### Permission, privacy, and safety

- Login expiry, permission-denied, sensitive data, destructive actions, privacy
  exposure, payment, publishing, and irreversible changes communicate risk.
- The interface makes consequences clear before high-risk actions.
- Recovery or support paths exist when the user cannot proceed.
- Delete actions always require an explicit confirmation step (confirmation
  dialog, typed confirmation, or equivalent) before the delete request is
  sent. A single click on a delete control never executes the delete directly
  on any surface (button, icon button, menu item, row action, batch action,
  keyboard shortcut).

### Operation reliability

- Actions such as submit, save, delete, publish, pay, upload, and batch work use
  loading/disabled states immediately after activation.
- The repeated click behavior is stable on slow networks and cannot create duplicate
  data or contradictory states.
- Search, filter, autosave, resize, scroll, and infinite-scroll triggers use
  appropriate debounce/throttle behavior.
- Destructive or irreversible work uses confirmation, undo, or clear consequence communication
  instead of relying only on debounce/throttle.
- Frontend debounce/throttle is not treated as a replacement for backend idempotency
  when duplicate requests can affect data integrity.
- Every optimistic update has failure rollback or a visible recovery path.
- Page navigation, refresh, request failure, cancellation, and retry behavior are
  defined for long-running operations.
- Stale async responses cannot overwrite newer state: rapid search, filter, or
  tab switching cancels or ignores out-of-date results (for example through
  request sequencing or `AbortController`).

### Runtime and page lifecycle

- Page lifecycle events are handled: polling, timers, and subscriptions pause
  or slow when the tab is hidden (`visibilitychange`), in-progress state
  survives `pagehide`, and back/forward cache (bfcache) restores show fresh,
  consistent data.
- Long-lived pages do not leak: event listeners, subscriptions, timers, and
  large caches are cleaned up on component unmount and route changes.
- Runtime errors have boundaries: unexpected render or script errors show a
  fallback UI instead of a white screen, and global error handling reports
  failures.
- Deployment version mismatches are handled: chunk or asset load failures
  after a new release are detected and the user is guided to refresh.
- Static resource failures degrade gracefully: script, style, font, or image
  load failures have fallbacks, CDN unavailability is survivable, and
  third-party script or SDK crashes are isolated so they cannot break the
  main application.
- Multiple tabs of the same user stay consistent: login state changes
  propagate, concurrent edits to the same data are detected or resolved, and
  storage events keep views in sync.
- Runtime performance keeps interactions responsive: long tasks do not block
  input or clicks for noticeable periods, and large lists or data sets use
  virtualization, pagination, or incremental rendering.

### Cross-page state and action consistency

- The same product uses consistent interaction patterns for loading, empty,
  error, success, disabled, confirmation, destructive action, offline,
  permission-denied, and long-running task states.
- Common states use consistent behavior, language, placement, timing, and recovery
  patterns across pages and views.
- Loading and empty states are not reinvented per page unless a product-specific
  reason justifies the difference.
- Shared components or shared state primitives are preferred when they reduce
  drift and preserve the user's expectations.

### Component dependency boundaries

- Component communication uses the smallest possible dependency contract.
- Parent and child components pass only the stable identifier needed to locate
  the data, such as an `id`; the receiving component resolves current data
  through the appropriate store, query, or data-access layer.
- Whole entities, large object graphs, or unrelated fields are not passed
  through component props for convenience. A violation fails the frontend
  interaction gate and the task-level audit.
