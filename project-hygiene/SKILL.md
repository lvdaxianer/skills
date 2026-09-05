---
name: project-hygiene
description: 项目基线卫生——以"检测驱动 + 托管块"的方式幂等维护项目基线文件：.gitignore（技术栈产物、AI 工具目录、编辑器目录、密钥防泄漏）、.gitattributes（换行符、二进制标记、锁文件合并）、.editorconfig（跨 IDE 格式底线）、.env.example（环境变量模板同步）。当初始化项目、新增/移除构建清单、出现新的工具/产物/二进制文件、发现 CRLF 污染、代码新增环境变量引用、或基线文件与技术栈不同步时使用。
---

# project-hygiene

项目仓库的**基线卫生纪律**。维护四份会"腐烂"的基线文件，让它们始终等于当前技术栈的投影：

| 基线文件 | 管什么 | 腐烂场景 |
|----------|--------|----------|
| `.gitignore` | 什么不进仓库 | 加了新技术栈，产物被误提交 |
| `.gitattributes` | 进仓库后怎么被 Git 对待 | Windows 同事提交 CRLF、锁文件冲突、二进制被当文本 |
| `.editorconfig` | 跨 IDE 的格式底线 | 新语言加入，缩进风格漂移 |
| `.env.example` | 环境变量契约 | 代码加了新变量，模板没跟上 |

> **一句话定位**：基线文件不是写出来的，是**检测出来的**——每次运行都重新探测当前技术栈与代码，只重写自己拥有的托管块，永不动手写的内容。

---

## 触发条件

在以下任一情况使用本 skill：

- 初始化新项目、仓库缺少基线文件
- 新增或移除构建清单：`pom.xml` / `build.gradle*` / `package.json` / `go.mod` / `Cargo.toml` / `pyproject.toml` / `requirements*.txt` / `composer.json` 等
- 出现新的未跟踪产物或工具目录：`node_modules/`、`target/`、`dist/`、`.claude/`、`.codex/`、`.idea/`、`.vscode/`
- 出现 CRLF 换行污染、二进制文件产生错误 diff、锁文件频繁冲突
- 代码中新增环境变量引用（`process.env.*`、`os.Getenv`、`System.getenv`、`os.environ`、配置模板中的 `${VAR}`）
- 发现已跟踪文件中出现疑似密钥（`.env`、`*credentials*`、`*.pem`、`*.key`）
- 用户提到「gitignore、gitattributes、editorconfig、env.example、忽略、别提交、同步、项目初始化、仓库卫生、CRLF、换行」

---

## 核心模型：托管块（Managed Block）

本 skill 对每份基线文件的写入**只允许发生在托管块内**。标记用该文件的注释语法：

```gitignore
# >>> project-hygiene (managed, do not edit by hand) >>>
<由检测生成的条目>
# <<< project-hygiene (managed) <<<
```

`.editorconfig` 用 `;` 或 `#` 注释，规则相同。

通用规则（对四份文件一致适用）：

1. **幂等**：重复执行结果相同。托管块内容 = 当前检测结果的函数，与历史无关。
2. **边界**：托管块之外的内容（团队手写条目、历史遗留）**永不修改、永不删除**。
3. **无块则建**：文件不存在或没有标记时，在文件末尾追加完整托管块。
4. **先报后写**：每次同步输出 diff（新增/移除哪些条目），再落盘。
5. **自足**：仓库基线必须完整自描述，不依赖贡献者的全局配置（全局 gitignore、IDE 个人设置等）。

---

## .gitignore：检测表

按仓库中**实际存在**的清单文件生成对应条目：

| 检测到 | 生成条目 |
|--------|----------|
| `pom.xml` | `target/`、`.flattened-pom.xml` |
| `build.gradle` / `build.gradle.kts` | `.gradle/`、`build/` |
| `package.json` | `node_modules/`、`*.tsbuildinfo` |
| `package.json` 含 next 依赖 | `.next/`、`out/` |
| `package.json` 含 vite 依赖 | `dist/`、`dist-ssr/` |
| `go.mod` | `vendor/`（仅当仓库未提交 vendor 时） |
| `Cargo.toml` | `target/` |
| `pyproject.toml` / `requirements*.txt` / `setup.py` | `__pycache__/`、`*.py[cod]`、`.venv/`、`venv/`、`.pytest_cache/`、`.mypy_cache/`、`.ruff_cache/`、`*.egg-info/` |
| `composer.json` | `vendor/` |
| 存在 `*.xcodeproj` / `*.xcworkspace` | `DerivedData/`、`xcuserdata/` |

**注意**：`target/`、`build/`、`dist/`、`vendor/` 是多个技术栈共享的目录名。同一条目只写一次；只要还有任一技术栈需要它，就保留。

### 通用条目（任何仓库都生成）

```gitignore
.DS_Store
Thumbs.db
*.log
logs/
coverage/
*.lcov
```

### 密钥文件（红线，无条件生成）

```gitignore
.env
.env.*
!.env.example
!.env.sample
!.env.template
*.pem
*.key
```

---

## .gitattributes：检测表

按仓库中**实际存在**的文件类型生成对应条目。

### 通用条目（任何仓库都生成）

```gitattributes
* text=auto eol=lf
```

这一条是跨平台协作的底线：Git 提交时统一转 LF，Windows 同事的 CRLF 不会污染 diff。

### 文本文件显式声明（按检测到的技术栈）

```gitattributes
*.java    text eol=lf      # pom.xml / build.gradle
*.go      text eol=lf      # go.mod
*.rs      text eol=lf      # Cargo.toml
*.py      text eol=lf      # pyproject.toml 等
*.ts      text eol=lf      # package.json
*.tsx     text eol=lf      # package.json 含 react
*.sh      text eol=lf      # 仓库存在 *.sh（必须 LF，CRLF 会直接执行失败）
```

### 二进制标记（按检测到的文件扩展名）

```gitattributes
*.png  binary
*.jpg  binary
*.jpeg binary
*.gif  binary
*.ico  binary
*.pdf  binary
*.zip  binary
*.jar  binary
*.woff binary
*.woff2 binary
```

防止 Git 对二进制做文本 diff/换行转换导致文件损坏。

### 锁文件合并策略（按检测到的清单）

```gitattributes
package-lock.json merge=union    # package.json
pnpm-lock.yaml   merge=union     # pnpm-lock.yaml
yarn.lock        merge=union     # yarn.lock
Cargo.lock       merge=union     # Cargo.toml
go.sum           merge=union     # go.mod
poetry.lock      merge=union     # pyproject.toml 含 poetry
```

锁文件冲突取双方合集通常比手工解冲突更安全，但最终仍以重新安装依赖为准。

### LFS

若仓库已使用 Git LFS（存在 `.lfsconfig` 或历史中 `filter=lfs`），保留既有 LFS 规则；本 skill **不主动引入 LFS**，只在用户明确要求时配置。

---

## .editorconfig：检测表

### 通用段（任何仓库都生成）

```ini
; >>> project-hygiene (managed, do not edit by hand) >>>
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

### 按技术栈生成的缩进段

```ini
[*.{java,kt,py,go,rs}]
indent_style = space
indent_size = 4

[*.{js,jsx,ts,tsx,json,yml,yaml,css,html,vue}]
indent_style = space
indent_size = 2

[Makefile]
indent_style = tab

[*.md]
trim_trailing_whitespace = false
; <<< project-hygiene (managed) <<<
```

- 段落只按检测到的技术栈生成（没有 Python 就没有 `*.py` 段）。
- 已存在 `go.mod` 时追加 `[*.go] indent_style = tab`（gofmt 强制 tab，覆盖通用段）。
- `root = true` 只在文件不存在时写入；文件已存在则不动该行。

---

## .env.example：环境变量契约同步

`.env.example` 是**必须被 Git 跟踪**的模板：含全部环境变量的键，值一律为占位符。

### 同步机制

1. **扫描**：在源码与配置模板中收集环境变量引用：
   - JS/TS：`process.env.XXX`
   - Go：`os.Getenv("XXX")`、`os.LookupEnv`
   - Java：`System.getenv("XXX")`、properties/yml 中的 `${XXX}` / `${XXX:default}`
   - Python：`os.environ["XXX"]`、`os.environ.get("XXX")`、`os.getenv`
2. **Diff**：扫描结果 vs `.env.example` 现有键：
   - 代码有、模板无 → 加入模板（占位符值），在 diff 中列出
   - 模板有、代码无 → **不自动删除**，报告"疑似废弃变量"，由用户确认后移除
3. **分组注释**：模板中按模块用注释分组（`# Database`、`# Redis`），新键归入对应分组。

### 红线

1. `.env.example` 中的值**只能是占位符**（`CHANGE_ME`、`localhost:6379` 这类非敏感示例），出现真实密钥视同泄漏处理。
2. 密钥泄漏检查：`git ls-files | grep -E '\.env|\.pem$|\.key$|credentials'`。命中即报告：**先 `git rm --cached` 移出跟踪，再加忽略**；只加忽略不能阻止已跟踪文件继续提交。
3. 发现已提交密钥必须提醒用户**轮换该密钥**，而不只是从 Git 移除。

---

## 编辑器与 AI 工具目录（.gitignore 决策规则，非盲忽略）

**不 blanket 忽略整个目录**。这些目录里常有团队想共享的配置，必须先检查再决定。

### `.claude/` / `.codex/`

- 忽略：`.claude/worktrees/`（权威约定见 `git-branch-worktree-convention`）、`.claude/settings.local.json`、`.codex/` 下的本地会话与日志类文件。
- 保留可提交：`.claude/settings.json`、`.claude/skills/`、`.claude/agents/` 等团队共享配置。
- 执行前检查 `git ls-files .claude .codex`：已有被跟踪文件的子路径，不得新增对其的忽略。

### `.vscode/` / `.idea/`

默认生成"忽略大部分、放行共享配置"的形态：

```gitignore
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
!.vscode/launch.json
!.idea/
```

- `.idea/` 默认整个忽略（JetBrains 共享配置实践分歧大，默认不提交）。
- 若 `git ls-files` 显示团队成员已跟踪 `.vscode/` 或 `.idea/` 下的文件，**尊重现状**，只报告不改动，由用户裁决。

---

## 同步与移除策略（技术栈变更时）

对四份基线文件统一适用：

1. **新增技术栈**（出现新清单/新文件类型/新环境变量）：重新检测，新条目并入托管块。
2. **移除技术栈**（清单消失）：对应条目从托管块移除，但**必须先在 diff 中明确列出"即将移除的条目"**；若对应产物/源码仍存在，改为警告并保留条目。
3. **疑似废弃的环境变量永不自动删除**，只报告，由用户确认。
4. **条目冲突**：某条目同时被托管块外的手写内容覆盖时，以手写为准，托管块内不重复生成。

### 验证

每次同步后执行：

```bash
git status --porcelain              # 不应再出现产物/工具目录
git check-ignore -v <样例路径>      # 抽查 .gitignore 条目确实命中
git check-attr -a <样例文件>        # 抽查 .gitattributes 生效
git ls-files --eol | grep crlf     # 不应有 CRLF 污染的文本文件
```

---

## 一次性初始化清单（只提醒，不托管）

以下文件生成一次即稳定，不属于持续同步范围。项目初始化时检查并提醒用户，缺什么列什么，不自动创建：

- `LICENSE`
- `README.md`
- `CODEOWNERS`
- `.github/` PR 与 Issue 模板
- `SECURITY.md`

---

## Skill Conflict Resolution / 冲突处理原则

| 领域 | 权威 skill |
|------|------------|
| `.claude/worktrees/` 的使用约定、worktree 路径规范 | `git-branch-worktree-convention` |
| 提交信息格式 | `commit` |
| 代码级格式红线（命名、注释、方法长度等） | `code-review-spec` |
| 何时触发本 skill（任务流程内的时点） | `development-workflow` |
| 四份基线文件的维护机制、密钥防泄漏、编辑器/AI 工具目录取舍 | **本 skill** |

本 skill 只管基线文件"有没有、全不全、新不新"，不管代码风格的具体取值（如缩进 2 还是 4 的团队偏好，属 `code-review-spec` 评审语境）——本 skill 的默认值只在仓库无任何既有约定时适用。

---

## 检查清单

### 初始化 / 首次同步

- [ ] 检测全部清单文件与文件类型，列出识别到的技术栈并告知用户
- [ ] 执行密钥泄漏检查（`git ls-files`），命中先移出跟踪
- [ ] 检查 `.claude/` `.codex/` `.vscode/` `.idea/` 的已跟踪文件
- [ ] 扫描环境变量引用，生成/补全 `.env.example`
- [ ] 为四份基线文件生成托管块并输出 diff，落盘
- [ ] `git status` 与 `git ls-files --eol` 验证
- [ ] 输出一次性初始化清单缺口（LICENSE/README/CODEOWNERS 等）

### 技术栈变更时

- [ ] 新清单/新文件类型/新环境变量 → 重新检测并并入条目
- [ ] 清单移除 → diff 中列出待移除条目，产物仍存在则保留并警告
- [ ] 疑似废弃环境变量只报告，不自动删除
- [ ] 不触碰任何托管块外内容
- [ ] `git check-ignore -v` / `git check-attr -a` 抽查验证

---

## Non-Negotiable Rules

- 基线文件的写入只发生在托管块内；托管块外内容只读。
- 每次同步必须先输出 diff 再落盘。
- 已跟踪的密钥文件：先 `git rm --cached` 再忽略，并提醒轮换密钥。
- `.env.example` 必须被跟踪，且值只能是占位符；疑似废弃变量只报告不删除。
- 不 blanket 忽略 `.vscode/`、`.idea/`、`.claude/`、`.codex/` 整个目录；先查已跟踪文件。
- 移除条目前必须确认对应产物/源码已不存在，否则保留并警告。
- `* text=auto eol=lf` 无条件生成；`*.sh` 必须显式 `eol=lf`。
- 仓库基线必须自足，不依赖贡献者的全局 gitignore、IDE 个人设置或全局 Git 配置。
