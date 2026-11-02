# Proposal

## Why

后端把框架异常名或英文服务器错误直接返回前端时，调用方无法稳定展示，也会暴露实现细节。需要把用户可见错误、内部原始异常和请求级 traceId 分层定义，统一约束异常捕获、日志和恢复路径。

## What Changes

- 在后端可靠性技能中新增稳定错误契约、错误类型枚举和全局异常映射规则。
- 要求前端只收到机器可处理的错误码、明确中文消息和 traceId，不返回框架异常名、堆栈或内部细节。
- 要求全局异常处理器记录脱敏后的原始异常与完整堆栈，并避免异常在多层重复记录。
- 要求请求入口生成或透传 traceId，写入请求上下文（Java/Spring 为 MDC/ThreadLocal 兼容实现），响应、日志和异步任务保持一致，并在请求/任务结束时清理。
- 在日志边界技能中补充原始异常、脱敏、traceId 自动注入和线程池上下文传播的约束。

## Capabilities

### New Capabilities

无。本次只更新技能规范，不引入项目运行时能力。

### Modified Capabilities

无。本次不修改项目 OpenSpec 的运行时需求；`skip_specs: true`。

## Impact

- Affected files: `backend-reliability-guidelines/SKILL.md` and `logging-boundaries/SKILL.md`。
- No application code, API implementation, dependency, or deployment change.
- Future backend implementations and reviews will use the new error and traceability rules.
