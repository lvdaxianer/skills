## Context

The user requested two additions to `code-review-spec`:

1. Third-party interface calls must print request method, request URL, request
   parameters, necessary headers, and response value.
2. Thread-pool usage must separate different business workloads, and reviewers
   must catch cases where a task holds a thread long enough to fill the pool.

The user explicitly clarified that the logging rule does not require masking.
Existing security rules still prohibit secrets from being hardcoded, but this
change will not add a new masking requirement to the third-party API rule.

## Decisions

- Add the third-party API logging contract in the main spec under the existing
  `7.5` section so it is part of the mandatory review baseline.
- Update the third-party API reference with request and response examples that
  include method, URL, parameters, required headers, response status, duration,
  and response body/value.
- Tighten the Java thread-pool section to say different business workloads must
  use different business-specific thread pools.
- Add a new thread-holding risk subsection. Reviewers must reject thread-pool
  task bodies that can occupy worker threads for a long time without isolation,
  timeout control, queue/rejection strategy, or async/task-splitting treatment.
- Treat examples of long-held threads as `Thread.sleep`, polling loops,
  synchronous waiting on async results, lock waits, blocking IO, slow external
  calls, and retry waits.

## Risks / Trade-offs

- More complete third-party API logs can increase log volume. The rule is still
  valuable because third-party integrations need reproducible request and
  response evidence for debugging and responsibility boundaries.
- Thread-holding detection is partly semantic. The reference must include
  concrete patterns so reviewers can apply it consistently instead of treating
  every asynchronous task as a problem.
