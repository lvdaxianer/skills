---
name: commit
description: Create Chinese Conventional Commit messages with emoji prefixes and mandatory body/footer sections for this project
---

# Commit Skill

## 项目级提交规范（Project Commit Standard）

本 skill 为 `lvdaxianer-skills` 项目定制，强制执行中文 Conventional Commit + emoji + body/footer 非空规范。

## 硬性要求（Non-Negotiable Rules）

1. **提交记录必须使用中文**
   - Subject 描述必须中文
   - Body 内容必须中文
   - Footer 可包含英文技术术语（如 `Refs:`、`BREAKING CHANGE:`、issue ID）

2. **提交标题必须以 type 对应 emoji 开头**
   - 格式：`<emoji> <type>[optional scope]: <中文描述>`
   - 示例：`🐛 fix(topo): 修复拓扑离线资源缺失问题`

3. **默认提交记录必须包含 body 和 footer**
   - 除非用户显式要求 `--style=simple`，否则 body 和 footer **不得为空**
   - Body 至少 1 行非空内容（解释 what/why）
   - Footer 至少包含 `Refs:` 或其他追溯信息

**违反上述任一条即为不合规提交**。

## Commit Types & Emojis

| Type | Emoji | 描述 | 使用场景 |
|------|-------|------|----------|
| `feat` | ✨ | 新功能 | 添加新功能 |
| `fix` | 🐛 | Bug 修复 | 修复问题 |
| `docs` | 📝 | 文档 | 只改文档 |
| `style` | 🎨 | 代码格式 | 格式化、缺少分号等 |
| `refactor` | ♻️ | 代码重构 | 既不修复 bug 也不添加功能 |
| `perf` | ⚡️ | 性能优化 | 性能改进 |
| `test` | ✅ | 测试 | 添加缺失的测试 |
| `chore` | 🔧 | 维护 | 构建流程或工具变更 |
| `ci` | 👷 | CI/CD | CI 配置变更 |
| `build` | 📦 | 构建系统 | 影响构建系统的变更 |
| `revert` | ⏪ | 回退 | 回退之前的提交 |

## Full Style（默认）

```
<emoji> <type>[optional scope]: <中文描述>

<body 中文内容，解释 what 和 why>

<footer>
```

### 示例

```
✨ feat(auth): 添加 JWT token 验证

之前应用允许未认证访问用户 profile 端点，存在安全漏洞。

本次提交添加完整的认证中间件：
- 在所有受保护路由上验证 JWT token
- 实现 token 刷新逻辑
- 添加速率限制防止暴力破解
- 验证 token 过期时间
- 从 payload 提取用户 claims
- 将用户上下文添加到 request 对象
- 处理 refresh token 轮换

Refs: auth token validation
```

## Simple Style（仅在显式要求时使用）

```
<emoji> <type>[optional scope]: <中文描述>
```

示例：`✨ feat(auth): 添加 JWT token 验证`

**注意**：Simple style 只在用户明确要求时使用，默认必须用 Full style。

## Body Section Guidelines

Body 是必需的（默认模式）。应该：
- 解释**做了什么**和**为什么**（不是怎么做）
- 多个变更用列表
- 包含变更动机
- 对比与之前行为的差异
- 引用相关 issue 或决策
- 每行不超过 72 个字符

好的 body 示例：
```
之前应用允许未认证访问用户 profile 端点，存在安全漏洞。

本次提交添加完整的认证中间件：
- 在所有受保护路由上验证 JWT token
- 实现 token 刷新逻辑
- 添加速率限制防止暴力破解
```

## Footer Section Guidelines

Footer 用于：
- 追溯信息（`Refs:`）
- Breaking changes（`BREAKING CHANGE:`）
- Issue 关闭（`Closes:`、`Fixes:`）
- Co-authors（`Co-Authored-By:`）

**默认模式下 footer 不能为空**。如果没有 breaking change、issue、co-author，至少写 `Refs: <相关上下文>`。

示例：
```
Refs: OpenSpec CHG-001 task T1
```

```
BREAKING CHANGE: API 端点 /users 现在需要认证
Refs: security enhancement
```

```
Fixes: #123
Refs: bug fix for authentication
```

## Git Commit 命令格式

使用 HEREDOC 确保多行提交格式正确：

```bash
git commit -m "$(cat <<'EOF'
✨ feat(auth): 添加 JWT token 验证

之前应用允许未认证访问用户 profile 端点，存在安全漏洞。

本次提交添加完整的认证中间件：
- 在所有受保护路由上验证 JWT token
- 实现 token 刷新逻辑
- 添加速率限制防止暴力破解

Refs: auth token validation
EOF
)"
```

**不要**使用单引号 `git commit -m "...\n\n..."` 这种形式做多行提交，很多 shell 会把 `\n` 当成字面字符而不是换行。

## Co-Authored-By 格式（与 Claude 协作时）

当 Claude Code 协助完成代码时，提交 footer 应包含：

```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

完整示例：
```
✨ feat(auth): 添加 JWT token 验证

之前应用允许未认证访问用户 profile 端点，存在安全漏洞。

本次提交添加完整的认证中间件，包含 JWT 验证、token 刷新、速率限制等。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
Refs: auth token validation
```

## OpenSpec 集成

当提交属于某个 OpenSpec change 的 task 时，footer 应包含追溯信息：

```
Refs: OpenSpec <change-name> task <task-id>
```

示例：
```
✨ feat(order): 实现支付模块

支付模块需要集成微信支付和支付宝支付，包含支付回调处理、订单状态更新、支付失败重试逻辑。

本次提交完成微信支付集成，包括：
- 微信支付 SDK 接入
- 支付请求签名验证
- 支付回调接口
- 订单状态同步

Refs: OpenSpec 订单系统重构 task T1
```

## Commit Splitting Guidelines

当一次提交包含多个独立变更时，应拆分成多个提交：

**不好的做法**（混合多个变更）：
```
✨ feat: 添加用户认证和订单导出功能

添加了 JWT 认证中间件，同时实现了订单导出 Excel 功能。
```

**好的做法**（拆分独立提交）：
```
Commit 1:
✨ feat(auth): 添加 JWT token 验证

实现 JWT 认证中间件，包含 token 验证、刷新、速率限制。

Refs: auth enhancement

---

Commit 2:
✨ feat(order): 添加订单导出功能

实现订单导出 Excel，包含筛选、分页、异步任务。

Refs: order export feature
```

## Verification Checklist

提交前检查：
- [ ] Subject 是中文描述
- [ ] Subject 以正确的 type emoji 开头
- [ ] Subject 不超过 50 个字符（建议）
- [ ] Body 至少 1 行非空内容（解释 what/why）
- [ ] Footer 至少包含 `Refs:` 或其他追溯信息
- [ ] Body 和 footer 之间有空行分隔
- [ ] 如果与 Claude 协作，footer 包含 `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- [ ] 如果属于 OpenSpec task，footer 包含 `Refs: OpenSpec <change> task <id>`
