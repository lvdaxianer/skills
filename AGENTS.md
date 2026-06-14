# Codex 默认开发上下文

本仓库的开发任务默认遵循 `development-workflow/SKILL.md`。

## 会话启动规则

每个 Codex 会话开始后，只要任务涉及代码、测试、文档、配置、重构或提交，
都必须先加载并遵守 `development-workflow/SKILL.md`。

该默认流程要求：

- brainstorming-first：需求讨论先用 `superpowers:brainstorming`。
- OpenSpec-plan-first：落地到文件时每次变更都是一个 OpenSpec change，使用 `openspec/changes/<change-name>/` 的 `spec-driven` 结构，并通过 `openspec validate <change-name> --strict`。
- planning-commit-first：OpenSpec 规划提交必须先于实现提交。
- TDD-first：每个任务先写失败测试，确认 RED，再实现 GREEN，并保持可重构。
- review-gated：每个小任务后严格执行 `code-review-spec`，按 canonical 规范修复所有应修复的问题。
- commit-per-task：继续下个任务前执行 `commit --style=full`，创建一个带 body 和 footer 的原子中文 Conventional Commit。
- final-audit-and-report：所有 planned tasks 完成后先做 final audit，再输出 final audit report，列出 completed tasks 和 unfinished tasks，然后再归档 OpenSpec change。

## 执行约束

- 有 git 仓库时先看 `git diff` 与 `git diff --staged`，只在当前任务范围内工作。
- 不跳过测试、构建、lint、文档生成或审查门禁，除非用户明确豁免。
- 不提交无关文件，不覆盖用户已有的未提交改动。
- 默认按 `development-workflow/SKILL.md` 的状态格式报告当前任务、门禁和证据。
