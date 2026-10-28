# Service Deployment Standard Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个可复用的服务部署 Skill，统一版本目录、current 软链接、外置配置、服务生命周期、回滚和默认保留 5 个版本的标准。

**Architecture:** `service-deploy/SKILL.md` 只保留触发条件、参数、决策顺序和安全边界；目录布局、命名保留、操作清单和 `knowledge-app` 参考放入 `references/`，评测输入放入 `evals/evals.json`。Skill 描述命令编排，不绑定 systemd 或单一部署根目录。

**Tech Stack:** Markdown、JSON、Shell 只读校验命令、OpenSpec。

---

## Files and responsibilities

- Create: `service-deploy/SKILL.md` — Skill 元数据、触发范围、标准流程和输出报告格式。
- Create: `service-deploy/references/release-layout.md` — 默认/自定义部署根目录、目录布局和配置隔离。
- Create: `service-deploy/references/release-naming-and-retention.md` — 版本 ID、无提交回退、序号持久化、保留和清理规则。
- Create: `service-deploy/references/deployment-checklist.md` — 预检、准备、切换、启动、健康检查、回滚和发布记录清单。
- Create: `service-deploy/references/knowledge-app-example.md` — 由远程只读核验得到的脱敏参考案例。
- Create: `service-deploy/evals/evals.json` — 触发后应遵守的三组现实任务提示和预期输出。
- Create: `docs/superpowers/specs/2026-10-28-service-deployment-standard-design.md` — 已确认的设计记录。
- Create: `docs/superpowers/plans/2026-10-28-service-deployment-standard.md` — 本实施计划。
- Create: `openspec/changes/service-deploy-standard/` — proposal、spec、design、tasks 及后续验证记录。

## Task 1: Create and verify the Skill package

**Files:**

- Create: `service-deploy/SKILL.md`
- Create: `service-deploy/references/release-layout.md`
- Create: `service-deploy/references/release-naming-and-retention.md`
- Create: `service-deploy/references/deployment-checklist.md`
- Create: `service-deploy/references/knowledge-app-example.md`
- Create: `service-deploy/evals/evals.json`

- [ ] **Step 1: Define the focused documentation check before implementation**

  The check must prove that the package contains valid YAML frontmatter, all referenced files exist, the Skill names `/opt` as the default while accepting a custom root, does not require systemd, defines the exact release name shape and `manual` fallback, defines service-local sequence numbers and default retention of 5, and includes rollback plus secret-value exclusion.

- [ ] **Step 2: Run the focused check against the absent package**

  Run:

  ```bash
  test -f service-deploy/SKILL.md
  ```

  Expected: `test` fails because the Skill package has not been created yet. This is the RED evidence for the documentation task.

- [ ] **Step 3: Create the Skill and reference files**

  Write the Skill with imperative instructions and progressive disclosure. The main file must direct the reader to the relevant reference files before operating on a host, require a dry-run/confirmation for destructive cleanup, prohibit exposing secret values, and emit a deployment report containing target path, release ID, old/current pointers, validation result, and rollback result.

  The references must document these exact examples:

  ```text
  /opt/<service-name>/releases/<release-id>
  /uinnova/deploy/<service-name>/releases/<release-id>
  <service-name>-<YYYYMMDDHHmmss>-<git-short-sha>-<number>
  <service-name>-<YYYYMMDDHHmmss>-<package-version>-<number>
  <service-name>-<YYYYMMDDHHmmss>-manual-<number>
  ```

  They must state that the number is service-local, three-digit zero-padded, monotonic, and never reused; default retention is five verified releases with current, previous, failed/unverified, and active releases protected.

- [ ] **Step 4: Run the focused check to verify the package**

  Run:

  ```bash
  test -f service-deploy/SKILL.md
  test -f service-deploy/references/release-layout.md
  test -f service-deploy/references/release-naming-and-retention.md
  test -f service-deploy/references/deployment-checklist.md
  test -f service-deploy/references/knowledge-app-example.md
  test -f service-deploy/evals/evals.json
  rg -n '/opt|/uinnova/deploy|current|systemd|manual|保留.*5|5.*版本|回滚|敏感|secret' service-deploy
  ! rg -n 'KNOWLEDGE_[A-Z0-9_]+=.+|API_KEY=.+|PASSWORD=.+|SECRET=.+|token:.+' service-deploy
  ```

  Expected: all file checks and the rule search pass; the secret-value search returns no matches.

- [ ] **Step 5: Validate the eval schema and OpenSpec**

  Run:

  ```bash
  node -e 'const x=require("./service-deploy/evals/evals.json"); if(x.skill_name!=="service-deployment-standard" || !Array.isArray(x.evals) || x.evals.length<3) process.exit(1); for(const e of x.evals) if(!e.id || !e.prompt || !e.expected_output || !Array.isArray(e.files)) process.exit(1)'
  openspec validate service-deploy-standard --strict
  ```

  Expected: the JSON check exits 0 and OpenSpec reports no strict validation errors.

- [ ] **Step 6: Run broader documentation verification**

  Run:

  ```bash
  git diff --check
  rg -n '^---$|^name:|^description:' service-deploy/SKILL.md
  git ls-files --others --exclude-standard service-deploy docs/superpowers openspec/changes/service-deploy-standard
  ```

  Expected: no whitespace errors; frontmatter markers and metadata exist; only intended documentation files are listed.

- [ ] **Step 7: Review the final diff and commit the task**

  Confirm every OpenSpec requirement has a corresponding Skill instruction or reference section, the package contains no server secrets, and no remote files changed. Then commit with a Chinese Conventional Commit containing a non-empty body and footer referencing `OpenSpec service-deploy-standard task 1.1`.

## Self-review

- Spec coverage: the seven OpenSpec requirements map to the five reference files and the main Skill workflow.
- Placeholder scan: no `TBD`, `TODO`, or implementation placeholders are allowed in the final Skill or plan.
- Consistency: all examples use the same `service-root = deploy_root/service_name` model and the same four-part release ID.
