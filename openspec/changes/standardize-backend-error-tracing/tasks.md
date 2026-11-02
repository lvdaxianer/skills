# Tasks

## 1. 后端错误契约规范

- [x] 1.1 在 `backend-reliability-guidelines/SKILL.md` 增加稳定错误响应与 trace 上下文规则，覆盖错误类型枚举、中文消息、全局异常映射、原始异常日志、响应字段和 ThreadLocal/MDC 清理；通过定向文本检查确认规则完整且不要求直接暴露原始异常。

## 2. 日志边界规范

- [x] 2.1 在 `logging-boundaries/SKILL.md` 增加异常原文脱敏记录、traceId 自动注入、异常堆栈保留、重复记录避免和异步线程上下文透传要求；通过定向文本检查确认与现有日志铁律和异步场景规则一致。

## 3. 统一验证

- [x] 3.1 运行 `openspec validate standardize-backend-error-tracing --strict`、Markdown/diff 检查，并核对变更只涉及两个技能正文与 OpenSpec 规划文件，无业务代码或 API 实现变更。

## Workflow follow-up

- 完成 per-task audit、文档 review 和提交后，归档本次 OpenSpec change。
- 将任务分支合并回 `SOURCE_BRANCH=master`，同步两个更新后的 skill 到 Codex、Claude、Kimi 本地目录并验证哈希一致。
