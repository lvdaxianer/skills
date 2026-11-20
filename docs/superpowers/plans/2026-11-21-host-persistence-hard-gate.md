# 宿主持久化与镜像默认资源覆盖硬门禁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Docker 与 Kubernetes 部署建立逐项资源确认、宿主机/PVC 持久化、镜像默认回退和未满足即停止的可验证硬门禁。

**Architecture:** 包 manifest 先声明默认资源目录；部署前生成客户确认表。Docker 将确认项解析为服务根目录下的绝对宿主机路径，Kubernetes 将确认项解析为现有 PVC/PV，所有代码/配置覆盖都挂载到独立 extension point，镜像默认资源始终保留。schema、只读合同检查和 operator 文档共同阻止未确认资源、容器 writable layer 唯一持久化、`hostPath` 降级和覆盖镜像根目录。

**Tech Stack:** Markdown skill 文档、JSON Schema Draft 2020-12、YAML 示例、Bash 合同测试、Python 标准库 JSON 校验、OpenSpec。

---

### Task 1: 固化设计与 OpenSpec 约束

**Files:**
- Create: `docs/superpowers/specs/2026-11-21-host-persistence-hard-gate-design.md`
- Create: `docs/superpowers/plans/2026-11-21-host-persistence-hard-gate.md`
- Modify: `openspec/changes/standardize-docker-persistence-overrides/proposal.md`
- Modify: `openspec/changes/standardize-docker-persistence-overrides/design.md`
- Modify: `openspec/changes/standardize-docker-persistence-overrides/tasks.md`
- Modify: `openspec/changes/standardize-docker-persistence-overrides/specs/service-deployment-docker-runtime/spec.md`
- Modify: `openspec/changes/standardize-docker-persistence-overrides/specs/service-deployment-dockerfile/spec.md`

- [x] **Step 1: 写入设计和 OpenSpec 变化**

设计必须明确默认资源确认表、Docker 绝对宿主机路径、Kubernetes 现有 PVC/PV、代码/配置镜像回退、数据外部持久化、独立 extension point 和缺失即 dry-run/停止。

- [x] **Step 2: 检查设计一致性**

```bash
rg -n "PVC|PV|hostPath|persistence|frontend|backend|lib|conf|object-storage|未确认|dry-run" docs/superpowers/specs/2026-11-21-host-persistence-hard-gate-design.md openspec/changes/standardize-docker-persistence-overrides
```

预期：设计、提案、delta spec 和任务列表使用同一资源分类及失败门禁。

- [ ] **Step 3: 提交设计基线**

```bash
git add docs/superpowers/specs/2026-11-21-host-persistence-hard-gate-design.md docs/superpowers/plans/2026-11-21-host-persistence-hard-gate.md openspec/changes/standardize-docker-persistence-overrides
git commit -m "📝 docs: 固化宿主持久化硬门禁设计"
```

预期：任务分支产生一个只包含设计/OpenSpec/计划的提交。

### Task 2: RED — 为 schema 和合同测试写失败用例

**Files:**
- Modify: `service-deploy/tests/test-foolproof-delivery.sh`
- Create: `service-deploy/tests/test-persistence-hard-gate.sh`

- [ ] **Step 1: 写入失败断言**

测试必须覆盖以下输入并在实现前失败：

```text
1. package manifest 缺少 persistence_resources -> 拒绝
2. 默认资源存在但 confirmation.status=unconfirmed -> 拒绝
3. Docker persistence target 使用相对路径 -> 拒绝
4. Kubernetes persistence target 使用 hostPath -> 拒绝
5. Kubernetes PVC 未声明 bound/现有状态 -> 拒绝
6. 挂载到 /app/lib、/app/html、/app/bin 或 entrypoint -> 拒绝
7. 完整 Docker host path + 完整 K8s PVC/PV + 空 override 目录 -> 通过
8. 资源为 external-managed 且有 owner/evidence/recovery -> 通过
```

- [ ] **Step 2: 运行 RED**

```bash
bash service-deploy/tests/test-persistence-hard-gate.sh
```

预期：至少一个新增场景失败，原因是 schema/合同字段尚未实现，而不是测试脚本语法错误。

### Task 3: GREEN — 扩展机器可读 schema 与模板

**Files:**
- Modify: `service-deploy/references/deployment-package-manifest.schema.json`
- Modify: `service-deploy/references/docker-persistence-manifest.schema.json`
- Modify: `service-deploy/references/docker-release-manifest.schema.json`
- Modify: `service-deploy/references/docker-compose.template.yaml`
- Create: `service-deploy/references/kubernetes-persistence.md`

- [ ] **Step 1: 增加资源确认模型**

加入 `persistence_resources`、`resource_class`、`default_in_image`、`persistence_decision`、`host_path`、`pvc`、`container_path`、`read_only`、`override_allowed`、`backup`、`restore_procedure` 和 `confirmation`；资源分类至少覆盖 `frontend`、`backend`、`lib`、`conf`、`database`、`object-storage`、`data`、`logs`、`index`、`extension`。

- [ ] **Step 2: 增加模式条件**

```text
docker -> persistence_decision=host-persistent 时必须是绝对 host_path
kubernetes -> persistence_decision=cluster-persistent 时必须是 PVC/PV 声明且禁止 hostPath
external-managed -> 必须有 owner、endpoint_ref（非敏感引用）和 recovery_evidence
所有项 -> confirmation.status=confirmed 且有 confirmer/confirmed_at/record_path
```

- [ ] **Step 3: 增加 Compose 和 Kubernetes 文档示例**

Compose 展示前端、后端、`lib`、`conf` 的独立只读扩展挂载及数据库/对象存储独立可写挂载；Kubernetes 文档展示 PVC/PV、StorageClass、绑定检查和停止条件，不提供 `hostPath` 降级例子。

- [ ] **Step 4: 运行 GREEN**

```bash
python3 -m json.tool service-deploy/references/deployment-package-manifest.schema.json >/dev/null
python3 -m json.tool service-deploy/references/docker-persistence-manifest.schema.json >/dev/null
python3 -m json.tool service-deploy/references/docker-release-manifest.schema.json >/dev/null
bash service-deploy/tests/test-persistence-hard-gate.sh
```

预期：新增测试全部通过。

### Task 4: 更新执行规则、文档与只读检查器

**Files:**
- Modify: `service-deploy/SKILL.md`
- Modify: `service-deploy/references/deployment-package.md`
- Modify: `service-deploy/references/deployment-preflight-matrix.md`
- Modify: `service-deploy/references/deployment-handbook.md`
- Modify: `service-deploy/references/deployment-checklist.md`
- Modify: `service-deploy/references/docker-deployment.md`
- Modify: `service-deploy/references/dockerfile-standard.md`
- Modify: `service-deploy/references/rollback-state-machine.md`
- Modify: `service-deploy/scripts/package-contract-test.sh`
- Modify: `service-deploy/evals/evals.json`

- [ ] **Step 1: 在总规则建立硬门禁**

明确“先逐项确认资源，再做任何 stop/write/container/Pod 操作”；Docker 只接受客户确认绝对路径；Kubernetes 只接受现有 PVC/PV，缺失立即停止；默认资源留在镜像，覆盖目录为空时回退镜像。

- [ ] **Step 2: 补齐零经验实施手册**

在 `doctor.sh` 输出中加入默认资源确认表、模式对应持久化目标、挂载读写属性、备份恢复和明确停止原因；实施人员不手改 YAML/JSON。

- [ ] **Step 3: 扩展只读合同检查**

检查 package/release/persistence manifest 的资源确认、Docker 路径边界、Kubernetes PVC/PV 与 `hostPath` 禁止项、覆盖根目录禁止项；不得连接服务器或写入部署目录。

- [ ] **Step 4: 运行脚本和文档测试**

```bash
bash -n service-deploy/scripts/package-contract-test.sh
bash -n service-deploy/tests/test-foolproof-delivery.sh
bash -n service-deploy/tests/test-persistence-hard-gate.sh
bash service-deploy/tests/test-foolproof-delivery.sh
bash service-deploy/tests/test-persistence-hard-gate.sh
```

预期：脚本语法通过，原有零经验交付测试与新增硬门禁测试均通过。

### Task 5: 审计、同步、提交与集成

**Files:**
- Modify: `service-deploy/evals/evals.json`
- Modify: `openspec/specs/service-deployment-docker-runtime/spec.md`
- Modify: `openspec/specs/service-deployment-dockerfile/spec.md`
- Create: `openspec/specs/service-deployment-persistence-gate/spec.md`

- [ ] **Step 1: 执行 OpenSpec 和 JSON 审计**

```bash
openspec validate standardize-docker-persistence-overrides --strict
python3 -m json.tool service-deploy/evals/evals.json >/dev/null
rg -n "hostPath|/app/lib|/app/html|/app/bin|PVC|persistence_resources|unconfirmed" service-deploy openspec/specs
```

预期：OpenSpec 严格校验通过；危险挂载只出现在明确的禁止/失败场景说明中。

- [ ] **Step 2: 运行代码审查和完整验证**

```bash
git diff --check
bash service-deploy/tests/test-foolproof-delivery.sh
bash service-deploy/tests/test-persistence-hard-gate.sh
```

预期：无空白错误、无敏感信息、所有测试通过；审查报告确认没有把 Kubernetes `hostPath` 当作默认方案。

- [ ] **Step 3: 同步现有本地 skill root**

```bash
repo="$PWD/service-deploy"
for dest in /Users/lvdaxianer/.agents/skills/service-deploy /Users/lvdaxianer/.claude/skills/service-deploy /Users/lvdaxianer/.codex/skills/service-deploy; do
  rsync -a "$repo/" "$dest/"
done
```

预期：三个已存在目录与仓库内容 `diff -qr` 无差异；不创建不存在的其他 root。

- [ ] **Step 4: 提交并合并**

```bash
git add service-deploy openspec docs/superpowers
git commit -m "✨ feat(service-deploy): 增加宿主持久化硬门禁"
git -C "$SOURCE_CHECKOUT" merge --no-ff features/✅CHG-005-T1--宿主持久化硬门禁
git -C "$SOURCE_CHECKOUT" merge-base --is-ancestor features/✅CHG-005-T1--宿主持久化硬门禁 master
git -C "$SOURCE_CHECKOUT" push
```

预期：`master` 包含本次 change，远端同步，任务 worktree 干净后安全删除。
