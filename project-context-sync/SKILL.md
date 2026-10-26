---
name: project-context-sync
description: >-
  管理可提交、可迁移的项目启动上下文，并将确认过的项目事实幂等同步到
  .claude、.codex、.kimi 等 Agent 目录。用户要求初始化项目上下文、记录项目约定、
  clone 后恢复 Agent 配置、同步多个 AI 工具上下文，或提到 project context、CLAUDE.md、
  AGENTS.md 时使用。
---

# Project Context Sync

## 核心原则

- `.project-context/` 是唯一事实源；`.claude`、`.codex`、`.kimi` 下的文件是生成结果。
- 只保存稳定、已确认、对后续任务有帮助的项目事实，不保存聊天记录或一次性状态。
- 所有持久化路径必须是相对项目根目录的路径。
- 不保存绝对路径、用户名、家目录、本机配置、临时目录、Token、密码、Cookie、私钥或真实密钥。
- 目标文件只允许更新 `PROJECT-CONTEXT:managed` 托管区块，区块外的用户内容必须保留。
- 发现冲突、绝对路径或疑似敏感信息时先停止写入并报告，不要静默修复或覆盖。

## 何时使用

使用场景包括：

- 用户告诉你新的项目定位、技术栈、架构边界、开发约定或常用命令；
- 用户要求“记住这个项目规则”或“把这条信息保存到项目上下文”；
- 新 clone 的项目需要恢复多个 Agent 的启动上下文；
- `.project-context/` 已有内容，需要预览、校验或重新同步；
- 需要把同一组项目事实投影到不同 Agent 的启动文件。

不要因为普通聊天就自动保存内容。只有用户明确要求保存，或当前对话已经确认该内容是稳定项目事实时，才更新事实源。

## 项目事实源

初始化后，项目中应有：

```text
.project-context/
├── project.md       # 项目定位、技术栈、模块和目录
├── conventions.md   # 编码、分支、提交、测试等约定
├── commands.md      # 安装、开发、测试、构建、部署命令
├── architecture.md  # 架构、边界、依赖和关键决策
└── targets.json     # Agent 目标文件注册表
```

可以增加其他 `.md` 文件。同步工具按文件名排序读取它们，跳过 `README.md` 和 `targets.json`。

推荐使用相对路径：

```text
src/main.ts
packages/api
docs/architecture.md
<project-root>/scripts/check.sh
```

禁止写入：

```text
<unix-absolute-project-path>/src/main.ts
<home-directory>/project/src/main.ts
<windows-absolute-project-path>\\src\\main.ts
```

## 工作流

### 1. 初始化

在目标项目根目录执行：

```bash
python <path-to-project-context-sync>/scripts/context_sync.py init --root .
```

初始化会创建缺失的 `.project-context/` starter 文件和默认目标配置，并生成：

- `.claude/CLAUDE.md`
- `.codex/AGENTS.md`
- `.kimi/AGENTS.md`

目标文件名不是硬编码契约；如果项目使用不同的 Agent 入口，应先修改 `targets.json`，再运行 `preview`。

### 2. 记录新信息

将用户明确提供或已经确认的事实写入最合适的 `.project-context/*.md` 文件：

- 项目定位、技术栈和模块 → `project.md`
- 规范和不可违反的约定 → `conventions.md`
- 可重复执行的命令 → `commands.md`
- 架构边界和关键决策 → `architecture.md`

合并已有内容，避免重复记录。不要把绝对路径转换后写入；使用相对路径或 `<project-root>` 占位符。

### 3. 预览、校验、同步

```bash
python <path-to-project-context-sync>/scripts/context_sync.py preview --root .
python <path-to-project-context-sync>/scripts/context_sync.py verify --root .
python <path-to-project-context-sync>/scripts/context_sync.py sync --root .
```

执行顺序：先 `preview`，再 `verify`，确认无警告后运行 `sync`。`preview` 不写文件；`verify` 不写文件；任何校验失败都不得继续同步。

## `targets.json` 格式

配置只保存项目相对目标文件：

```json
{
  "targets": [
    {"name": "claude", "file": ".claude/CLAUDE.md"},
    {"name": "codex", "file": ".codex/AGENTS.md"},
    {"name": "kimi", "file": ".kimi/AGENTS.md"}
  ]
}
```

禁止使用绝对路径、`..` 目录穿越、指向项目根目录外的符号链接或机器特有路径。目标文件不适用时，修改注册表而不是修改同步脚本。

## 托管区块

同步结果使用以下标记：

```markdown
<!-- BEGIN PROJECT-CONTEXT:managed -->
<!-- generated from .project-context/; edit the source instead -->
<!-- END PROJECT-CONTEXT:managed -->
```

重复同步必须幂等。托管区块外的内容由项目维护者负责，skill 不得删除、重排或覆盖。托管标记不完整或出现多个区块时，先修复目标文件或删除冲突标记，再重试。

## 安全与错误处理

- 只报告疑似敏感信息的类别和相对文件路径，不在错误输出中回显疑似密钥值。
- 允许 `CHANGE_ME`、`<placeholder>` 等明确占位符；真实值必须移除。
- 发现绝对路径、凭据、私钥、非法目标或符号链接逃逸时，命令必须失败且不写入目标。
- 运行时可以使用本机绝对路径定位项目，但不得将它写入 `.project-context/`、目标文件或持久化配置，也不要在正常摘要中输出它。
- 失败后保留已有文件；不要用删除、reset 或整文件覆盖的方式“修复”冲突。

## 完成检查

每次更新后确认：

- `.project-context/` 是 Git 中的权威内容；
- `targets.json` 中所有 `file` 都是项目相对路径；
- `preview` 的输出符合预期；
- `verify` 通过且没有绝对路径、敏感信息、非法目标或坏托管区块；
- `sync` 后每个目标只存在一个托管区块；
- 重复执行 `sync` 不产生额外 diff；
- 目标文件中原有的非托管内容仍然存在。

详细的确定性校验和同步逻辑由同目录的 `scripts/context_sync.py` 提供。修改脚本后运行同目录的测试：

```bash
python -B -m unittest discover -s tests -p 'test_*.py'
```
