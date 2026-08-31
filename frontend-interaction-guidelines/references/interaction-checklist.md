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

### Error and recovery experience

- Errors use user-facing language and name the next useful action.
- Retry, undo, cancel, back, draft save, or contact paths exist when they matter.
- The user does not lose work because of validation, network failure, navigation,
  or refresh.

### Loading and waiting experience

- Short, long, local, background, and blocking work use appropriate loading
  patterns.
- Skeletons, progress, optimistic updates, or queued states are used when they
  reduce uncertainty.
- Loading does not freeze unrelated usable parts of the page.

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

### Operability and hit targets

- Buttons, icons, checkboxes, row actions, drag handles, and touch targets are
  large enough and spaced well enough for the device.
- Common actions are near the content they affect.
- Dangerous actions are separated from frequent safe actions.

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

### Permission, privacy, and safety

- Login expiry, permission-denied, sensitive data, destructive actions, privacy
  exposure, payment, publishing, and irreversible changes communicate risk.
- The interface makes consequences clear before high-risk actions.
- Recovery or support paths exist when the user cannot proceed.

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
