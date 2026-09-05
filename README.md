# lvdaxianer-skills

> 一套面向 **Claude Code** 的工程规范 skill 集合，覆盖开发流程、代码审查、后端可靠性、前端交互、生产日志与 DDD 架构。所有 skill 之间**互不冲突**、显式互相引用。

**Language**: **中文** · [English](./README.en.md)

---

## 目录

- [是什么](#是什么)
- [八个 skill 一览](#八个-skill-一览)
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

- **红线**：字面可判定的规则（方法 ≤20 行、`@author=lvdaxianer@yeah.net`、日志必须带 traceId 等）
- **深化引用**：当规则跨领域时，只在权威 skill 里详细定义，其它 skill 显式引用不复述

目标：Claude Code 在做后端 / 前端 / 审查 / 日志 / DDD 工作时，都能自动加载相应 skill 并给出一致结果，不出现"这个规则在 A skill 说要 X，在 B skill 说要 Y"的分裂。

---

## 八个 skill 一览

| Skill | 定位 | 触发场景 |
|------|------|----------|
| [`development-workflow`](./development-workflow/SKILL.md) | **入口 skill**：强制"brainstorm → OpenSpec 建 change → 独立 worktree → TDD RED/GREEN → 一致性审计 → code-review → 逐任务提交 → OpenSpec 归档"的固定循环 | 涉及代码、测试、文档、配置、重构或提交的任务 |
| [`git-branch-worktree-convention`](./git-branch-worktree-convention/SKILL.md) | **Git 分支与 worktree 约定**：首次确认集成分支、emoji 前缀 task 分支（✅）、中文描述、SOURCE_BRANCH 记录、原 checkout 读写隔离 | 创建 task 分支、建 worktree、检查分支名合规、task merge 回集成分支 |
| [`commit`](./commit/SKILL.md) | **提交规范**：中文 Conventional Commit + emoji 前缀 + body/footer 非空 | 创建提交、生成提交信息、`/commit` 指令 |
| [`code-review-spec`](./code-review-spec/spec.md) | **代码级红线**：`@author`、方法长度、注释占比、命名、if-else 注释、异常处理、日志、SQL、Git 提交等语言无关规范 | 代码变动、PR 审查、`/code-review-spec` 指令 |
| [`backend-reliability-guidelines`](./backend-reliability-guidelines/SKILL.md) | **系统级可靠性**：幂等、事务、并发、迁移、环境隔离、fail-fast、错误契约、业务审计、可观测性 | 后端 API、Service、Job、Queue、Webhook、迁移、配置变更 |
| [`frontend-interaction-guidelines`](./frontend-interaction-guidelines/SKILL.md) | **前端交互质量**：提交/删除/支付防重、乐观更新可回滚、loading/empty/error/disabled/offline/permission 一致性、破坏性操作确认 | Web/移动端页面、表单、弹窗、列表、编辑器、工作流 |
| [`logging-boundaries`](./logging-boundaries/SKILL.md) | **生产日志治理**：Actuator 热开、级别语义、traceId 强制、脱敏、MDC 跨线程透传，按场景（HTTP/定时任务/MQ/AOP/异步）加载 | 后端日志、traceId、MDC、`log.info/debug/warn/error` |
| [`ddd`](./ddd/SKILL.md) | **DDD 架构**：Bounded Context、Ubiquitous Language、Entity/VO/Aggregate/Domain Event/Repository/Factory、四层架构、反模式识别 | 领域建模、聚合边界讨论、CQRS/事件溯源 |

---

## 关系与优先级

```
development-workflow  (入口, 强制流程)
    ├── 分支与 worktree → git-branch-worktree-convention
    ├── 提交规范 → commit
    ├── 代码审查阶段 → code-review-spec
    │       ├── 日志相关红线 → 授权 logging-boundaries
    │       ├── 后端可靠性红线 → 授权 backend-reliability-guidelines
    │       └── 前端交互红线 → 授权 frontend-interaction-guidelines
    └── DDD 架构任务 → ddd
```

**优先级规则**：

1. 领域内的权威 skill 优先（例：日志相关以 `logging-boundaries` 为准）
2. `code-review-spec` 只管代码级红线，遇跨领域立即让路
3. 语言特定规则 > 通用规则

详见每个 skill 的"Skill Conflict Resolution / 冲突处理原则"章节。

---

## Development Workflow 详解

`development-workflow` 是本仓库唯一的**流程编排 skill**，它串联了本仓库 6 个 skill + 外部 superpowers/OpenSpec 等套件。与其他 skill 不同，它不定义具体规范，只负责在 25 步任务循环里按顺序调度其他 skill。

**核心特点**：
- 组合 skill：本仓库 7 个（内置）+ 外部 6 个（需单独安装，不含 commit）
- 只管流程：定义"什么时候调哪个 skill"，不管"那个 skill 的规则是什么"
- 强制循环：brainstorm → OpenSpec → worktree → TDD → code-review → commit → archive

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

# 或者只装项目级（只对当前仓库生效）
mkdir -p .claude/skills
cp -R backend-reliability-guidelines   .claude/skills/
# ...其他 skill 同理
```

### 方式二：软链接（便于跟随本仓库更新）

```bash
mkdir -p ~/.claude/skills
REPO="$(pwd)"
for skill in backend-reliability-guidelines code-review-spec commit ddd \
             development-workflow frontend-interaction-guidelines \
             git-branch-worktree-convention logging-boundaries; do
  ln -sfn "$REPO/$skill" "$HOME/.claude/skills/$skill"
done
```

之后 `git pull` 即可获得最新规范，无需重装。

### 方式三：git submodule

```bash
git submodule add https://github.com/<your-org>/lvdaxianer-skills .claude/skills/lvdaxianer-skills
```

安装完成后，在 Claude Code 里输入 `/help` 或直接开始工作，skill 会按各自的 `description` 自动触发；也可以显式 `/backend-reliability-guidelines`、`/ddd` 等调用。

---

## 使用方式

### 默认（自动触发）

按 skill 的 `description` 自动匹配。示例：

- 你说"帮我实现用户下单接口" → 命中 `development-workflow` + `backend-reliability-guidelines`
- 你说"审下这段 Java 代码" → 命中 `code-review-spec`
- 你说"这个按钮点两次会重复提交" → 命中 `frontend-interaction-guidelines`

### 显式调用

```
/development-workflow            # 强制走完整流程
/code-review-spec                # 只做代码审查
/backend-reliability-guidelines  # 后端可靠性专项检查
/frontend-interaction-guidelines # 前端交互专项检查
/logging-boundaries              # 日志专项检查
/ddd                             # DDD 架构建议
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
└── logging-boundaries/
    ├── SKILL.md
    └── references/
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
| 强制开发流程（brainstorm、OpenSpec、TDD、逐任务提交） | `development-workflow` |

发现冲突时的处理流程：

1. 在本 skill 中命中某条规则时，若同时属于其他 skill 的权威领域，以另一 skill 为准
2. 相关条款须显式引用另一 skill，不得复述其细则
3. 若两条 skill 均未覆盖某边界情况，视为可讨论空间，在 code review 报告中标注"跨 skill 未定义"

---

## 贡献与更新

- 修改任意 skill 前先阅读其 `SKILL.md` 顶部的"Skill Conflict Resolution / 冲突处理原则"
- 新增红线时，先判断领域归属，避免跨 skill 重复定义
- 每次改动通过 `development-workflow` 的完整流程，包括 OpenSpec change + TDD + code review
- 中英文 README 需同步维护

---

**English version**: [README.en.md](./README.en.md)
