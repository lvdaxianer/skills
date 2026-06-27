# code-review-spec Specification

## Purpose
Define mandatory code review rules for third-party API observability and Java
thread-pool usage so reviewers can enforce complete integration logs, business
thread-pool isolation, and safeguards against worker-thread exhaustion.
## Requirements
### Requirement: Code review spec MUST require complete third-party API call logs
The code review spec MUST require third-party HTTP/REST calls to log the
request method, request URL, request parameters, necessary headers, and response
value so integration issues can be reproduced from logs.

#### Scenario: Reviewing a third-party API call
- **WHEN** reviewed code calls an external third-party HTTP/REST API
- **THEN** the review requires logs for the HTTP method and request URL
- **AND** the review requires logs for path parameters, query parameters, and
  request body parameters when present
- **AND** the review requires logs for headers needed to reproduce or trace the
  request
- **AND** the review requires logs for the response status, duration, and
  response value/body

### Requirement: Code review spec MUST prevent thread-pool exhaustion from shared or long-held threads
The code review spec MUST require Java thread pools to be isolated by business
workload and MUST flag task bodies that hold worker threads long enough to fill
or starve the pool.

#### Scenario: Reviewing Java thread-pool definitions
- **WHEN** reviewed Java code uses a thread pool for multiple business
  workloads
- **THEN** the review requires different business workloads to use different
  business-specific thread pools
- **AND** the review rejects long-term sharing of one pool across unrelated
  core business flows

#### Scenario: Reviewing thread-pool task bodies
- **WHEN** a submitted task can hold a worker thread through sleep, polling,
  blocking IO, waiting on locks or async results, retry waits, slow external
  calls, or similar long-running behavior
- **THEN** the review requires explicit mitigation such as isolated pool
  sizing, timeout control, bounded queue and rejection policy, task splitting,
  scheduled execution, or asynchronous design
- **AND** the review treats unbounded or repeated thread holding as a pool
  exhaustion risk that must be fixed

### Requirement: Code review spec MUST require the canonical author marker for new methods and classes
The code review spec MUST require only newly added methods or classes to use
the canonical `@author` marker `lvdaxianer@yeah.net`, while preserving existing
author values on older methods or classes.

#### Scenario: Reviewing a newly added method or class
- **WHEN** reviewed code adds a new method or class that requires an author
  marker
- **THEN** the review requires the marker to be `lvdaxianer@yeah.net`
- **AND** the review does not require changing author markers on existing
  methods or classes

### Requirement: Code review spec MUST require Chinese code comments when comments are written or modified
The code review spec skill entry point MUST state that newly written or modified
code comments use Chinese comments, so future reviews enforce the user's
comment language preference.

#### Scenario: Reviewing a change that writes or updates comments
- **WHEN** reviewed code adds or modifies code comments
- **THEN** the code review skill requires those comments to be written in
  Chinese
- **AND** the rule does not require changing unrelated existing comments outside
  the reviewed diff

