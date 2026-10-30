# Spec Delta

## ADDED Requirements

### Requirement: State-changing actions enter a visible pending state immediately

State-changing actions MUST enter a pending or busy state as soon as the user activates them, and MUST prevent repeated activation until the request reaches a terminal state.

#### Scenario: User confirms a delete
- **WHEN** the user activates the destructive confirmation action
- **THEN** the confirmation action immediately shows loading, prevents repeated activation, and remains busy until the delete request succeeds or fails

#### Scenario: User submits a short request
- **WHEN** a save or submit request completes within the brief-feedback threshold
- **THEN** the initiating control still prevents a second activation during the request, while the product MAY omit a visible spinner to avoid flicker

### Requirement: The initiating surface remains understandable while the request is pending

The dialog, drawer, form, or local action surface that initiated a request MUST remain visible by default until a terminal result is known; if it closes for a documented product reason, the affected content MUST retain a visible pending state and MUST prevent re-entry.

#### Scenario: Delete confirmation request is in flight
- **WHEN** the delete request has been sent but no terminal response has arrived
- **THEN** the confirmation dialog remains open, its confirm action shows loading, and cancel or close behavior does not silently discard the pending state

#### Scenario: A product intentionally closes a surface
- **WHEN** a submitted operation is allowed to leave its initiating dialog or drawer
- **THEN** the affected row, item, or task area shows that the operation is still processing and does not offer a second equivalent action

### Requirement: Terminal outcomes provide consistent completion or recovery

The interface MUST apply success changes only after confirmed success, and MUST end the pending state with a recoverable error or cancellation outcome that preserves the user's relevant context.

#### Scenario: Operation succeeds
- **WHEN** the server confirms a save, delete, publish, payment, upload, import, or batch operation
- **THEN** the interface stops loading, applies the intended data change, and only then closes, navigates, clears input, or removes the affected item

#### Scenario: Operation fails, times out, or loses connectivity
- **WHEN** an operation cannot be completed
- **THEN** the interface stops loading, restores a safe actionable state, preserves relevant input or selection, explains the next action, and provides retry or another supported recovery path

### Requirement: Long-running and background work exposes its lifecycle

Operations that can outlive a short interaction MUST distinguish submitted, queued, processing, completed, failed, and cancelled states, and MUST expose progress or cancellation when the underlying operation supports them.

#### Scenario: Import or batch operation continues after submission
- **WHEN** the request is accepted but processing is not complete
- **THEN** the interface shows a retrievable processing state with the current outcome or progress and does not imply that the work has already completed

#### Scenario: User navigates during background work
- **WHEN** the user refreshes, changes page, or returns to the product while long-running work is active
- **THEN** the interface preserves or restores the operation state and makes the final success or failure discoverable

### Requirement: Async state changes are consistent and accessible across surfaces

Equivalent operations MUST use consistent pending, success, failure, cancellation, and recovery language and placement, and state changes MUST be conveyed through semantic status feedback that assistive technology can perceive.

#### Scenario: The same operation appears on multiple pages
- **WHEN** users perform the same save, delete, publish, upload, or batch action in different views
- **THEN** the views use the same busy behavior, terminal-state timing, recovery affordance, and consequence communication unless a documented task difference requires otherwise

#### Scenario: A request changes state while a screen reader is active
- **WHEN** an operation enters pending, succeeds, fails, or becomes recoverable
- **THEN** the relevant status is exposed through an accessible semantic announcement or status region and is not communicated by color alone
