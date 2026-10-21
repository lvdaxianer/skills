---
name: code-review-spec
description: Use when reviewing, formatting, or editing code. Follow `/code-review-spec/spec.md` and `references/*.md`. Trigger automatically on code changes.
---

# code-review-spec

用于代码审查、格式化、代码修改。

适用全部语言：Java、Python、Go、TypeScript、Vue 等。

规则：
1. 主规范：`/code-review-spec/spec.md`
2. 细则：`references/*.md`
3. 有 git 看 `git diff`；无 git 全局
4. 先确认范围；强制项有一项不通过即不通过
5. 新增或修改代码注释时，必须使用中文注释
6. JSDoc 必须使用多行格式：`/**` 与 `*/` 各自独占一行，方法描述以及每个以 `@` 开头的文档标签各自独占一行，禁止生成单行 JSDoc
7. 按规范审查报告格式输出
8. 审查 HTTP 请求、Controller、Handler、Gateway、Filter、Middleware 或 AOP 时，必须确认统一请求入口使用 INFO 记录请求标识、开始时间、结束时间、总耗时、结果状态和 traceId；Controller/Handler 不得重复记录该审计日志
9. 审查第三方 HTTP、RPC、SDK 调用时，必须确认正常调用使用 DEBUG 记录调用目标、开始时间、结束时间和耗时；慢调用、失败或超时继续使用 WARN 记录安全上下文
10. 审查线程中同步调用 HTTP、RPC、SDK 或其他阻塞远程服务时，必须确认使用与核心请求线程池及其他业务线程池隔离的专用线程池，并配置连接、读取、整体调用超时、有界队列和拒绝策略
11. 审查新增或修改的对外 HTTP 接口时，必须确认遵循 RESTful 规范：资源标识（id 等）拼接到 path，分页、排序、筛选等元信息使用 query params，body 仅承载 POST/PUT/PATCH 的资源数据，例外场景必须在接口文档中说明理由
