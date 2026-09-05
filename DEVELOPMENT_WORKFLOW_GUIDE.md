# Development Workflow 使用指南

> `development-workflow` 是本仓库的**流程编排 skill**，它不定义具体规范，只负责在固定的 25 步任务循环里调度其他 skill。理解它如何组合本地 + 外部 skill 是用好整套规范的关键。

---

## 一、它是什么

`development-workflow` 强制执行一个固定的 25 步循环：

```
brainstorm → 确认集成分支并创建任务 worktree → OpenSpec → 任务边界/调度 →
TDD RED/GREEN → 验证/审计/review → 逐任务提交并合并 → final audit → OpenSpec 归档
```

一个 change 只确认一个集成分支。每个可独立验证的任务都从该分支创建 emoji
前缀的 task branch 与独立 worktree；验证和提交通过后，立即合并回工作树中记录的
`SOURCE_BRANCH`，清理 task branch/worktree，再从已更新的集成分支开始下一个任务。
不存在用于汇总任务的 parent/change branch。

### 可视化流程图

```mermaid
flowchart TD
    Start([用户任务开始]) --> B[1. brainstorming]
    B --> W[2. 确认集成分支<br/>创建并校验 task branch/worktree]
    W --> P[3-4. 创建并验证 OpenSpec change]
    P --> T[5-7. 选择任务<br/>定义边界与调度]
    T --> D{可安全委派?}
    D -->|是| R[8-10. 应用结果<br/>主 agent review 与修复循环]
    D -->|否，记录原因| Red[11-12. RED]
    R --> Red
    Red --> Green[13-15. GREEN 与 broader verification]
    Green --> Audit[16-19. 一致性审计<br/>code-review-spec、修复与复验]
    Audit --> C[20-22. 标记完成、commit、<br/>合并回 SOURCE_BRANCH 并清理]
    C --> More{还有未完成任务?}
    More -->|是| T
    More -->|否| F[23-25. final audit、OpenSpec archive、<br/>确认集成分支包含全部任务]
    F --> End([任务完成])
    
    style B fill:#e1f5ff
    style W fill:#e1f5ff
    style P fill:#e1f5ff
    style T fill:#fff4e1
    style R fill:#fff4e1
    style Red fill:#fff4e1
    style Green fill:#fff4e1
    style Audit fill:#ffe1e1
    style C fill:#e1ffe1
    style F fill:#e1ffe1
```

**图例**：
- 🔵 **蓝色方框**（门禁）：workflow 定义的检查点，决定能否进入下一步
- 🔄 **循环**：每一个任务都在步骤 5-22 内完成；步骤 22 已完成 task merge，下一任务必须从更新后的集成分支创建
- 👤 **主 agent**：保持对任务边界、验证证据、审计、review、完成标记、提交和集成的最终责任

### 25 步执行顺序

| 步骤 | 关卡 | 必做事项 |
|------|------|----------|
| 1 | brainstorming | 用 `superpowers:brainstorming` 澄清需求并获得设计批准。 |
| 2 | worktree setup | 判定变更类型；首次任务确认当前分支为 change 的集成分支，创建 task branch/worktree，记录 `SOURCE_BRANCH` 并校验隔离环境；change 涉及清单/工具目录/环境变量变更时触发 `project-hygiene` 基线同步。 |
| 3-4 | OpenSpec plan / validation | 在 task worktree 创建或更新 change、计划和任务清单，并严格验证。 |
| 5 | next task | 只选择第一个未完成任务。 |
| 6-7 | task boundary and dispatch | 定义模块职责、允许文件、依赖、验证命令与交接证据；能安全委派时派发 implementer，否则在 RED 前记录直接执行原因。 |
| 8-10 | delegated review loop | 对委派结果先应用到 task worktree，再由主 agent review；有问题交回同一 implementer 修复并复审。 |
| 11-14 | RED / GREEN | 按 TDD 写最小失败测试，确认失败原因；实现最小变更并确认 focused test 通过。 |
| 15 | broader verification | 执行适用于改动范围的测试、lint、build 或文档检查。 |
| 16-19 | audit / review | 审计计划一致性；逐项执行 `code-review-spec` 和适用领域 skill，修复问题并重新验证。 |
| 20 | task mark-complete | 所有关卡通过后，立即只标记一个任务完成。 |
| 21 | commit | 使用 `commit --style=full` 创建原子中文 Conventional Commit；相关 OpenSpec 计划文件随首个业务任务提交；提交前执行 `project-hygiene` 密钥与产物泄漏检查。 |
| 22 | source-branch integration | 读取 `.source_branch`，合并 task branch 到集成分支，验证 ancestry，清理 task worktree/branch，并回到集成分支。 |
| 23-25 | completion | 完成 final audit，归档 OpenSpec change；确认集成分支包含每个已完成任务，冲突或脏工作树必须先处理。 |

**它本身不管**：
- 分支怎么命名（委托给 `git-branch-worktree-convention`）
- 代码注释占比几成（委托给 `code-review-spec`）
- 日志脱敏字段清单（委托给 `logging-boundaries`）
- 删除按钮是否红色（委托给 `frontend-interaction-guidelines`）
- 幂等键怎么设计（委托给 `backend-reliability-guidelines`）

**它只管**：
- 什么时候调哪个 skill（在"worktree-setup"门调 `git-branch-worktree-convention`，在"code-review-spec"门调 `code-review-spec`）
- 门禁通过条件（RED 门要求测试失败，GREEN 门要求测试通过）
- 任务顺序（brainstorm 必须在 OpenSpec plan 前，commit 必须在 code-review 后，task merge 必须在下一任务前）

---

## 二、它组合了哪些 skill

### 本仓库内置（除入口 skill 外的 8 个）

这些 skill 跟随本仓库安装，无需额外下载：

| Skill | 在哪个阶段调用 | 职责 |
|------|--------------|------|
| [`git-branch-worktree-convention`](./git-branch-worktree-convention/SKILL.md) | worktree-setup 门 | 首次确认集成分支，验证 task 分支名（emoji 前缀 ✅ + 中文），记录 SOURCE_BRANCH，确保原 checkout 隔离 |
| [`project-hygiene`](./project-hygiene/SKILL.md) | worktree-setup 门（基线同步）+ commit 门（泄漏检查） | 四份基线文件（.gitignore/.gitattributes/.editorconfig/.env.example）检测驱动同步、密钥与产物泄漏防线 |
| [`commit`](./commit/SKILL.md) | commit 门 | 中文 Conventional Commit + emoji 前缀 + body/footer 非空 |
| [`code-review-spec`](./code-review-spec/spec.md) | code-review-spec 门 | 检查 `@author`、方法长度、注释占比、命名、异常处理、日志、SQL、Git 提交格式 |
| [`backend-reliability-guidelines`](./backend-reliability-guidelines/SKILL.md) | 触及后端 API/Service/Job/迁移时自动 | 幂等、事务、并发、迁移、环境隔离、fail-fast、错误契约、业务审计、可观测性 |
| [`frontend-interaction-guidelines`](./frontend-interaction-guidelines/SKILL.md) | 触及前端页面/表单/按钮时自动 | 防重、乐观更新、loading/empty/error/disabled 一致性、删除确认、破坏性视觉 |
| [`logging-boundaries`](./logging-boundaries/SKILL.md) | 触及日志代码时自动 | traceId 强制、脱敏、MDC 跨线程、Actuator 热开、级别语义 |
| [`ddd`](./ddd/SKILL.md) | 领域建模讨论时手动调用 | Bounded Context、聚合边界、Entity/VO/Domain Event/Repository、四层架构 |

**安装方式**：按 [README 安装章节](./README.md#安装) 三种方式任选一种，这 8 个 skill 会一起装进 `~/.claude/skills/`。

---

### 外部依赖（必须单独安装）

这些 skill **不在本仓库里**，需要从公网或内部源单独获取：

| Skill 套件 | 来源 | 在哪个阶段调用 | 职责 |
|-----------|------|--------------|------|
| **superpowers 套件** | https://github.com/cline/superpowers (或内部镜像) | brainstorming、任务调度、TDD 与一致性审计门 | 需求讨论、多 agent 编排、RED/GREEN/REFACTOR、一致性审计 |
| **OpenSpec 套件** | https://github.com/spec-dev/openspec-skills (或内部镜像) | OpenSpec plan、apply、validation、sync 与 archive 门 | 创建/继续/快速创建、执行、验证、同步和归档 OpenSpec change |
| **using-git-worktrees** | https://github.com/git-worktrees/claude-skill (或内部镜像) | worktree-setup 门（与 `git-branch-worktree-convention` 配合） | worktree 创建机制、目录选择、安全校验 |

**安装方式示例**（假设你用 git clone 方式）：

```bash
# 1. 安装 superpowers 套件
cd ~/.claude/skills
git clone https://github.com/cline/superpowers.git

# 2. 安装 OpenSpec 套件
git clone https://github.com/spec-dev/openspec-skills.git
ln -sfn openspec-skills/openspec-new-change openspec-new-change
ln -sfn openspec-skills/openspec-continue-change openspec-continue-change
ln -sfn openspec-skills/openspec-ff-change openspec-ff-change
ln -sfn openspec-skills/openspec-apply-change openspec-apply-change
ln -sfn openspec-skills/openspec-verify-change openspec-verify-change
ln -sfn openspec-skills/openspec-sync-specs openspec-sync-specs
ln -sfn openspec-skills/openspec-archive-change openspec-archive-change

# 3. 安装 using-git-worktrees
git clone https://github.com/git-worktrees/claude-skill.git using-git-worktrees
```

**注意**：上述 GitHub URL 是示意，实际地址请查各 skill 的官方仓库或你们内部 git 镜像地址。如果你的环境无法访问公网，请联系管理员获取内部镜像或离线包。

### 外部 skill 详细安装步骤

#### 1. superpowers 套件

**作用**：提供 `brainstorming`、`subagent-driven-development`、
`test-driven-development` 与 `verification-before-completion`（或等效审计
skill）等流程能力。

**安装方式 A：从官方源**

```bash
cd ~/.claude/skills

# 方式 1：Git clone（推荐，便于更新）
git clone https://github.com/cline/superpowers.git

# 方式 2：下载 zip 解压
curl -LO https://github.com/cline/superpowers/archive/refs/heads/main.zip
unzip main.zip && mv superpowers-main superpowers
```

**安装方式 B：从内部镜像**（如果你的环境无公网）

```bash
# 假设你们有内部 GitLab
git clone https://gitlab.your-company.com/claude-skills/superpowers.git ~/.claude/skills/superpowers
```

**验证**：

```bash
ls ~/.claude/skills/superpowers/{brainstorming,subagent-driven-development,test-driven-development,verification-before-completion}/SKILL.md
# 应该看到四个流程所需的 SKILL.md 文件
```

---

#### 2. OpenSpec 套件

**作用**：提供 `openspec-new-change`、`openspec-continue-change`、
`openspec-ff-change`、`openspec-apply-change`、`openspec-verify-change`、
`openspec-sync-specs`、`openspec-archive-change` 等 skill；其中新建/继续与
快速创建是可选路径，不要求同时使用。

**安装**：

```bash
cd ~/.claude/skills

# Step 1: Clone OpenSpec 套件仓库
git clone https://github.com/spec-dev/openspec-skills.git

# Step 2: 为每个 skill 创建软链接（因为 Claude Code 需要顶级目录就是 skill 名）
ln -sfn openspec-skills/openspec-new-change openspec-new-change
ln -sfn openspec-skills/openspec-continue-change openspec-continue-change
ln -sfn openspec-skills/openspec-ff-change openspec-ff-change
ln -sfn openspec-skills/openspec-apply-change openspec-apply-change
ln -sfn openspec-skills/openspec-verify-change openspec-verify-change
ln -sfn openspec-skills/openspec-sync-specs openspec-sync-specs
ln -sfn openspec-skills/openspec-archive-change openspec-archive-change

# 或者用循环批量创建
for skill in openspec-new-change openspec-continue-change openspec-ff-change \
             openspec-apply-change openspec-verify-change openspec-sync-specs \
             openspec-archive-change; do
  ln -sfn openspec-skills/$skill $skill
done
```

**为什么要软链接**？

OpenSpec 套件结构是：
```
openspec-skills/
├── openspec-new-change/
├── openspec-continue-change/
├── openspec-ff-change/
├── openspec-apply-change/
├── openspec-verify-change/
├── openspec-sync-specs/
└── openspec-archive-change/
```

但 Claude Code 扫描 `~/.claude/skills/` 时期望顶级就是 skill 名（例如 `~/.claude/skills/openspec-new-change/SKILL.md`），所以需要软链接把所需子目录"提升"到顶级。

**验证**：

```bash
ls -l ~/.claude/skills/openspec-*
# 应该看到流程所需的 OpenSpec 软链接，都指向 openspec-skills/<对应子目录>

ls ~/.claude/skills/openspec-new-change/SKILL.md
ls ~/.claude/skills/openspec-archive-change/SKILL.md
# 应该能读到 SKILL.md
```

---

#### 3. using-git-worktrees skill

**作用**：提供 worktree 创建机制、目录选择、安全校验（与本仓库的 `git-branch-worktree-convention` 配合）。

**安装**：

```bash
cd ~/.claude/skills

# Git clone
git clone https://github.com/git-worktrees/claude-skill.git using-git-worktrees
```

**验证**：

```bash
ls ~/.claude/skills/using-git-worktrees/SKILL.md
```

---

### 一键安装脚本（公网环境）

如果你的开发环境**有公网访问**，可以用这个脚本一次装完 3 套外部 skill：

```bash
#!/bin/bash
# install-external-skills.sh

set -e
cd ~/.claude/skills

echo "==> 1. 安装 superpowers..."
if [ ! -d "superpowers" ]; then
  git clone https://github.com/cline/superpowers.git
  echo "✓ superpowers 安装完成"
else
  echo "⊘ superpowers 已存在，跳过"
fi

echo ""
echo "==> 2. 安装 OpenSpec 套件..."
if [ ! -d "openspec-skills" ]; then
  git clone https://github.com/spec-dev/openspec-skills.git
  
  # 创建软链接
  for skill in openspec-new-change openspec-continue-change openspec-ff-change \
               openspec-apply-change openspec-verify-change openspec-sync-specs \
               openspec-archive-change; do
    ln -sfn openspec-skills/$skill $skill
  done
  echo "✓ OpenSpec 套件安装完成"
else
  echo "⊘ openspec-skills 已存在，跳过"
fi

echo ""
echo "==> 3. 安装 using-git-worktrees..."
if [ ! -d "using-git-worktrees" ]; then
  git clone https://github.com/git-worktrees/claude-skill.git using-git-worktrees
  echo "✓ using-git-worktrees 安装完成"
else
  echo "⊘ using-git-worktrees 已存在，跳过"
fi

echo ""
echo "==> 全部外部 skill 安装完成！"
echo ""
echo "验证安装："
echo "  ls ~/.claude/skills/{superpowers,openspec-new-change,openspec-archive-change,using-git-worktrees}/SKILL.md"
```

**使用**：

```bash
chmod +x install-external-skills.sh
./install-external-skills.sh
```

---

### 离线环境安装

如果开发环境**无法访问公网**：

#### Step 1：在有网机器上打包

```bash
# 有网机器
cd /tmp
mkdir claude-external-skills
cd claude-external-skills

git clone https://github.com/cline/superpowers.git
git clone https://github.com/spec-dev/openspec-skills.git
git clone https://github.com/git-worktrees/claude-skill.git using-git-worktrees

cd ..
tar -czf claude-external-skills.tar.gz claude-external-skills/
```

#### Step 2：传到离线机器

```bash
# 通过 U 盘、内网文件服务器、或 scp 传输
scp claude-external-skills.tar.gz user@offline-machine:/tmp/
```

#### Step 3：离线机器解压安装

```bash
# 离线机器
cd /tmp
tar -xzf claude-external-skills.tar.gz
cd claude-external-skills

# 移动到 ~/.claude/skills/
mv superpowers ~/.claude/skills/
mv openspec-skills ~/.claude/skills/
mv using-git-worktrees ~/.claude/skills/

# 创建 OpenSpec 软链接
cd ~/.claude/skills
for skill in openspec-new-change openspec-continue-change openspec-ff-change \
             openspec-apply-change openspec-verify-change openspec-sync-specs \
             openspec-archive-change; do
  ln -sfn openspec-skills/$skill $skill
done

echo "离线安装完成"
```

---

### 版本管理与更新

**推荐做法**（团队协作）：

1. **锁定版本**：在有网机器上 clone 后，记录每个仓库的 commit hash：

```bash
cd ~/.claude/skills/superpowers && git rev-parse HEAD
cd ~/.claude/skills/openspec-skills && git rev-parse HEAD
cd ~/.claude/skills/using-git-worktrees && git rev-parse HEAD
```

把这 3 个 commit hash 写进团队文档（例如本仓库的 `EXTERNAL_SKILL_VERSIONS.md`），全员安装时 checkout 到同一 hash：

```bash
cd ~/.claude/skills/superpowers
git fetch origin
git checkout <记录的 commit hash>
```

2. **定期更新**（例如每月）：

```bash
cd ~/.claude/skills/superpowers && git pull
cd ~/.claude/skills/openspec-skills && git pull
cd ~/.claude/skills/using-git-worktrees && git pull

# 更新后重新记录 commit hash，通知全员同步
```

3. **测试兼容性**：更新外部 skill 后，跑一个小任务测试 `development-workflow` 是否仍能正常走完 25 步循环。

---

## 三、完整依赖树

```
development-workflow (本仓库, 流程编排器)
│
├─ 本仓库内置 skill (跟随本仓库安装)
│  ├─ git-branch-worktree-convention
│  ├─ commit
│  ├─ code-review-spec
│  ├─ backend-reliability-guidelines
│  ├─ frontend-interaction-guidelines
│  ├─ logging-boundaries
│  ├─ ddd
│  └─ project-hygiene
│
└─ 外部 skill (需单独安装)
   ├─ superpowers:brainstorming
   ├─ superpowers:subagent-driven-development
   ├─ superpowers:test-driven-development
   ├─ superpowers:verification-before-completion（或等效审计 skill）
   ├─ openspec-new-change
   ├─ openspec-continue-change
   ├─ openspec-ff-change
   ├─ openspec-apply-change
   ├─ openspec-verify-change
   ├─ openspec-sync-specs
   ├─ openspec-archive-change
   └─ using-git-worktrees
```

---

## 四、检查依赖是否就位

安装完本仓库 + 外部 skill 后，用以下命令验证：

```bash
# 检查本仓库 8 个配套 skill（`development-workflow` 本身另行安装）
ls ~/.claude/skills/{git-branch-worktree-convention,commit,code-review-spec,backend-reliability-guidelines,frontend-interaction-guidelines,logging-boundaries,ddd,project-hygiene}/SKILL.md

# 检查外部依赖
ls ~/.claude/skills/{superpowers,openspec-new-change,openspec-continue-change,openspec-ff-change,openspec-apply-change,openspec-verify-change,openspec-sync-specs,openspec-archive-change,using-git-worktrees}/SKILL.md
```

如果任一文件不存在，说明对应 skill 未安装或路径不对，`development-workflow` 会在运行到对应门时报错 "skill unavailable"。

---

## 五、如何使用

### 自动触发（推荐）

`development-workflow` 的 `description` 覆盖了"涉及代码、测试、文档、配置、重构或提交的任务"，Claude Code 会自动匹配。直接告诉它任务即可：

```
帮我实现用户下单接口
```

Claude Code 会：
1. 自动加载 `development-workflow`
2. 在 brainstorming 门调用 `superpowers:brainstorming`
3. 确认集成分支，并在 worktree-setup 门调用 `using-git-worktrees` + `git-branch-worktree-convention`
4. 在 task worktree 中创建和验证 OpenSpec change
5. 对每个任务完成 TDD、验证、审计/review、commit 和合并回 `SOURCE_BRANCH`
6. 完成 final audit、archive，并确认集成分支包含所有任务

### 显式调用

```
/development-workflow 我要重构订单模块
```

强制走完整流程，即使任务看起来很小。

---

## 六、常见问题

### Q1：我只想审代码，不想走完整流程，能跳过 development-workflow 吗？

**可以**。直接调 `/code-review-spec`：

```
/code-review-spec 审下这段 Java 代码
```

这样只触发代码审查，不触发 brainstorm、OpenSpec、worktree 等流程。

---

### Q2：我已经建好分支了，development-workflow 还会重新建吗？

**不会重复创建合规 worktree**。它仍会确认当前集成分支、验证 task branch 名称、检查 `.source_branch`，并要求后续任务从已包含前序 merge 的集成分支创建。

---

### Q3：我的项目不用 OpenSpec，能关掉吗？

**不推荐，但可以**。`development-workflow/SKILL.md` 顶部有一句：

> OpenSpec remains mandatory by default for every persisted change unless the user explicitly opts out.

如果你明确不用 OpenSpec，在每次任务开始时告诉 Claude：

```
这个任务跳过 OpenSpec，直接写代码
```

但这样会失去 OpenSpec 变更追溯与其计划基线；仍应保留 worktree、测试、审计/review、提交和集成等其余强制关卡。

---

### Q4：external skill 的 GitHub 地址都是 404，怎么办？

**两个原因**：
1. 本文档示例 URL 是占位符，实际地址请查官方文档或内部 wiki
2. 你的环境无公网访问，需要用内部镜像或离线包

请联系团队管理员获取正确的安装源。

---

### Q5：我已安装配套 skill，但 development-workflow 还报 "backend-reliability-guidelines unavailable"

**排查步骤**：

1. 确认路径：`ls ~/.claude/skills/backend-reliability-guidelines/SKILL.md`
2. 确认权限：`ls -l ~/.claude/skills/backend-reliability-guidelines/`（需要可读）
3. 确认软链接（如果用方式二安装）：`readlink ~/.claude/skills/backend-reliability-guidelines`（应指向本仓库路径）
4. 重启 Claude Code：skill 索引可能未刷新

---

### Q6：我能只装 development-workflow，不装其他配套 skill 吗？

**技术上可以，但会频繁报错**。`development-workflow` 在 code-review-spec 门、worktree-setup 门、Domain Authority Delegation 表里硬引用了相关配套 skill。不装的话：
- worktree-setup 门报 `git-branch-worktree-convention unavailable`
- code-review-spec 门报 `code-review-spec unavailable`
- 触及后端代码时报 `backend-reliability-guidelines unavailable`

建议**全装**，即使某些 skill 暂时用不到（例如 `ddd` 只在领域建模时用），也占不了多少空间。

---

## 七、最佳实践

### 初次使用

1. **先装本仓库全部 9 个 skill**（按 [README 安装章节](./README.md#安装)）
2. **再装外部 3 套 skill**（superpowers / OpenSpec / using-git-worktrees）
3. **验证依赖**（见上文"四、检查依赖是否就位"）
4. **跑一个小任务测试**：
   ```
   /development-workflow 写一个 hello world 函数并测试
   ```
如果 25 步门全部通过，并且 task branch 已合并回确认的集成分支，说明环境就位。

### 团队协作

- **统一安装源**：团队用同一套外部 skill 版本（锁 commit hash 或 tag），避免不同版本的流程行为分裂
- **共享配置**：把本仓库作为 git submodule 加到项目 `.claude/skills/` 下，全员自动同步规范更新
- **定期同步**：本仓库更新后（例如新增红线、修复冲突），通知全员 `git pull` 或 `git submodule update`

### 离线环境

如果开发环境无公网访问：
1. 在有网机器上 `git clone` 所有外部 skill 到本地
2. 打包成 `.tar.gz`
3. 传到离线机器，解压到 `~/.claude/skills/`
4. 定期（例如每月）从有网机器更新包

---

## 八、进阶：自定义门禁

`development-workflow` 的 25 步循环是固定的，但你可以通过修改 `development-workflow/SKILL.md` 调整门禁条件。例如：

### 关闭 TDD 强制（不推荐）

找到 `## Mandatory Task Loop` 中步骤 11-14 的 TDD 条款：

```markdown
11. Use `superpowers:test-driven-development` and write the smallest useful TDD test...
```

改为：

```markdown
11. Write focused tests before implementation...
```

但这样会失去"测试先行"的约束。

### 简化 S-tier 任务的审计深度

找到 `## Risk-Based Standard Change Tiers` 的 S-tier 定义：

```markdown
- S-tier: localized low-risk behavior change. Keep an OpenSpec change by
  default, with compact planning, verification, and review evidence.
```

改为：

```markdown
- S-tier: ... Use compact evidence while retaining every required gate.
```

---

## 九、与其他 skill 的职责边界

| 问题 | 归属 skill | 不归属 |
|------|-----------|--------|
| 分支名要不要 emoji？ | `git-branch-worktree-convention` | ❌ `development-workflow` 不管 |
| 什么时候建分支？ | `development-workflow` (worktree-setup 门) | ❌ `git-branch-worktree-convention` 不管 |
| task 完成后合并到哪里？ | `git-branch-worktree-convention`（读取 `SOURCE_BRANCH`） | ❌ 不能凭当前 checkout 猜测 |
| 提交信息格式？ | `commit` | ❌ `development-workflow` 不管 |
| 什么时候提交？ | `development-workflow` (commit 门) | ❌ `commit` 不管 |
| 基线文件条目怎么写？ | `project-hygiene` | ❌ `development-workflow` 不管 |
| 什么时候同步基线文件、做泄漏检查？ | `development-workflow`（worktree-setup / commit 门） | ❌ `project-hygiene` 不管 |
| 日志是否脱敏？ | `logging-boundaries` | ❌ `code-review-spec` 不管 |
| 什么时候检查日志？ | `development-workflow` (code-review-spec 门 + Domain Authority Delegation) | ❌ `logging-boundaries` 不管 |

**记住一条**：`development-workflow` 只管"什么时候调谁"，不管"那个谁的规则是什么"。

---

## 十、故障排查清单

遇到 `development-workflow` 报错时，按顺序检查：

1. **skill 未安装**：`ls ~/.claude/skills/<skill-name>/SKILL.md`，缺哪个装哪个
2. **软链接失效**（方式二安装）：`readlink ~/.claude/skills/<skill-name>`，检查目标路径是否存在
3. **权限问题**：`ls -l ~/.claude/skills/`，确保所有 SKILL.md 可读
4. **Claude Code 未刷新索引**：重启 Claude Code，或 `rm -rf ~/.claude/cache`（如果有）
5. **版本冲突**：对照已安装 skill 与本仓库当前 `SKILL.md` 的 required sources，升级或补齐缺失的依赖
6. **路径写死**：`development-workflow/SKILL.md` 里某些路径可能硬编码为 `/Users/lvdaxianer/.agents/skills/`，改成你的实际路径

---

**相关文档**：
- [README 安装指南](./README.md#安装)
- [冲突处理原则](./README.md#冲突处理原则)
- [git-branch-worktree-convention SKILL.md](./git-branch-worktree-convention/SKILL.md)
- [development-workflow SKILL.md](./development-workflow/SKILL.md)
