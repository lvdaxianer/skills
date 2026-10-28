# Tasks

## 1. Docker contract references and templates

- [x] 1.1 Add `references/docker-deployment.md` covering image build/push/pull, digest pinning, OCI labels, Compose/systemd/manual lifecycle adapters, container identity, health, rollback, registry and image retention; verify every requirement in `service-deployment-docker-runtime` has an explicit command or failure condition.
- [x] 1.2 Add the persistent mount/override manifest schema and safe Compose template; verify the schema rejects undeclared host paths, writable protected paths, missing checksums and direct replacement of packaged `/app/lib`.
- [x] 1.3 Update `SKILL.md` and routing references to include `runtime_target`, persistence classification, override apply flow and Docker-specific report fields; verify host-process rules and the three lifecycle modes remain unchanged.

## 2. Existing reference and record integration

- [x] 2.1 Update layout, artifact/config security, lifecycle, database/health, rollback, stack/recoverability and checklist references with Docker persistence and overlay rules; verify there are no conflicting release ID, current, retention or rollback rules.
- [x] 2.2 Extend `release-record.schema.json` with runtime target, container identity, persistence mounts and override evidence while preserving valid host-process records; verify valid/invalid host and Docker fixtures with a JSON Schema validator.
- [x] 2.3 Add Docker and persistence-focused eval prompts/assertions and update the SceneForge mapping; verify the eval file remains valid JSON and covers container recreation, mount escape, overlay precedence and rollback failure.

## 3. Synchronization and verification

- [x] 3.1 Synchronize the verified source Skill package into `/Users/lvdaxianer/.codex/skills/service-deployment/` without changing the registered Skill name; verify source/registered reference files and schemas are equivalent except intentional frontmatter name normalization.
- [x] 3.2 Run OpenSpec strict validation, shell syntax checks, JSON/schema validation, source/registered diff checks and repository diff checks; verify all required checks pass or document an environment-only tooling gap.
- [x] 3.3 Perform a final consistency audit against the proposal, specs and design; verify no business project code, credentials, server state or unrelated worktree is changed.

## Workflow follow-up

- Merge the completed task branch into `master` after review and per-task audit.
- Archive the completed OpenSpec change and verify the integration branch contains the merged result.
- Remove only this task worktree and task branch after successful integration.
