# Claude Code 技能集

一套用于 [Claude Code](https://claude.ai/code) 的可复用技能，帮助提升开发效率并强制执行最佳实践。

## 技能列表

| 技能 | 描述 | 触发场景 |
|------|------|----------|
| [code-review-spec](code-review-spec/) | 全语言代码审查助手。强制执行严格的 canonical 检查，覆盖注释比例（≥60%）、命名规范、安全规则、异常处理、日志标准、数据库规范、API 设计、批量处理、空值安全等。 | 代码修改、格式化、格式化代码或用户请求代码审查时自动触发。 |
| [commit](commit/) | 提交规范指针技能。统一指向 canonical commit 命令标准，覆盖 Conventional Commit、中文提交信息、提交拆分与提交选项判断。 | 提交变更、生成提交信息或运行 `/commit` 时触发。 |
| [development-workflow](development-workflow/) | 强制开发流程技能。要求先用 Superpowers 编写计划，再按 TDD RED/GREEN 开发，每个小任务后严格执行 code-review-spec 修复与中文 Conventional Commit 提交。 | 开始或执行需要严格流程门禁的开发任务时触发。 |
| [ddd](ddd/) | 领域驱动设计最佳实践 — 限界上下文、实体、值对象、聚合、领域事件、仓储、领域服务、CQRS、事件溯源。 | 讨论 DDD、领域建模、战略设计或复杂业务架构时触发。 |
| [product-manager](product-manager/) | 产品经理最佳实践 — 需求分析、产品规划、用户体验设计、数据驱动决策、A/B 测试、敏捷实践、MVP 思维。 | 讨论产品需求、用户故事、功能设计、用户体验或业务指标时触发。 |
| [story-line](story-line/) | 业务故事线交互式编写。引导用户完成六大核心要素（目标、里程碑、角色、流程、数据流转、异常场景），由 brainstorm 技能驱动细化。可选 Chrome DevTools MCP 测试验证。 | 用户想要创建业务故事线时触发。 |

## 安装方式

### 方式一：克隆到 Claude Code 全局技能目录（推荐）

```bash
# 克隆本仓库
git clone https://github.com/lvdaxianerplus/skills.git

# 将技能复制到 Claude Code 全局技能目录
cp -r skills/code-review-spec ~/.claude/skills/
cp -r skills/commit ~/.claude/skills/
cp -r skills/development-workflow ~/.claude/skills/
cp -r skills/ddd ~/.claude/skills/
cp -r skills/product-manager ~/.claude/skills/
cp -r skills/story-line ~/.claude/skills/
```

### 方式二：项目级安装

```bash
# 在项目根目录下
mkdir -p .claude/skills
cp -r /path/to/skills/code-review-spec .claude/skills/
cp -r /path/to/skills/commit .claude/skills/
cp -r /path/to/skills/development-workflow .claude/skills/
cp -r /path/to/skills/ddd .claude/skills/
cp -r /path/to/skills/product-manager .claude/skills/
cp -r /path/to/skills/story-line .claude/skills/
```

### 验证安装

重启 Claude Code 或重新加载会话，技能将被自动发现并列入可用技能列表。

### 默认 Agent 上下文

将 [`AGENTS.md`](AGENTS.md) 复制到项目根目录，可以让 Codex 在会话开始时加载
`development-workflow` 规则。将 [`CLAUDE.md`](CLAUDE.md) 复制到项目根目录，
可以让 Claude Code 加载同一套默认开发流程。

这两个上下文文件不会替代技能本身，而是统一指向
[`development-workflow/SKILL.md`](development-workflow/SKILL.md)，确保普通开发任务开始前
就启用 plan-first、TDD-first、code-review-gated、中文 Conventional Commit 流程。

## 技能详解

### code-review-spec

- **适用语言**：Java、Python、Go、TypeScript、Vue 等
- **检查项**：代码规范、注释（≥60%）、命名、安全、异常、日志、数据库、API 设计、Git 提交、依赖管理、复杂度限制、空值安全、函数参数、代码重复、魔法数字、集合容量、字符串拼接、equals/hashCode
- **参考资料**：详细的参考文档位于 [`references/`](code-review-spec/references/)

### development-workflow

- **计划**：开发前必须使用 `superpowers:writing-plans`
- **TDD**：每个任务必须完成 RED/GREEN/REFACTOR 校验
- **审查**：每个小任务后运行 `code-review-spec` 并严格修复所有应修复问题
- **提交**：继续下个任务前运行 `commit` 并创建一个原子中文 Conventional Commit

### commit

- **规范来源**：委托给 `/Users/lvdaxianer/.claude/commands/commit.md`
- **适用范围**：提交信息生成、提交拆分判断、提交选项与中文 Conventional Commit 使用
- **冲突处理**：仓库局部规则与 canonical 规范冲突时，采用更严格规则

### ddd

- **战略设计**：限界上下文、通用语言、上下文映射
- **战术设计**：值对象、实体、聚合、领域事件、领域服务、仓储、工厂
- **架构**：四层架构（接口层 → 应用层 → 领域层 → 基础设施层）
- **模式**：CQRS、事件溯源

### product-manager

- **框架**：用户故事地图、5Why 分析法、RICE 优先级评分
- **用户体验**：尼尔森启发式原则、认知负荷理论
- **数据驱动**：漏斗分析、A/B 测试、北极星指标
- **交付物**：方案对比模板、产品评审清单

### story-line

- **依赖**：需要 `brainstorm` 技能（Superpowers 扩展）进行细化
- **可选**：Chrome DevTools MCP 用于自动化浏览器测试
- **输出**：Markdown 故事文件、可选代码骨架、可选测试报告
- **要素**：目标、里程碑、角色、流程、数据流转、异常场景

## 环境要求

- [Claude Code](https://claude.ai/code) CLI 或 IDE 扩展
- `development-workflow` 技能需要：Superpowers 的 `writing-plans`、`test-driven-development`，以及本仓库约定的 `code-review-spec` 与 `commit` 技能
- `commit` 技能需要：`/Users/lvdaxianer/.claude/commands/commit.md` 可读取
- `story-line` 技能需要：Superpowers 扩展的 `brainstorm` 技能
- `story-line` 浏览器测试需要：Chrome DevTools MCP

## 许可证

[MIT](LICENSE)
