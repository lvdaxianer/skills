# lvdaxianer-skills

> 一套面向 **Claude Code** 的工程规范 skill 集合，覆盖开发流程、代码审查、REST API 文档、后端可靠性、前端交互、生产日志、DDD 架构与任务收尾审计。所有 skill 之间**互不冲突**、显式互相引用。

**Language**: **中文** · [English](./README.en.md)

---

## 目录

- [是什么](#是什么)
- [十三个 skill 一览](#十三个-skill-一览)
- [关系与优先级](#关系与优先级)
- [Development Workflow 详解](#development-workflow-详解)
- [安装](#安装)
- [使用方式](#使用方式)
- [目录结构](#目录结构)
- [冲突处理原则](#冲突处理原则)
- [贡献与更新](#贡献与更新)

---

## 是什么

这是一个 **Claude Code Skills** 仓库，每个子目录是一个可独立启用的 skill，为 Claude Code 在特定场景下加载相应规范。定位是"工程红线 + 深化引用"：

- **红线**：字面可判定的规则（方法 ≤20 行、新代码 `@author` 禁止写死、日志必须带 traceId 等）
- **深化引用**：当规则跨领域时，只在权威 skill 里详细定义，其它 skill 显式引用不复述

目标：Claude Code 在做后端 / 前端 / 审查 / 日志 / DDD 工作时，都能自动加载相应 skill 并给出一致结果，不出现"这个规则在 A skill 说要 X，在 B skill 说要 Y"的分裂。

---

## 十三个 skill 一览

| Skill | 定位 | 触发场景 |
|------|------|----------|
| [`development-workflow`](./development-workflow/SKILL.md) | **入口 skill**：强制“brainstorm → 确认集成分支与任务 worktree → OpenSpec → 任务边界/调度 → TDD RED/GREEN → REST API 文档门禁（适用时）→ 审计/review → 逐任务提交并合并 → 归档”的固定循环 | 涉及代码、测试、文档、配置、重构或提交的任务 |
| [`git-branch-worktree-convention`](./git-branch-worktree-convention/SKILL.md) | **Git 分支与 worktree 约定**：首次确认集成分支、emoji 前缀 task 分支（✅）、中文描述、SOURCE_BRANCH 记录、原 checkout 读写隔离 | 创建 task 分支、建 worktree、检查分支名合规、task merge 回集成分支 |
| [`commit`](./commit/SKILL.md) | **提交规范**：中文 Conventional Commit + emoji 前缀 + body/footer 非空 | 创建提交、生成提交信息、`/commit` 指令 |
| [`code-review-spec`](./code-review-spec/spec.md) | **代码级红线**：`@author`、方法长度、注释占比、命名、if-else 注释、异常处理、日志、SQL、Git 提交等语言无关规范 | 代码变动、PR 审查、`/code-review-spec` 指令 |
| [`backend-reliability-guidelines`](./backend-reliability-guidelines/SKILL.md) | **系统级可靠性**：幂等、事务、并发、迁移、环境隔离、fail-fast、错误契约、业务审计、可观测性 | 后端 API、Service、Job、Queue、Webhook、迁移、配置变更 |
| [`frontend-interaction-guidelines`](./frontend-interaction-guidelines/SKILL.md) | **前端交互质量**：提交/删除/支付防重、乐观更新可回滚、loading/empty/error/disabled/offline/permission 一致性、破坏性操作确认 | Web/移动端页面、表单、弹窗、列表、编辑器、工作流 |
| [`logging-boundaries`](./logging-boundaries/SKILL.md) | **生产日志治理**：Actuator 热开、级别语义、traceId 强制、脱敏、MDC 跨线程透传，按场景（HTTP/定时任务/MQ/AOP/异步）加载 | 后端日志、traceId、MDC、`log.info/debug/warn/error` |
| [`ddd`](./ddd/SKILL.md) | **DDD 架构**：Bounded Context、Ubiquitous Language、Entity/VO/Aggregate/Domain Event/Repository/Factory、四层架构、反模式识别 | 领域建模、聚合边界讨论、CQRS/事件溯源 |
| [`rest-api-documentation`](./rest-api-documentation/SKILL.md) | **REST API 文档**：按业务模块维护 `apis/<module>.md`，覆盖对外 Controller；接口用途、Method/URL、param、requestBody、请求/响应 Header 与 Cookie、状态码、错误和完整联调实例 | 编写、补全、统一或审查 REST API 接口文档；新增或修改对外 Controller/API 路由 |
| [`project-hygiene`](./project-hygiene/SKILL.md) | **项目基线卫生**：检测驱动 + 托管块幂等维护四份基线文件——.gitignore（产物/AI 工具/编辑器目录、密钥防泄漏）、.gitattributes（换行符、二进制、锁文件合并）、.editorconfig（跨 IDE 格式底线）、.env.example（环境变量契约同步） | 项目初始化、新增/移除构建清单、出现新工具/产物/二进制文件、CRLF 污染、代码新增环境变量、基线文件失同步 |
| [`project-context-sync`](./project-context-sync/SKILL.md) | **项目启动上下文同步**：维护可提交的 `.project-context/` 事实源，并幂等生成 `.claude`、`.codex`、`.kimi` 等 Agent 启动文件；拒绝绝对路径和敏感信息 | 初始化项目上下文、记录项目约定、clone 后恢复 Agent 配置、同步多个 AI 工具上下文 |
| [`task-closeout-audit`](./task-closeout-audit/SKILL.md) | **任务收尾审计**：核验合并证据，并自动清理已确认合并且安全的临时分支与 worktree；保留缺失证据、未合并、脏、锁定和孤立资源 | 显式 `/task-closeout-audit` 调用 |
| [`context-handoff`](./context-handoff/SKILL.md) | **会话上下文交接**：将项目、服务器、进度、决策、命令、待办和风险整理成安全、可复制的单一 Markdown 交接包 | 用户准备切换会话、要求总结上下文，或显式 `/context-handoff` 调用 |

---

## 关系与优先级

```
development-workflow  (入口, 强制流程)
    ├── 分支、worktree 与逐任务集成 → git-branch-worktree-convention
    ├── 提交规范 → commit
    ├── 代码审查阶段 → code-review-spec
    │       ├── 日志相关红线 → 授权 logging-boundaries
    │       ├── 后端可靠性红线 → 授权 backend-reliability-guidelines
    │       └── 前端交互红线 → 授权 frontend-interaction-guidelines
    ├── 对外 Controller/API route 文档门 → rest-api-documentation
    ├── DDD 架构任务 → ddd
    └── 项目初始化与基线文件同步 → project-hygiene
```

**优先级规则**：

1. 领域内的权威 skill 优先（例：日志相关以 `logging-boundaries` 为准）
2. `code-review-spec` 只管代码级红线，遇跨领域立即让路
3. 语言特定规则 > 通用规则

详见每个 skill 的"Skill Conflict Resolution / 冲突处理原则"章节。

---

## Development Workflow 详解

`development-workflow` 是本仓库唯一的**流程编排 skill**，它串联本仓库 10 个配套 skill 与外部 superpowers、OpenSpec、`using-git-worktrees` 等套件。与其他 skill 不同，它不定义具体规范，只负责在 26 步任务循环里按顺序调度其他 skill。

**核心特点**：
- 组合 skill：本仓库 11 个（含入口 skill）+ 外部依赖套件
- 只管流程：定义"什么时候调哪个 skill"，不管"那个 skill 的规则是什么"
- 强制循环：brainstorm → 确认集成分支、创建任务 branch/worktree（触发 `project-hygiene` 基线检查）→ OpenSpec → 任务边界与调度 → TDD → 对外 Controller/API route 按模块更新 `apis/<module>.md` → 验证/审计/review → commit（含密钥与产物泄漏检查）→ 合并回 `SOURCE_BRANCH` 并清理 → final audit/archive
- 集成模型：一个 change 只确认一个集成分支；每个独立任务从它创建任务分支和 worktree，验证通过后立即合并回该分支。不存在用于汇总任务的父分支。
- 显式豁免：用户说"**不要 OpenSpec**"即跳过全部 OpenSpec 阶段；说"**不要分支**"即直接在当前分支修改、不建任务分支/worktree；说"**不要 workflow**"即完全不启用本流程。豁免仅在用户当次明确说出时生效，且可组合（详见 `development-workflow/SKILL.md` 的 Explicit User Opt-Outs）

**详细说明**：[DEVELOPMENT_WORKFLOW_GUIDE.md](./DEVELOPMENT_WORKFLOW_GUIDE.md) 包含：
- 本仓库内置 vs 外部依赖清单
- 完整依赖树与安装验证
- 自动触发 vs 显式调用
- 常见问题（跳过 OpenSpec、只审代码、离线安装等）
- 故障排查清单

---

## 安装

### 方式一：作为 Claude Code project-level skills 使用（推荐）

Claude Code 会自动扫描 `~/.claude/skills/` 或项目 `.claude/skills/` 目录下的所有 skill。

```bash
# 全局安装（对所有项目生效）
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
cp -R context-handoff                  ~/.claude/skills/

# 或者只装项目级（只对当前仓库生效）
mkdir -p .claude/skills
cp -R backend-reliability-guidelines   .claude/skills/
cp -R task-closeout-audit              .claude/skills/
# ...其他 skill 同理
```

### 方式二：软链接（便于跟随本仓库更新）

```bash
mkdir -p ~/.claude/skills
REPO="$(pwd)"
for skill in backend-reliability-guidelines code-review-spec commit ddd \
             development-workflow frontend-interaction-guidelines \
             git-branch-worktree-convention logging-boundaries \
             project-context-sync project-hygiene rest-api-documentation \
             task-closeout-audit context-handoff; do
  ln -sfn "$REPO/$skill" "$HOME/.claude/skills/$skill"
done
```

之后 `git pull` 即可获得最新规范，无需重装。

### 方式三：git submodule

```bash
git submodule add https://github.com/<your-org>/lvdaxianer-skills .claude/skills/lvdaxianer-skills
```

安装完成后，在 Claude Code 里输入 `/help` 或直接开始工作，skill 会按各自的 `description` 自动触发；也可以显式 `/backend-reliability-guidelines`、`/rest-api-documentation`、`/ddd` 等调用。

---

## 使用方式

### 默认（自动触发）

按 skill 的 `description` 自动匹配。示例：

- 你说"帮我实现用户下单接口" → 命中 `development-workflow` + `backend-reliability-guidelines`，并在对外 Controller 变更时由 workflow 强制 `rest-api-documentation`
- 你说"审下这段 Java 代码" → 命中 `code-review-spec`
- 你说"这个按钮点两次会重复提交" → 命中 `frontend-interaction-guidelines`
- 你说"把这个下单接口写成完整文档" → 命中 `rest-api-documentation`

### 显式调用

```
/development-workflow            # 强制走完整流程
/code-review-spec                # 只做代码审查
/backend-reliability-guidelines  # 后端可靠性专项检查
/frontend-interaction-guidelines # 前端交互专项检查
/logging-boundaries              # 日志专项检查
/ddd                             # DDD 架构建议
/project-hygiene                 # 检测并同步基线文件 / 密钥泄漏检查
/project-context-sync            # 初始化、校验和同步项目启动上下文
/rest-api-documentation          # REST API 接口文档编写与完整性检查
/task-closeout-audit             # 审计并自动清理已确认合并且安全的分支和 worktree
/context-handoff                 # 生成安全、可复制的会话上下文交接包
```

### 组合调用示例

```
先用 /development-workflow 走一遍流程，然后 /code-review-spec 审查，
最后 /backend-reliability-guidelines 检查可靠性
```

---

## 目录结构

```
lvdaxianer-skills/
├── README.md                              ← 本文件（中文）
├── README.en.md                           ← English version
├── backend-reliability-guidelines/
│   ├── SKILL.md
│   └── references/
├── code-review-spec/
│   ├── SKILL.md
│   ├── spec.md                            ← 详细规范条款
│   ├── README.md                          ← Hook 自动触发配置
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
├── task-closeout-audit/
    ├── SKILL.md
    ├── scripts/audit_task_closeout.sh
    ├── tests/test_audit_task_closeout.sh
    └── evals/evals.json
└── context-handoff/
    ├── SKILL.md
    └── evals/evals.json
```

---

## 冲突处理原则

> **核心承诺**：这些 skill **原则上不能互相冲突**。发现冲突时，永远参考另一 skill 的权威条款，不在本 skill 复述。

| 领域 | 权威 skill |
|------|------------|
| 后端可靠性（幂等、事务、并发、迁移、环境隔离、fail-fast、审计） | `backend-reliability-guidelines` |
| 前端交互（防重、乐观更新、状态一致性、破坏性操作确认） | `frontend-interaction-guidelines` |
| 生产日志治理（级别、traceId、脱敏、MDC 透传、Actuator 热开） | `logging-boundaries` |
| DDD 战术/战略设计（聚合、领域事件、Repository 边界、四层架构） | `ddd` |
| 代码级红线（注释、命名、方法长度、空值、参数、重复、魔法数字等） | `code-review-spec` |
| Git 分支命名、worktree 路径、SOURCE_BRANCH、原 checkout 隔离 | `git-branch-worktree-convention` |
| 提交信息格式（中文、emoji、body/footer 非空） | `commit` |
| 强制开发流程（brainstorm、OpenSpec、任务 worktree、TDD、逐任务提交/合并） | `development-workflow` |
| 对外 Controller/API route 的模块文档、端点契约、Header/Cookie/响应/实例 | `rest-api-documentation` |
| 四份基线文件（.gitignore/.gitattributes/.editorconfig/.env.example）维护机制、密钥防泄漏、编辑器/AI 工具目录取舍 | `project-hygiene` |

发现冲突时的处理流程：

1. 在本 skill 中命中某条规则时，若同时属于其他 skill 的权威领域，以另一 skill 为准
2. 相关条款须显式引用另一 skill，不得复述其细则
3. 若两条 skill 均未覆盖某边界情况，视为可讨论空间，在 code review 报告中标注"跨 skill 未定义"

---

## 贡献与更新

- 修改任意 skill 前先阅读其 `SKILL.md` 顶部的"Skill Conflict Resolution / 冲突处理原则"
- 新增红线时，先判断领域归属，避免跨 skill 重复定义
- 每次改动通过 `development-workflow` 的完整流程：确认集成分支、每任务独立 worktree、OpenSpec、TDD、审计/review、逐任务提交与合并；用户可用"不要 OpenSpec / 不要分支 / 不要 workflow"显式豁免对应环节
- 中英文 README 需同步维护

---

**English version**: [README.en.md](./README.en.md)
