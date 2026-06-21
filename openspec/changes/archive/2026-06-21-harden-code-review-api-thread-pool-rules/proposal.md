## Why

`code-review-spec` already contains logging and thread-pool guidance, but two
review expectations need to be explicit enough that future reviewers can enforce
them consistently:

- Third-party API calls must log the HTTP method, request URL, request
  parameters, required headers, and response value.
- Thread-pool usage must keep business workloads isolated and must flag tasks
  that hold worker threads for a long time, because long-lived blocking tasks
  can exhaust the pool.

## What Changes

- Strengthen third-party API logging requirements in `code-review-spec`.
- Strengthen Java thread-pool isolation requirements for separate business
  workloads.
- Add a thread holding / pool exhaustion review rule for blocking, waiting,
  polling, slow external calls, and similar long-running task bodies.
- Update reference examples so reviewers have concrete correct and incorrect
  patterns.

## Capabilities

### Added Capabilities

- `code-review-spec`: Defines enforceable review requirements for third-party
  API call observability and Java thread-pool exhaustion risk.

## Impact

- Affected documentation: `code-review-spec/spec.md`,
  `code-review-spec/references/third-party-api-logging.md`,
  `code-review-spec/references/thread-pool.md`
- Affected tests: text contract coverage for `code-review-spec`
- No runtime production code is affected.
