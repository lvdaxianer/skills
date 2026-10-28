# Service Deployment Lifecycle Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让服务部署 Skill 同时支持 systemd、手动前台和手动后台启动方式，并明确每种方式加载 `knowledge-runtime.env`、停止服务和执行健康检查的责任。

**Architecture:** 保持版本发布和 `current` 切换为公共流程，新增生命周期适配层。`lifecycle.mode` 选择 systemd、manual-foreground 或 manual-background；模式只决定启停和 env 加载，不改变发布、校验、回滚和保留规则。

**Tech Stack:** Markdown、JSON、Shell 只读校验、OpenSpec。

---

## Files and responsibilities

- Modify: `service-deploy/SKILL.md` — 加入生命周期模式选择和执行规则。
- Create: `service-deploy/references/lifecycle-modes.md` — 三种模式、env 加载和停止安全边界。
- Modify: `service-deploy/references/deployment-checklist.md` — 加入模式选择和人工确认门。
- Modify: `service-deploy/references/knowledge-app-example.md` — 记录实际 systemd 与直接 Shell 的差异。
- Modify: `service-deploy/evals/evals.json` — 加入 systemd、手动前台、无 PID 文件和后台停止评测。
- Modify: `/Users/lvdaxianer/.codex/skills/service-deployment/` — 同步本地注册版本。
- Create: `openspec/changes/service-deployment-lifecycle-modes/` — 本次规格、设计和任务追踪。

## Task 1: Update lifecycle documentation and local registration

**Files:**

- Modify: `service-deploy/SKILL.md`
- Create: `service-deploy/references/lifecycle-modes.md`
- Modify: `service-deploy/references/deployment-checklist.md`
- Modify: `service-deploy/references/knowledge-app-example.md`
- Modify: `service-deploy/evals/evals.json`
- Modify: `/Users/lvdaxianer/.codex/skills/service-deployment/SKILL.md`
- Modify: `/Users/lvdaxianer/.codex/skills/service-deployment/references/*`
- Modify: `/Users/lvdaxianer/.codex/skills/service-deployment/evals/evals.json`

- [ ] **Step 1: Run the RED documentation check**

  Run:

  ```bash
  test -f service-deploy/references/lifecycle-modes.md
  ```

  Expected: exit 1 because the lifecycle reference has not been added.

- [ ] **Step 2: Add lifecycle mode guidance**

  Add the three modes, their start/stop/status/health responsibilities, the systemd `EnvironmentFile` path, the explicit Shell env-loading rule, foreground `Ctrl+C` behavior, optional PID files, and the prohibition on broad process killing. Link the new reference from `SKILL.md` and make the directory tree show outer `bin/`, version `bin/conf/lib`, `current`, and external `conf/`.

- [ ] **Step 3: Update the operational checklist and example**

  Require `lifecycle.mode` before any start/stop action. For `manual-foreground`, output a command and wait for operator confirmation before health validation. For `manual-background`, require an exact stop contract. In the knowledge-app example, document that outer `bin/start.sh` delegates to systemd while direct `current/bin/start.sh` does not automatically load the external env file.

- [ ] **Step 4: Update evals and run GREEN checks**

  Add at least three evals with expectations for systemd EnvironmentFile, manual foreground without PID file, and manual background safe stop. Run:

  ```bash
  python /Users/lvdaxianer/.codex/skills/skill-creator/scripts/quick_validate.py service-deploy
  python -m json.tool service-deploy/evals/evals.json >/dev/null
  node -e 'const x=require("./service-deploy/evals/evals.json"); if(x.skill_name!=="service-deployment-standard"||x.evals.length<3) process.exit(1); for(const e of x.evals) if(!e.expectations?.length) process.exit(1)'
  rg -n 'systemd|manual-foreground|manual-background|EnvironmentFile|knowledge-runtime\\.env|Ctrl\\+C|PID|killall' service-deploy
  ! rg -n 'KNOWLEDGE_[A-Z0-9_]+=.+|API_KEY=.+|PASSWORD=.+|SECRET=.+|-----BEGIN .*PRIVATE KEY-----' service-deploy
  ```

  Expected: all commands pass and no concrete secret values are found.

- [ ] **Step 5: Sync and validate the local registration**

  Copy the updated source package into `/Users/lvdaxianer/.codex/skills/service-deployment`, preserve local frontmatter `name: service-deployment`, update local `evals.json` to `skill_name: service-deployment`, then run:

  ```bash
  python /Users/lvdaxianer/.codex/skills/skill-creator/scripts/quick_validate.py /Users/lvdaxianer/.codex/skills/service-deployment
  test -f /Users/lvdaxianer/.codex/skills/service-deployment/references/lifecycle-modes.md
  rg -n 'manual-foreground|EnvironmentFile|Ctrl\\+C|knowledge-runtime\\.env' /Users/lvdaxianer/.codex/skills/service-deployment
  ```

  Expected: local validation passes and the registered copy contains the new lifecycle guidance.

- [ ] **Step 6: Validate OpenSpec and final documentation state**

  Run:

  ```bash
  openspec validate service-deployment-lifecycle-modes --strict
  git diff --check
  ```

  Expected: strict OpenSpec validation and whitespace checks pass.

- [ ] **Step 7: Commit the change**

  Review the diff for scope, confirm no remote files or secret values changed, then commit with a Chinese Conventional Commit referencing `OpenSpec service-deployment-lifecycle-modes task 1.1`.

## Self-review

- Every lifecycle requirement maps to `SKILL.md`, `lifecycle-modes.md`, the checklist, or the example.
- Systemd and manual Shell modes share the same release and rollback flow.
- Manual foreground mode never requires a PID file and never uses broad process termination.
- The local registered copy retains `name: service-deployment` while the repository source retains its existing package path.
