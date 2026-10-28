# Proposal: add installation README for design-to-development

## Why

`design-to-development` 依赖多个规范 Skill。只提供 `SKILL.md` 会让首次安装的 AI 不知道依赖清单、目标目录、平台差异和验证方式，容易出现主 Skill 已复制但运行时缺少关键规范的半安装状态。

## What changes

- 在 `design-to-development/README.md` 提供面向 AI 的安装协议。
- 固化必需依赖与条件依赖的清单及 `superpowers:brainstorming` 的平台映射。
- 支持 Claude Code、Codex 以及项目级 Skill 目录的本地复制或软链接安装。
- 增加冲突保护、缺失依赖处理和安装后验证要求。

## Non-goals

- 不改变 `design-to-development` 的开发流程或技术架构。
- 不执行真实环境安装，不新增未知远程下载源。
