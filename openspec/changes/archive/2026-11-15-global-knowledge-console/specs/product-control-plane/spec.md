# Spec Delta

## MODIFIED Requirements

### Requirement: 控制平面状态必须持久化

控制服务 MUST 将权威状态、消息账本、知识版本和审计变更写入项目文件；SQLite 只能作为跨项目可重建查询投影，任何投影记录都 MUST 可追溯到文件事实源和内容哈希。

#### Scenario: 服务重启后恢复运行

- **WHEN** 控制服务重新启动
- **THEN** 系统 MUST 从文件恢复运行、未消费消息、知识归属和审计记录，并从检查点继续更新 SQLite 投影

#### Scenario: SQLite 投影损坏

- **WHEN** SQLite 文件被删除、损坏或检测到哈希漂移
- **THEN** 系统 MUST 保留文件事实，标记投影不可用或 rebuilding，并允许从项目和公共文件重建

### Requirement: UI 必须支持人工管理知识归属

控制台 MUST 允许有权限的操作者在全局范围查看、创建、编辑、归类、移动、复制、发布、排除和恢复共通或项目知识，并保存版本和审计记录；控制台 MUST 展示项目规则继承、覆盖和跨项目差异。

#### Scenario: 人工修改问题归属

- **WHEN** 操作者将问题从 `unknown` 改为 `project`
- **THEN** 系统 MUST 写入新版本、操作者、原因和时间，更新项目事实源并异步更新全局查询投影

#### Scenario: 排除问题

- **WHEN** 操作者将问题标记为 `excluded`
- **THEN** 系统 MUST 使其不再参与 Worker 检索，同时保留原始证据、归属历史和审计链

#### Scenario: 查看跨项目规则

- **WHEN** 操作者在全局控制台选择项目或多个项目
- **THEN** 系统 MUST 展示每个项目的有效规则、公共继承、项目覆盖和同步状态

### Requirement: 消息调度必须遵守目标和动作路由

控制平面 MUST 只将 `action=execute` 且目标为当前 Worker 的请求投递为待执行任务，并为每次处理记录处理和结果状态；全局知识查询或投影失败不得改变消息路由语义。

#### Scenario: Worker 消费执行请求

- **WHEN** 账本新增目标为某 Worker 且 `action=execute` 的消息
- **THEN** 该 Worker MUST 能领取消息并写入 `processing`、终态和结果引用

#### Scenario: 告知消息不触发执行

- **WHEN** 账本新增 `kind=inform` 或 `action=none` 的消息
- **THEN** 系统 MUST 只记录消息，不将其加入执行队列
