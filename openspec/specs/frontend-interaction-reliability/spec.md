# Frontend Interaction Reliability

## Purpose

为前端列表查询建立可验证的性能与状态一致性边界，避免全量拉取列表数据，并确保进度等中间状态更新不会重复传输或重建整页内容。

## Requirements

### Requirement: 列表查询必须分页

前端对列表数据执行查询时 MUST 使用明确的分页参数和分页结果，不得一次性请求并渲染未设上限的完整列表。

#### Scenario: 列表查询使用分页

- **WHEN** 用户首次打开列表、翻页、改变页大小或恢复列表查询
- **THEN** 前端发送带有分页信息的请求，并只渲染当前分页范围的数据

#### Scenario: 大列表禁止无分页请求

- **WHEN** 列表数据源没有提供分页能力或调用方未设置分页参数
- **THEN** 前端不得直接发起全量列表查询，必须显示可恢复的错误或采用受控的分页方案

### Requirement: 中间状态必须按分页数据 ID 增量更新

当分页列表项需要展示进度等中间状态时，列表查询结果 MUST 为每个可跟踪项提供稳定的数据 ID；前端 MUST 使用这些 ID 单独请求状态，并仅更新发生变化的 ID 对应状态，不得为刷新状态重复请求或替换整个分页列表。

#### Scenario: 首次获取分页列表的中间状态

- **WHEN** 当前分页返回包含可跟踪项的稳定数据 ID
- **THEN** 前端使用这些 ID 请求对应中间状态，并将状态合并到已有列表项

#### Scenario: 中间状态发生增量变化

- **WHEN** 状态请求返回一个或多个 ID 的新状态
- **THEN** 前端仅更新这些 ID 对应的状态字段，保留未变化项、排序、分页位置和用户当前交互状态

#### Scenario: 状态请求失败或列表项离开当前页

- **WHEN** 状态请求失败、取消，或某个 ID 不再属于当前分页
- **THEN** 前端保留可恢复的状态反馈，不得用失败结果覆盖已有列表数据，也不得继续更新已离开当前分页的项

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
