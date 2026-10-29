# Tasks

## 1. Local image transport contract

- [x] 1.1 Update `docker-deployment.md` and `SKILL.md` with registry/local-daemon/archive modes, local image ID, docker save/load and mode-specific latest update rules.
- [x] 1.2 Extend `release-record.schema.json` with image transport, nullable registry and identity-kind fields while preserving registry and host-process records.

## 2. Operational integration

- [ ] 2.1 Update checklist, Compose comments and evals with no-Registry deployment, archive checksum and missing rollback image cases.
- [ ] 2.2 Synchronize source/registered Skill, update main OpenSpec specs and audit registry-optional/latest/rollback/retention consistency.

## 3. Verification and delivery

- [ ] 3.1 Run OpenSpec, schema, JSON/YAML, shell and parity checks; commit, merge into `master`, archive the change, remove this worktree/branch and verify integration.
