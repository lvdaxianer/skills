# Release State Machine and Reconcile

## States

```text
prepared -> validated -> stopped -> switched -> started -> health-verified -> recorded
                    \-> failed
stopped/switched/started/health-verified -> rolled-back -> recorded
any non-terminal state after interruption -> reconcile -> next safe state or failed
```

Each state record includes `release_id`, `previous_release`, `current`, timestamp, operator, lifecycle mode and evidence paths. State transitions are append-only; a failed transition records `failed_phase` and does not erase the release.

For `runtime_target=docker-container`, state evidence MUST additionally identify `image_transport`, Registry digest or local image ID, Compose project/container ID, physical release root and Compose path, persistence manifest checksum, confirmed frontend/backend/lib/conf/database/object-storage resource decisions, host mount set, `override_strategy`, ordered `override_chain` and every layer checksum. These are part of the rollback target; changing only `current`, only the image or only the newest override layer is not sufficient.

## Transition gates

- `prepared`: staging exists under releases and artifact checksum is known.
- `validated`: archive, permissions, required files, env, migration, resource confirmation, mode-specific host path/PVC checks and contract test pass.
- `stopped`: declared stop command succeeded and status proves old process is down.
- `switched`: atomic current replacement succeeded and physical target is the new release.
- `started`: selected lifecycle start returned success and process/service identity is the new release.
- `health-verified`: the full status/health/smoke matrix passed within timeout/retry policy.
- `recorded`: schema-valid record is durably written.
- `rolled-back`: current points to recorded previous release and its status/health pass.
- `failed`: a gate or rollback failed; incident evidence and next human action are recorded.

## Failure behavior

Before switch failure, leave current untouched. After switch failure, stop only the new service identity, restore previous current atomically, and for Docker restore the recorded previous Registry digest or local image ID, verified archive when required, physical Compose path, persistence manifest, confirmed resource decisions and complete release-bound `override_chain` before starting previous. For Kubernetes restore the recorded previous workload manifest and PVC/PV references; never replace a missing PVC/PV with `hostPath`. Rerun status/health and verify the loaded artifact. If stop fails, do not continue; request operator intervention. If rollback health or required mount restoration fails, stop and report incident, preserve both releases and do not select a third version.

## SSH interruption recovery

`reconcile` reads the durable state and checks lock ownership, temporary link existence, current physical target and process identity. It may remove only the named temporary link owned by the same attempt. It may continue health verification when current and process agree; otherwise it performs the recorded rollback. An unknown state, missing previous target or ambiguous process is `failed`, not permission to guess.

For Docker reconcile, also verify the selected transport's image identity is available (or the archive checksum can restore it), the exact container labels/project match the current descriptor, all required mounts resolve under service-root and every `override_chain` layer exists with the recorded checksum and precedence. Missing data or image evidence is a failed recovery, not a reason to create a third container or delete volumes.
