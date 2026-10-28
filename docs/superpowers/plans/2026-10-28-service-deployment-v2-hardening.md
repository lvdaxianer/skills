# Service Deployment v2 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 service-deployment Skill 升级为可验证、可恢复、可审计的 v2，并同步仓库源与本地注册副本。

**Architecture:** 主 Skill 负责路由和硬性门禁；references 分别负责路径/命名、artifact/env 安全、生命周期/健康、状态机、stack/恢复和 checklist。JSON Schema 与两个 Shell 脚本提供确定性验证，不接触真实服务器。

**Tech Stack:** Markdown、POSIX/Bash shell、JSON Schema、Python/Node 本地校验工具、OpenSpec CLI。

---

### Task 1: 建立 v2 规范与 OpenSpec 契约

**Files:**
- Create: `openspec/changes/service-deployment-v2-hardening/proposal.md`
- Create: `openspec/changes/service-deployment-v2-hardening/specs/service-deployment-standard/spec.md`
- Create: `openspec/changes/service-deployment-v2-hardening/specs/service-deployment-v2-hardening/spec.md`
- Create: `openspec/changes/service-deployment-v2-hardening/design.md`
- Create: `openspec/changes/service-deployment-v2-hardening/tasks.md`
- Create: `docs/superpowers/specs/2026-10-28-service-deployment-v2-design.md`
- Create: `docs/superpowers/plans/2026-10-28-service-deployment-v2-hardening.md`

- [x] **Step 1: 写入并校验 proposal、design、delta specs 和 tasks**
- [x] **Step 2: 运行 `openspec validate service-deployment-v2-hardening --strict` 并修复所有错误**

### Task 2: 重写主 Skill 与发布路径/命名规范

**Files:**
- Modify: `service-deploy/SKILL.md`
- Modify: `service-deploy/references/release-layout.md`
- Modify: `service-deploy/references/release-naming-and-retention.md`

- [x] **Step 1: 写入明确输入、release ID 正则、序列锁状态和物理路径门禁**
- [x] **Step 2: 写入状态机入口、失败行为、retention 命令和 report/schema 路由**
- [x] **Step 3: 运行 Markdown/link/术语检查，确认三种 lifecycle mode 和 `<service-name>-<YYYYMMDDHHmmss>-<version-or-git-short-sha>-<three-digit-sequence>` 全文一致**

### Task 3: 增加 artifact、env 和生命周期安全 references

**Files:**
- Create: `service-deploy/references/artifact-and-config-security.md`
- Modify: `service-deploy/references/lifecycle-modes.md`
- Modify: `service-deploy/references/deployment-checklist.md`

- [x] **Step 1: 写归档 checksum/tar 安全、权限、必需文件和配置覆盖边界**
- [x] **Step 2: 写受限 env parser/source 边界、manual-background 进程身份和中断清理契约**
- [x] **Step 3: 写 preflight/prepare/switch 的可执行命令与失败行为**

### Task 4: 增加数据库、健康检查、状态机和恢复规则

**Files:**
- Create: `service-deploy/references/database-and-health.md`
- Create: `service-deploy/references/rollback-state-machine.md`
- Create: `service-deploy/references/stack-and-recoverability.md`
- Modify: `service-deploy/references/deployment-checklist.md`
- Modify: `service-deploy/references/knowledge-app-example.md`

- [x] **Step 1: 定义 migration gate、Flyway、expand/contract 和不可逆迁移审批**
- [x] **Step 2: 定义 status/readiness/liveness、依赖、代理、业务 smoke 和 loaded artifact 验收**
- [x] **Step 3: 定义状态流转、SSH reconcile、stack 发布顺序和服务恢复性**

### Task 5: 增加 release record schema、contract test 与 retention 执行器

**Files:**
- Create: `service-deploy/references/release-record.schema.json`
- Create: `service-deploy/scripts/current-contract-test.sh`
- Create: `service-deploy/scripts/retention.sh`
- Modify: `service-deploy/evals/evals.json`

- [x] **Step 1: 先写脚本失败测试输入，再实现路径 contract test**
- [x] **Step 2: 先写 retention preview/apply 安全测试，再实现精确删除集合**
- [x] **Step 3: 用 JSON Schema 验证 success、rollback、failed record 示例结构，并扩充 evals**

### Task 6: 同步注册副本并完成审计

**Files:**
- Sync: `service-deploy/**` → `/Users/lvdaxianer/.codex/skills/service-deployment/**`

- [x] **Step 1: 运行 Skill validator、脚本自测、schema 校验、OpenSpec strict validation**
- [x] **Step 2: 做主 Skill/references 一致性矩阵和 SceneForge 问题映射表**
- [ ] **Step 3: 修复发现项，提交、合并到 master、验证远端并 push**
