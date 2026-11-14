# product-control-plane Specification

## Purpose
提供一个只监听本机的本地控制平面，用于统一管理需求运行、Worker 消息、知识归属、验证证据和人工审计，并保证总控 Skill 在服务重启后仍能恢复未完成状态。

## Requirements

### Requirement: 总控执行前必须确保控制服务可用

总控 Skill MUST 在每次运行前检查绑定当前项目的本地控制服务；服务未监听时 MUST 启动它，并在健康检查和就绪检查通过后才继续。

#### Scenario: 服务未运行时自动启动
- **WHEN** 配置端口没有可用的 `/healthz` 响应
- **THEN** 系统 MUST 启动 references 下的 Node 服务，并验证 `/healthz` 与 `/readyz`

#### Scenario: 端口被其他服务占用
- **WHEN** 配置端口被未绑定当前项目的进程占用
- **THEN** 系统 MUST 不终止该进程，并改用安全端口或报告阻塞

### Requirement: 控制服务必须绑定项目

控制服务 MUST 在运行元数据中记录项目根目录、共享知识库根目录、服务版本、进程 ID 和端口，并拒绝为不同项目复用未验证的实例。

#### Scenario: 复用同一项目服务
- **WHEN** 健康服务的项目根目录和版本与当前运行匹配
- **THEN** 系统 MUST 复用该实例并创建新的 run

#### Scenario: 服务绑定其他项目
- **WHEN** 监听服务的项目根目录与当前项目不一致
- **THEN** 系统 MUST 不复用该实例，并启动新实例或报告端口冲突

### Requirement: 控制平面状态必须持久化

控制服务 MUST 将权威状态、消息账本、知识版本和审计变更写入项目文件；SQLite 只能作为跨项目可重建查询投影，任何投影记录都 MUST 可追溯到文件事实源和内容哈希。

#### Scenario: 服务重启后恢复运行
- **WHEN** 控制服务重新启动
- **THEN** 系统 MUST 从文件恢复运行、未消费消息、知识归属和审计记录

#### Scenario: SQLite 投影损坏

- **WHEN** SQLite 文件被删除、损坏或检测到哈希漂移
- **THEN** 系统 MUST 保留文件事实，标记投影不可用或 rebuilding，并允许从项目和公共文件重建

### Requirement: UI 必须支持人工管理知识归属

控制台 MUST 允许有权限的操作者在全局范围查看、创建、编辑、归类、移动、复制、发布、排除和恢复共通或项目知识，并保存版本和审计记录；控制台 MUST 展示项目规则继承、覆盖和跨项目差异。

#### Scenario: 人工修改问题归属
- **WHEN** 操作者将问题从 `unknown` 改为 `project`
- **THEN** 系统 MUST 写入新版本、操作者、原因和时间，并更新项目索引

#### Scenario: 查看跨项目规则

- **WHEN** 操作者在全局控制台选择项目或多个项目
- **THEN** 系统 MUST 展示每个项目的有效规则、公共继承、项目覆盖和同步状态

#### Scenario: 排除问题
- **WHEN** 操作者将问题标记为 `excluded`
- **THEN** 系统 MUST 使其不再参与 Worker 检索，同时保留原始证据和审计链

### Requirement: 消息调度必须遵守目标和动作路由

控制平面 MUST 只将 `action=execute` 且目标为当前 Worker 的请求投递为待执行任务，并为每次处理记录处理和结果状态。

#### Scenario: Worker 消费执行请求
- **WHEN** 账本新增目标为某 Worker 且 `action=execute` 的消息
- **THEN** 该 Worker MUST 能领取消息并写入 `processing`、终态和结果引用

#### Scenario: 告知消息不触发执行
- **WHEN** 账本新增 `kind=inform` 或 `action=none` 的消息
- **THEN** 系统 MUST 只记录消息，不将其加入执行队列
