# Tasks

## 1. Dockerfile standard reference

- [x] 1.1 Add `references/dockerfile-standard.md` with reproducible build, runtime layout, non-root, entrypoint, healthcheck, resource completeness and forbidden runtime download/install rules.
- [x] 1.2 Update `references/docker-deployment.md` with Dockerfile build gates, egress-restricted startup and failure behavior while preserving declared business dependency access.

## 2. Skill integration

- [x] 2.1 Update `SKILL.md`, `deployment-checklist.md`, `artifact-and-config-security.md` and `docker-compose.template.yaml` with Dockerfile routing and offline startup acceptance.
- [ ] 2.2 Add Dockerfile/offline-download eval cases and verify all references agree on runtime target, overlay, image digest and lifecycle behavior.

## 3. Verification and delivery

- [ ] 3.1 Validate OpenSpec, Markdown/YAML/JSON syntax, source/registered skill parity and forbidden runtime-download coverage.
- [ ] 3.2 Perform final consistency audit, synchronize approved specs, commit, merge into `master`, archive the change, remove only this task worktree/branch and verify the integration branch.
