# logging-boundaries Specification

## Purpose
统一生产业务日志的 traceId 关联和定时任务输出边界，让跨服务调用可以按同一个 traceId 检索，同时避免正常定时任务持续产生无诊断价值的日志噪声。

## Requirements

### Requirement: 业务日志必须关联有效 trace context

业务入口在输出业务日志前 MUST 建立有效 trace context；有上游上下文时透传，没有上游上下文时由链路起点生成 `traceId`。系统级启动、框架初始化、健康检查等日志可以豁免。

#### Scenario: HTTP 请求缺少上游 traceId
- **WHEN** HTTP 请求没有携带有效的 trace context
- **THEN** 请求入口生成新的 `traceId`，后续业务日志和响应关联该 ID

#### Scenario: 定时任务作为链路起点
- **WHEN** 定时任务开始执行且没有入站请求
- **THEN** 任务上下文生成本次执行的 `traceId`，但不因生成 ID 而强制输出正常成功日志

### Requirement: traceId 必须贯穿跨服务调用链

HTTP、MQ、RPC 及其派生异步调用 MUST 传播当前链路的 `traceId`；每个参与服务的关键业务日志 MUST 能使用该 ID 关联，日志平台按 `traceId` 查询时应能获得已产生的跨服务日志。

#### Scenario: 服务调用下游服务
- **WHEN** 服务 A 使用 `traceId=abc` 调用服务 B
- **THEN** 服务 B 接收并绑定同一个 traceId，服务 A 与服务 B 的关键业务日志可按 `abc` 查询

#### Scenario: 异步任务继承链路
- **WHEN** 请求派生异步任务
- **THEN** 异步任务继承父链路 traceId，执行结束后清理上下文，避免线程复用串链

### Requirement: 定时任务正常执行默认静默

定时任务正常成功且没有诊断条件时 MUST NOT 固定输出 INFO 级别的开始、结束或逐步进度日志；吞吐、耗时、成功率等高频数值 MUST 使用 Metrics 表达。

#### Scenario: 普通定时任务成功
- **WHEN** 定时任务成功完成且未开启诊断、未发生状态变化或告警条件
- **THEN** 不输出固定的成功开始/结束业务日志，相关统计通过 Metrics 记录

#### Scenario: 批处理循环执行
- **WHEN** 定时任务循环处理多条数据
- **THEN** 不逐条输出业务日志，改用批次汇总、有限失败采样或受控进度心跳

### Requirement: 定时任务仅在特定条件下输出

定时任务 MUST 在失败、超时、失败率超阈值、重要状态变化或人工诊断开关开启时输出相应日志，并为这些日志绑定本次执行的 traceId；诊断日志 MUST 可按任务范围、时间窗口或采样上限控制。

#### Scenario: 定时任务失败
- **WHEN** 任务发生未预期异常或整体失败
- **THEN** 输出带 traceId 和完整异常堆栈的 ERROR 日志

#### Scenario: 任务满足告警条件
- **WHEN** 失败率、耗时或业务状态达到预设阈值
- **THEN** 输出有限的 WARN/ERROR 摘要，带任务标识、执行标识、traceId 和安全上下文

#### Scenario: 人工诊断指定一次任务
- **WHEN** 运维在任务执行前指定诊断 traceId 或开启目标任务的临时诊断开关
- **THEN** 本次任务及其下游调用输出受控关键日志，并可按该 traceId 检索完整已产生日志

### Requirement: 日志不存在时不得声称可追溯

日志治理 MUST 明确：traceId 只能关联已经产生的日志，不能在任务完成后补回此前被静默抑制的日志；需要完整排障时 MUST 在执行前开启诊断或采样策略。

#### Scenario: 事后查询普通静默任务
- **WHEN** 普通定时任务已成功完成且执行期间没有产生业务日志
- **THEN** 按该任务 traceId 查询不到被抑制的过程日志，系统应依赖任务执行记录和 Metrics 提供结果
