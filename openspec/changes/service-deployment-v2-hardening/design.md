# Design

## Context

See `proposal.md` for motivation. The current Skill is a concise Markdown workflow with references for layout, naming, lifecycle and checklist, but it lacks deterministic validation assets and several failure-boundary contracts.

## Goals / Non-Goals

**Goals:**

- Make every high-risk decision observable through an input, command, record field or explicit failure.
- Keep systemd, manual-foreground and manual-background compatible without making PID files mandatory.
- Provide local-only validation assets that can be safely exercised without a real service.
- Keep the source package and registered copy synchronized.

**Non-Goals:**

- Do not deploy to, connect to, or inspect any live server in this change.
- Do not modify business service code, systemd units, Nginx files or production data.
- Do not make a generic process manager or database migration engine part of the Skill.

## Decisions

### 1. Reference-oriented contract

Keep `SKILL.md` as the router and hard-stop list. Put mode-specific and security-heavy detail in references to prevent contradictory copies. Every reference is linked from the main Skill.

### 2. Safe helper scripts instead of opaque automation

Add POSIX/Bash helpers only for deterministic filesystem operations that are otherwise repeatedly rewritten: path contract testing and retention. `retention.sh` defaults to preview and requires `--apply`; it never accepts a broad directory target and reports exact IDs. Service-specific lifecycle and health commands remain explicit inputs.

### 3. Append-only sequence state

Use `release-records/sequence.state` plus a service lock. The allocator writes the increment before publishing, so a failed or interrupted attempt consumes the number. A separate record under `release-records/` provides audit evidence; cleanup never touches sequence state.

### 4. Physical path and archive boundaries

Resolve all symlinks before comparing paths. Archive extraction uses a staging directory and validates member names and links before promotion. The external `conf`, `logs`, `run` and `release-records` directories are never extraction targets.

### 5. Explicit mode adapters

Systemd owns EnvironmentFile and process lifecycle. Shell modes must either use a restricted parser or prove a restricted source file; foreground uses `exec`/operator Ctrl+C, background requires an exact identity and stop contract. A PID is evidence, not authorization by itself.

### 6. Evidence-first state machine

Each transition writes a state record and has a recovery action. Health verification is a matrix rather than a single Actuator or process check. Rollback selects only the recorded previous release; a failed rollback is an incident stop.

## Risks / Trade-offs

- [Risk] Existing historical release names lack the new sequence suffix → Mitigation: treat them as read-only legacy records and require the new format only for new releases.
- [Risk] Restricted env syntax may reject a service-specific valid value → Mitigation: use a declared dedicated parser/loader contract instead of silently falling back to `source`.
- [Risk] Manual foreground cannot be verified asynchronously → Mitigation: wait for explicit operator confirmation and mark health as unverified until then.
- [Risk] Retention cannot safely classify corrupt or unknown directories → Mitigation: preview and preserve anything not provably a managed release.
- [Risk] Application rollback cannot undo schema migration → Mitigation: require expand/contract compatibility and explicit migration recovery/approval.

## Migration Plan

1. Update source Skill and resources, run local helper tests and validators.
2. Synchronize the registered copy only after source audit passes.
3. For future deployments, adopt new sequence state and record schema without renaming historical releases.
4. If a deployment fails, use the state record to reconcile or roll back to `previous_release`; never delete the failed release during the incident.
