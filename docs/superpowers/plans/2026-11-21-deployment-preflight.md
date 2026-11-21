# Deployment Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将一键部署的端口、空间/inode、权限和扩展运行环境检查统一为可机器校验、可脱敏审计、失败即停止的 preflight 契约。

**Architecture:** package manifest 声明检查契约；package contract test 验证静态字段；doctor 在目标机执行只读动态检查并生成绑定报告；deploy 在任何变更动作前验证报告。现有 release、持久化和模式生命周期规则保持不变。

**Tech Stack:** JSON Schema、Bash、Python 标准库、OpenSpec、Markdown。

---

### Task 1: Add the manifest preflight contract

**Files:**
- Modify: `service-deploy/references/deployment-package-manifest.schema.json`
- Modify: `service-deploy/scripts/package-contract-test.sh`
- Create: `service-deploy/tests/test-preflight-contract.sh`

- [ ] **Step 1: Write the failing contract tests**

  Add scenarios for a complete preflight section, missing port/storage/permission declarations, non-positive byte/inode thresholds, unsupported check names, unsafe path references, and missing mode-specific checks.

- [ ] **Step 2: Run the focused test and verify RED**

  Run `./service-deploy/tests/test-preflight-contract.sh` from the worktree root. It must fail because the manifest schema and package checker do not yet require the new contract.

- [ ] **Step 3: Implement the minimum schema and checker changes**

  Add the `preflight` object and its definitions to the manifest schema. Extend the package checker with non-sensitive validation of required checks, port fields, storage thresholds/path references, permission targets and supported-mode coverage.

- [ ] **Step 4: Run the focused test and verify GREEN**

  Run `./service-deploy/tests/test-preflight-contract.sh`; expect all valid scenarios to pass and all invalid scenarios to be rejected without printing manifest values.

### Task 2: Update the operational contract and references

**Files:**
- Modify: `service-deploy/SKILL.md`
- Modify: `service-deploy/references/deployment-preflight-matrix.md`
- Modify: `service-deploy/references/deployment-package.md`
- Modify: `service-deploy/references/deployment-handbook.md`
- Modify: `service-deploy/references/deployment-checklist.md`

- [ ] **Step 1: Add the fail-closed rules**

  Document the three layers, required checks, report binding, stale-report rejection, non-destructive remediation boundary and exact stop actions before any write/stop/container/Pod/current switch.

- [ ] **Step 2: Run reference assertions**

  Run `./service-deploy/tests/test-foolproof-delivery.sh` and confirm it checks the new preflight references and schema fields.

### Task 3: Expand regression coverage and audit

**Files:**
- Modify: `service-deploy/tests/test-foolproof-delivery.sh`
- Modify: `service-deploy/evals/evals.json`

- [ ] **Step 1: Add end-to-end contract assertions**

  Assert that the package contract test, preflight matrix, handbook and skill all mention port conflicts, disk/inode capacity, permissions, report binding and no automatic destructive remediation.

- [ ] **Step 2: Run broader verification**

  Run `./service-deploy/tests/test-foolproof-delivery.sh`, `./service-deploy/tests/test-persistence-hard-gate.sh`, `./service-deploy/tests/test-preflight-contract.sh`, `bash -n service-deploy/scripts/package-contract-test.sh`, `python3 -m json.tool service-deploy/references/deployment-package-manifest.schema.json`, and `openspec validate standardize-deployment-preflight --strict`.

- [ ] **Step 3: Perform the consistency audit**

  Compare the implementation against the proposal, three delta specs, design, task checklist and acceptance criteria. Confirm no customer host is contacted and no secret value is printed.

### Task 4: Commit and integrate

**Files:**
- All files listed above plus the OpenSpec and design/plan documents.

- [ ] **Step 1: Run the full verification gate**

  Re-run all focused and broader commands from a clean task worktree and inspect `git diff --check` and `git diff`.

- [ ] **Step 2: Commit the atomic change**

  Use the required Chinese Conventional Commit full format with `Refs: OpenSpec standardize-deployment-preflight task T1`.

- [ ] **Step 3: Merge and verify ancestry**

  Merge the task branch into the recorded `master` integration branch with `--no-ff`, verify ancestry, then remove only the clean task worktree and task branch.
