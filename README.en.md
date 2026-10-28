# lvdaxianer-skills

> A **Claude Code** skill collection for engineering standards, covering development workflow, code review, REST API documentation, backend reliability, frontend interaction, production logging, DDD architecture, and task closeout auditing. All skills are **guaranteed non-conflicting** with explicit cross-references.

**Language**: [中文](./README.md) · **English**

---

## Table of Contents

- [What Is This](#what-is-this)
- [Twelve Skills at a Glance](#twelve-skills-at-a-glance)
- [Relationships & Priority](#relationships--priority)
- [Development Workflow Explained](#development-workflow-explained)
- [Installation](#installation)
- [Usage](#usage)
- [Directory Structure](#directory-structure)
- [Conflict Resolution Principle](#conflict-resolution-principle)
- [Contributing](#contributing)

---

## What Is This

A **Claude Code Skills** repository. Each subdirectory is an independently installable skill that Claude Code loads on demand. The philosophy is "red lines + deep references":

- **Red lines**: literal, mechanically-checkable rules (method ≤20 lines, no hardcoded `@author` in new code, every log line carries `traceId`, etc.)
- **Deep references**: when a rule crosses domains, only the authoritative skill defines it in detail; the others cite it without restating

Goal: whether Claude Code is doing backend, frontend, review, logging, or DDD work, it loads the right skill and gives consistent output — no more "rule X in skill A contradicts rule Y in skill B".

---

## Twelve Skills at a Glance

| Skill | Role | Trigger |
|------|------|---------|
| [`development-workflow`](./development-workflow/SKILL.md) | **Entry skill**: enforces the fixed loop "brainstorm → confirm integration branch and task worktree → OpenSpec → task boundary/dispatch → TDD RED/GREEN → REST API documentation gate when applicable → audit/review → per-task commit and merge → archive" | Any task involving code, tests, docs, config, refactoring, or commits |
| [`git-branch-worktree-convention`](./git-branch-worktree-convention/SKILL.md) | **Git branch & worktree conventions**: confirm one integration branch first, then use emoji-prefixed task branches (✅), Chinese descriptions, SOURCE_BRANCH recording, and original-checkout write isolation | Task branch creation, worktree setup, branch validation, task merge to the integration branch |
| [`commit`](./commit/SKILL.md) | **Commit standard**: Chinese Conventional Commit + emoji prefix + mandatory body/footer | Creating commits, generating commit messages, `/commit` command |
| [`code-review-spec`](./code-review-spec/spec.md) | **Code-level red lines**: `@author`, method length, comment ratio, naming, if-else annotations, exception handling, logging, SQL, git commit format — language-agnostic | Code changes, PR reviews, explicit `/code-review-spec` |
| [`backend-reliability-guidelines`](./backend-reliability-guidelines/SKILL.md) | **System-level reliability**: idempotency, transactions, concurrency, migrations, environment isolation, fail-fast, error contracts, business audit, observability | Backend APIs, services, jobs, queues, webhooks, migrations, config changes |
| [`frontend-interaction-guidelines`](./frontend-interaction-guidelines/SKILL.md) | **Frontend interaction quality**: submit/delete/pay deduplication, revertible optimistic updates, consistent loading/empty/error/disabled/offline/permission states, destructive-action confirmation | Web/mobile pages, forms, modals, lists, editors, workflows |
| [`logging-boundaries`](./logging-boundaries/SKILL.md) | **Production log discipline**: Actuator hot-toggle, level semantics, mandatory traceId, PII masking, MDC cross-thread propagation, scenario-scoped loading (HTTP/scheduled-job/MQ/AOP/async) | Backend logs, traceId, MDC, `log.info/debug/warn/error` |
| [`ddd`](./ddd/SKILL.md) | **DDD architecture**: Bounded Context, Ubiquitous Language, Entity/VO/Aggregate/Domain Event/Repository/Factory, four-layer architecture, anti-pattern detection | Domain modeling, aggregate boundary discussions, CQRS/event sourcing |
| [`rest-api-documentation`](./rest-api-documentation/SKILL.md) | **REST API documentation**: maintain one `apis/<module>.md` per business module for external Controllers; endpoint purpose, method/URL, params, requestBody, request/response headers and cookies, status codes, errors, and complete integration examples | Creating, completing, standardizing, or reviewing REST API documentation; adding or modifying external Controller/API routes |
| [`project-hygiene`](./project-hygiene/SKILL.md) | **Project baseline hygiene**: detection-driven, idempotent maintenance of four baseline files via managed blocks — .gitignore (artifacts, AI tool dirs, editor dirs, secret leak prevention), .gitattributes (EOL, binaries, lockfile merges), .editorconfig (cross-IDE format baseline), .env.example (env var contract sync) | Project init, build manifests added/removed, new tool/artifact/binary files, CRLF pollution, new env var references, baseline files out of sync |
| [`project-context-sync`](./project-context-sync/SKILL.md) | **Project startup context sync**: maintains a committed `.project-context/` source and idempotently generates Agent startup files for `.claude`, `.codex`, `.kimi`, while rejecting absolute paths and sensitive values | Initializing project context, recording project conventions, restoring Agent setup after cloning, syncing multiple AI tools |
| [`task-closeout-audit`](./task-closeout-audit/SKILL.md) | **Task closeout audit**: verify merge evidence and automatically clean proven-merged, safe task branches/worktrees while preserving unknown, unmerged, dirty, locked, and orphan resources | Explicit `/task-closeout-audit` invocation |

---

## Relationships & Priority

```
development-workflow  (entry, mandatory loop)
    ├── branch, worktree & per-task integration → git-branch-worktree-convention
    ├── commit standard → commit
    ├── review phase → code-review-spec
    │       ├── logging red lines   → delegates to logging-boundaries
    │       ├── reliability red lines → delegates to backend-reliability-guidelines
    │       └── frontend red lines  → delegates to frontend-interaction-guidelines
    ├── external Controller/API route documentation gate → rest-api-documentation
    ├── DDD architecture tasks → ddd
    └── project init & baseline file sync → project-hygiene
```

**Priority rules**:

1. The authoritative skill for a domain wins (e.g. anything log-related defers to `logging-boundaries`)
2. `code-review-spec` covers only code-level red lines; anything cross-domain is handed off
3. Language-specific rules override generic rules

See each skill's "Skill Conflict Resolution" section for the full table.

---

## Development Workflow Explained

`development-workflow` is the only **process orchestration skill** in this repository. It chains together the 10 companion local skills and external superpowers, OpenSpec, and `using-git-worktrees` suites. Unlike other skills, it does not define concrete standards — it only schedules which skill to invoke at which stage of the 26-step task loop.

**Key characteristics**:
- Composite skill: 11 local skills including the entry skill, plus external dependency suites
- Process-only: defines "when to call which skill", not "what that skill's rules are"
- Mandatory loop: brainstorm → confirm integration branch, create task branch/worktree (with `project-hygiene` baseline check) → OpenSpec → task boundary and dispatch → TDD → update `apis/<module>.md` for affected external Controller/API routes → verification/audit/review → commit (with secret/artifact leak check) → merge to `SOURCE_BRANCH` and clean up → final audit/archive
- Integration model: one change confirms one integration branch. Each independently verifiable task starts from it in its own branch and worktree, then merges back after verification. No parent branch aggregates task branches.
- Explicit opt-outs: "**不要 OpenSpec**" skips all OpenSpec stages; "**不要分支**" edits directly on the current branch with no task branch/worktree; "**不要 workflow**" disables the whole workflow. Opt-outs take effect only when the user states them explicitly in the current conversation, and they compose (see "Explicit User Opt-Outs" in `development-workflow/SKILL.md`)

**Detailed guide**: [DEVELOPMENT_WORKFLOW_GUIDE.md](./DEVELOPMENT_WORKFLOW_GUIDE.md) covers:
- Local bundled vs external dependencies checklist
- Complete dependency tree & installation verification
- Auto-trigger vs explicit invocation
- FAQ (skip OpenSpec, review-only, offline install, etc.)
- Troubleshooting checklist

---

## Installation

### Option 1: Claude Code project-level skills (recommended)

Claude Code auto-discovers skills under `~/.claude/skills/` (global) or `.claude/skills/` (per-project).

```bash
# Global install (applies to every project)
mkdir -p ~/.claude/skills
cp -R backend-reliability-guidelines   ~/.claude/skills/
cp -R code-review-spec                 ~/.claude/skills/
cp -R commit                           ~/.claude/skills/
cp -R ddd                              ~/.claude/skills/
cp -R development-workflow             ~/.claude/skills/
cp -R frontend-interaction-guidelines  ~/.claude/skills/
cp -R git-branch-worktree-convention   ~/.claude/skills/
cp -R logging-boundaries               ~/.claude/skills/
cp -R project-hygiene                  ~/.claude/skills/
cp -R project-context-sync             ~/.claude/skills/
cp -R rest-api-documentation           ~/.claude/skills/
cp -R task-closeout-audit              ~/.claude/skills/

# Or project-only (applies to the current repo only)
mkdir -p .claude/skills
cp -R backend-reliability-guidelines   .claude/skills/
# ...same for other skills
```

### Option 2: symlinks (stay in sync with this repo)

```bash
mkdir -p ~/.claude/skills
REPO="$(pwd)"
for skill in backend-reliability-guidelines code-review-spec commit ddd \
             development-workflow frontend-interaction-guidelines \
             git-branch-worktree-convention logging-boundaries \
             project-context-sync project-hygiene rest-api-documentation \
             task-closeout-audit; do
  ln -sfn "$REPO/$skill" "$HOME/.claude/skills/$skill"
done
```

Then a `git pull` gives you the latest rules — no reinstall.

### Option 3: git submodule

```bash
git submodule add https://github.com/<your-org>/lvdaxianer-skills .claude/skills/lvdaxianer-skills
```

After installing, run `/help` in Claude Code or just start working — skills auto-trigger via their `description`; you can also invoke them explicitly with `/backend-reliability-guidelines`, `/ddd`, etc.

---

## Usage

### Default (auto-trigger)

Skills match against their `description`. Examples:

- "Implement the order-submission API" → triggers `development-workflow` + `backend-reliability-guidelines`, and the workflow requires `rest-api-documentation` when an external Controller changes
- "Review this Java code" → triggers `code-review-spec`
- "Double-clicking this button causes duplicate submits" → triggers `frontend-interaction-guidelines`
- "Write complete documentation for this order API" → triggers `rest-api-documentation`

### Explicit invocation

```
/development-workflow            # walk the full mandatory loop
/code-review-spec                # code review only
/backend-reliability-guidelines  # reliability audit
/frontend-interaction-guidelines # frontend interaction audit
/logging-boundaries              # logging audit
/ddd                             # DDD architecture guidance
/project-hygiene                 # detect & sync baseline files / secret leak check
/project-context-sync            # initialize, verify, and sync project startup context
/rest-api-documentation          # REST API documentation and completeness audit
/task-closeout-audit             # audit and automatically clean proven-merged safe resources
```

### Combining skills

```
Run /development-workflow first, then /code-review-spec,
then /backend-reliability-guidelines for the reliability pass.
```

---

## Directory Structure

```
lvdaxianer-skills/
├── README.md                              ← Chinese (default)
├── README.en.md                           ← this file
├── backend-reliability-guidelines/
│   ├── SKILL.md
│   └── references/
├── code-review-spec/
│   ├── SKILL.md
│   ├── spec.md                            ← detailed rules
│   ├── README.md                          ← hook auto-trigger setup
│   └── references/
├── commit/
│   └── SKILL.md
├── ddd/
│   └── SKILL.md
├── development-workflow/
│   └── SKILL.md
├── frontend-interaction-guidelines/
│   ├── SKILL.md
│   └── references/
├── git-branch-worktree-convention/
│   └── SKILL.md
├── logging-boundaries/
│   ├── SKILL.md
│   └── references/
├── rest-api-documentation/
│   ├── SKILL.md
│   └── references/
├── project-hygiene/
│   └── SKILL.md
├── project-context-sync/
│   ├── SKILL.md
│   ├── scripts/context_sync.py
│   └── tests/test_context_sync.py
└── task-closeout-audit/
    ├── SKILL.md
    ├── scripts/audit_task_closeout.sh
    ├── tests/test_audit_task_closeout.sh
    └── evals/evals.json
```

---

## Conflict Resolution Principle

> **Core promise**: these skills **must not conflict**. On any apparent conflict, defer to the authoritative skill and do not restate its rules elsewhere.

| Domain | Authoritative skill |
|--------|---------------------|
| Backend reliability (idempotency, transactions, concurrency, migrations, env isolation, fail-fast, audit) | `backend-reliability-guidelines` |
| Frontend interaction (deduplication, optimistic UI, state consistency, destructive-action confirmation) | `frontend-interaction-guidelines` |
| Production logging discipline (levels, traceId, masking, MDC propagation, Actuator hot-toggle) | `logging-boundaries` |
| DDD strategic/tactical design (aggregates, domain events, repository boundaries, four-layer architecture) | `ddd` |
| Code-level red lines (comments, naming, method length, null safety, params, duplication, magic numbers) | `code-review-spec` |
| Git branch naming, worktree paths, SOURCE_BRANCH, original-checkout isolation | `git-branch-worktree-convention` |
| Commit message format (Chinese, emoji, mandatory body/footer) | `commit` |
| Mandatory workflow (brainstorm, OpenSpec, task worktrees, TDD, per-task commits/merges) | `development-workflow` |
| External Controller/API route module documents and endpoint contracts, headers/cookies/responses/examples | `rest-api-documentation` |
| .gitignore/.gitattributes/.editorconfig/.env.example maintenance, secret leak prevention, editor/AI tool dir policy | `project-hygiene` |

Resolution procedure:

1. If a rule in one skill also falls under another skill's authoritative domain, defer to that skill
2. Cross-domain rules must reference (not duplicate) the authoritative skill
3. If neither skill covers an edge case, flag it in the code review report as "cross-skill undefined"

---

## Contributing

- Before editing a skill, read its "Skill Conflict Resolution" section
- When adding a new red line, first decide domain ownership to avoid cross-skill duplication
- Every change follows the complete `development-workflow` loop: confirm the integration branch, use an isolated worktree per task, apply OpenSpec, TDD, audit/review, and per-task commit/merge; the user can explicitly opt out with "不要 OpenSpec / 不要分支 / 不要 workflow"
- Keep the Chinese and English READMEs in sync

---

**中文版本**: [README.md](./README.md)
