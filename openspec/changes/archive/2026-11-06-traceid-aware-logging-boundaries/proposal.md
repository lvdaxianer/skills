# Proposal

## Why

当前日志规范同时强调业务链路必须带 `traceId`、定时任务必须打印开始/结束日志，容易让高频定时任务持续刷屏，也没有清楚区分“链路关联”与“是否应该产生日志”。需要把跨服务链路检索能力与定时任务按条件输出的降噪策略统一定义，保证需要排障时可以按同一个 `traceId` 查到完整调用链。

## What Changes

- 明确业务日志在建立有效 trace context 后输出；入口负责透传或生成 `traceId`，而不是要求所有场景都必须从上游接收。
- 明确 HTTP、MQ、RPC 及其派生异步调用必须传播同一个 `traceId`，日志平台可以按 `traceId` 查询跨服务链路。
- 将定时任务调整为默认静默：正常成功执行不固定输出 INFO；失败、超时、状态变化、阈值告警和人工诊断时才输出，并带本次执行的 `traceId`。
- 规定定时任务诊断运行的触发方式：在执行前指定或生成诊断 `traceId`；如果执行期间没有产生日志，事后不能依靠 `traceId` 补回日志。
- 保留循环汇总、失败采样、Metrics 和受控 DEBUG 等降噪边界，禁止逐条业务日志。

## Capabilities

### New Capabilities

- `logging-boundaries`: 统一业务日志 trace context 关联、跨服务传播和定时任务条件输出规则。

### Modified Capabilities

无。

## Impact

- 影响 `logging-boundaries/SKILL.md`、`scenarios/scheduled-job.md`、`references/decision-matrix.md` 和 `references/anti-patterns.md`。
- 不修改业务运行时代码、公共 API 或依赖；只更新日志治理技能文档及其 OpenSpec 契约。
- 验证重点为 OpenSpec 严格校验、文档内部一致性、示例与检查清单覆盖，以及日志规则与 traceId/定时任务边界的一致性。
