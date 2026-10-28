# Release State Machine and Reconcile

## States

```text
prepared -> validated -> stopped -> switched -> started -> health-verified -> recorded
                    \-> failed
stopped/switched/started/health-verified -> rolled-back -> recorded
any non-terminal state after interruption -> reconcile -> next safe state or failed
```

Each state record includes `release_id`, `previous_release`, `current`, timestamp, operator, lifecycle mode and evidence paths. State transitions are append-only; a failed transition records `failed_phase` and does not erase the release.

## Transition gates

- `prepared`: staging exists under releases and artifact checksum is known.
- `validated`: archive, permissions, required files, env, migration and contract test pass.
- `stopped`: declared stop command succeeded and status proves old process is down.
- `switched`: atomic current replacement succeeded and physical target is the new release.
- `started`: selected lifecycle start returned success and process/service identity is the new release.
- `health-verified`: the full status/health/smoke matrix passed within timeout/retry policy.
- `recorded`: schema-valid record is durably written.
- `rolled-back`: current points to recorded previous release and its status/health pass.
- `failed`: a gate or rollback failed; incident evidence and next human action are recorded.

## Failure behavior

Before switch failure, leave current untouched. After switch failure, stop only the new service identity, restore previous current atomically, start previous, and rerun status/health. If stop fails, do not continue; request operator intervention. If rollback health fails, stop and report incident, preserve both releases and do not select a third version.

## SSH interruption recovery

`reconcile` reads the durable state and checks lock ownership, temporary link existence, current physical target and process identity. It may remove only the named temporary link owned by the same attempt. It may continue health verification when current and process agree; otherwise it performs the recorded rollback. An unknown state, missing previous target or ambiguous process is `failed`, not permission to guess.
