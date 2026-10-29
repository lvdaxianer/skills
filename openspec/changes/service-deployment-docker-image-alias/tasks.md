# Tasks

## 1. Image tag and alias contract

- [x] 1.1 Update `docker-deployment.md` and `SKILL.md` with release tag, digest deployment, verified `latest` update timing, rollback behavior and same-image-ID alias explanation.
- [x] 1.2 Extend `release-record.schema.json` with repository, release tag and latest alias audit fields while preserving host-process records.

## 2. Operational integration

- [ ] 2.1 Update `deployment-checklist.md` and Docker evals with post-health latest update and latest-only rejection cases.
- [ ] 2.2 Synchronize source/registered Skill, update main OpenSpec specs and perform consistency audit for tag/digest/alias/retention/rollback rules.

## 3. Verification and delivery

- [ ] 3.1 Run OpenSpec, schema, JSON/YAML, shell and source/registered parity checks; commit, merge into `master`, archive the change, remove this worktree/branch and verify integration.
