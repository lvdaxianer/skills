# design-to-development 安装说明

> 本文件是给 AI 读取并执行的安装协议。用户说“安装 `design-to-development`”时，AI 应按本文件完成主 Skill、依赖 Skill、平台映射和安装后验证，而不是只复制一个 `SKILL.md`。

## 1. 安装目标

安装完成后，AI 必须能够直接使用 `design-to-development`，并且在运行时找到它声明的规范依赖。这个 Skill 用于把文字需求或设计图转换成更接近正式开发的可运行前后端实现。

固定技术架构不因安装方式改变：

- 前端：Vue 3、Vite、TypeScript、SCSS、Tailwind CSS、Pinia、Vue Router
- 后端：JDK 21、Spring Boot、Maven、H2、MyBatis-Plus、Flyway 或可审计迁移方案

## 2. 给 AI 的执行契约

读取本文件后，按以下顺序执行：

1. 将当前文件所在目录的父目录识别为仓库根目录；不要假设当前 shell 工作目录就是仓库根目录。
2. 识别当前运行时，并选择对应的 Skill 目标目录：
   - Claude Code：优先 `~/.claude/skills/`
   - Codex：优先 `~/.codex/skills/`
   - 使用 Agent skill root 的环境：使用其已配置的 `~/.agents/skills/`
   - 仅安装到当前项目时：使用项目内 `.claude/skills/` 或平台对应的项目级目录
3. 读取第 3 节的完整依赖清单。主 Skill 和所有“每次开发必需”依赖必须安装；建议扩展依赖默认一并安装，避免第一次实现时才发现缺失。
4. 优先从当前仓库复制或链接同名 Skill。仓库没有的依赖，使用当前平台已配置的 Skill 注册源、插件安装器或 Skill 管理能力按精确名称安装。
5. 已存在且可验证的同名 Skill 可以复用；已有目录内容不明确或版本冲突时，不覆盖、不删除，报告冲突并停止该依赖的安装。
6. 安装后执行第 6 节的验证。任一必需 Skill、主 Skill 引用文件或 brainstorming 入口无法验证时，不得报告“安装成功”。
7. 输出第 7 节的安装结果，包含目标目录、实际安装项、复用项、冲突项、缺失项和验证结果。

安装请求本身已经授权执行安装，不要在已经确认目标目录和来源后重复询问“是否安装”。但不要绕过权限，也不要执行未知远程脚本。

## 3. 依赖清单

### 3.1 主 Skill

| Skill | 来源 | 级别 |
| --- | --- | --- |
| `design-to-development` | 当前目录 | 必须 |

### 3.2 每次开发都必须可用

这些 Skill 是主流程的硬依赖，必须在进入实际开发前完成安装或验证：

| Skill | 用途 |
| --- | --- |
| `brainstorming` 或 `superpowers:brainstorming` | 需求讨论、设计确认和实现前门禁 |
| `frontend-interaction-guidelines` | 前端交互、状态、重复操作和恢复路径 |
| `backend-reliability-guidelines` | 后端可靠性、事务、幂等、并发、错误和配置 |
| `code-review-spec` | 代码级规范和变更审查 |
| `logging-boundaries` | traceId、MDC、脱敏、日志级别和异步边界 |
| `test-driven-development` | TDD 的 RED/GREEN/REFACTOR 流程 |
| `verification-before-completion` | 完成前的新鲜证据和交付审计 |

`superpowers:brainstorming` 是优先入口名称。若当前平台不支持 `superpowers:` 命名空间，但提供同名本地 `brainstorming` Skill，则将 `brainstorming` 作为等价适配入口；不得因此跳过头脑风暴门禁。若两者都不存在，应安装 Superpowers 插件或平台对应的 brainstorming Skill。

### 3.3 建议预装的扩展依赖

这些 Skill 会在对应任务触发，建议安装时一并完成：

| Skill | 触发条件 |
| --- | --- |
| `rest-api-documentation` | 新增或修改对外 Controller/API |
| `project-hygiene` | 初始化项目、构建清单、环境变量或基线文件 |
| `ddd` | 复杂领域建模、聚合边界或领域事件 |
| `vue-best-practices` | Vue 组件、组合式逻辑和模板实现 |
| `vue-pinia-best-practices` | Pinia Store 和跨页面状态 |
| `vue-router-best-practices` | Vue Router 路由和导航守卫 |
| `vue-testing-best-practices` | Vue 组件和前端行为测试 |

### 3.4 本仓库可直接提供的依赖

如果 README 所在仓库是本仓库，下列目录可直接安装，不需要联网：

```text
design-to-development
frontend-interaction-guidelines
backend-reliability-guidelines
code-review-spec
logging-boundaries
ddd
rest-api-documentation
project-hygiene
```

`brainstorming`、`test-driven-development`、`verification-before-completion` 以及 Vue 专项 Skill 可能由当前 AI 平台或外部 Skill 注册源提供。安装前必须先检查现有 Skill 目录；缺失时按精确名称调用平台安装能力，不要猜测仓库地址。

## 4. 安装方式

### 4.1 选择目标目录

优先安装到当前 AI 实际加载的全局 Skill 目录。不要因为系统同时存在多个 AI 工具，就未经判断地把文件复制到所有目录。

可以用以下规则判断：

```text
当前是 Claude Code       → ~/.claude/skills
当前是 Codex              → ~/.codex/skills
当前运行时暴露 ~/.agents  → ~/.agents/skills
用户明确要求项目级安装     → <project>/.claude/skills 或平台对应项目目录
```

如果无法判断运行时，先读取当前平台的 Skill 加载配置；仍无法判断时，报告候选目录并请求用户指定，不要静默安装到错误目录。

### 4.2 本地仓库复制模式

复制模式适合希望把当前版本固定到目标环境的用户。AI 应对每个同名 Skill 执行以下逻辑：

```text
source = <仓库根目录>/<skill-name>
target = <目标 Skill 目录>/<skill-name>

source/SKILL.md 不存在 → 标记为“本地来源缺失”，转到第 5 节
target 不存在       → 创建 target 的父目录并复制 source
target 已存在且可验证 → 复用，不重复覆盖
target 已存在但不明确 → 标记冲突，不删除、不覆盖
```

POSIX 环境的单个本地 Skill 安装命令示例：

```sh
mkdir -p "$TARGET_SKILL_ROOT"
cp -R "$REPO_ROOT/design-to-development" "$TARGET_SKILL_ROOT/"
```

执行前必须把 `REPO_ROOT` 和 `TARGET_SKILL_ROOT` 替换为已验证的绝对路径。不要使用未解析的通配符，也不要把仓库根目录复制成目标目录中的嵌套仓库。

### 4.3 仓库软链接模式

软链接适合本仓库的持续开发和更新。它只适用于当前仓库目录可信且不会被移动的情况：

```sh
mkdir -p "$TARGET_SKILL_ROOT"
ln -sfn "$REPO_ROOT/design-to-development" "$TARGET_SKILL_ROOT/design-to-development"
```

依赖 Skill 也必须逐个链接。若目标是一个真实目录而不是软链接，禁止用 `ln -sfn` 覆盖；先报告冲突，避免破坏用户已有 Skill。

### 4.4 Windows PowerShell

Windows 使用等价的目标目录和复制逻辑：

```powershell
$TargetSkillRoot = Join-Path $env:USERPROFILE ".claude\skills"
New-Item -ItemType Directory -Force -Path $TargetSkillRoot | Out-Null
Copy-Item -Recurse -Path (Join-Path $RepoRoot "design-to-development") -Destination $TargetSkillRoot
```

如果目标已存在，不要直接覆盖；先检查其 `SKILL.md`、版本和来源，再决定复用或报告冲突。

## 5. 缺失依赖的安装协议

当依赖不在当前仓库，也不在目标目录时，AI 必须按以下顺序处理：

1. 使用当前平台提供的 Skill 搜索/安装能力，按表中精确名称查找。
2. 如果依赖属于 `superpowers:*` 命名空间，优先安装或启用对应 Superpowers 插件；同时确认 `superpowers:brainstorming` 可被调用。
3. 安装后重新检查目标目录和 `SKILL.md` frontmatter。
4. 如果平台没有安装能力、没有可信来源或安装需要用户凭据，停止并报告精确缺失项；不要编造 URL，不要执行 `curl | sh`、`wget | sh` 或未知安装器。

缺失依赖不能被“用一段总结代替”。本 Skill 的规范依赖必须以可读取的 Skill 文件存在，才能进入实际开发。

## 6. 安装后验证

### 6.1 文件验证

对主 Skill 和所有必需依赖逐项确认：

```sh
test -f "$TARGET_SKILL_ROOT/<skill-name>/SKILL.md"
rg -q '^name:' "$TARGET_SKILL_ROOT/<skill-name>/SKILL.md"
```

主 Skill 还必须确认以下引用文件全部存在：

```text
references/architecture.md
references/environment-preflight.md
references/workflow.md
references/interaction-and-state.md
references/api-and-data-contract.md
references/quality-gates.md
```

### 6.2 行为验证

AI 必须确认：

- `design-to-development` 的 `SKILL.md` 已安装，并能按描述触发。
- brainstorming 入口可用，且在实现前会要求设计确认。
- frontend、backend、logging、code review、TDD、verification 依赖均可读取。
- Skill 的 README、`SKILL.md` 和依赖文件没有因为安装被截断或嵌套错一层目录。
- 如果当前环境需要重启或刷新 Skill 索引，明确告诉用户下一步；不要把“文件已复制”当成“运行时已加载”。

### 6.3 安装结果模板

```text
Skill installation: PASS | FAIL
Runtime: <Claude Code | Codex | other>
Target root: <absolute path>
Main skill: design-to-development (<installed | reused | conflict>)
Required dependencies: <installed/reused names>
Recommended dependencies: <installed/reused names>
Missing dependencies: <names or none>
Conflicts: <names or none>
Verification: <commands/results>
Next step: <ready to use | refresh/restart runtime | manual action required>
```

只有 `Missing dependencies: none`、`Conflicts: none` 且验证通过时，才能输出 `Skill installation: PASS`。

## 7. 安装后如何使用

安装成功后，用户可以直接提出：

```text
请根据这段文字需求制作一个可运行的产品功能切片。
```

或者：

```text
请根据这张设计图实现一个开发型产品功能。
```

Skill 会先完成 JDK 21 环境预检，再进入 brainstorming。输入可以只有文字，也可以只有设计图；不要求用户同时提供两种输入。
