# Spec Delta

## Purpose

提供一个可删除、可重建的 SQLite 查询投影，把多个项目和公共知识文件汇总为可筛选的全局目录，同时通过版本、哈希、检查点和错误状态保证投影与文件事实源最终一致。

## ADDED Requirements

### Requirement: 文件事实源必须是唯一权威来源

系统 MUST 将本地项目文件和公共知识文件作为权威事实源，SQLite MUST 只保存可重建查询投影，任何 SQLite 记录都必须能够追溯到文件事件和内容哈希。

#### Scenario: SQLite 被删除

- **WHEN** SQLite 文件被删除或损坏
- **THEN** 系统 MUST 能从已注册项目和公共知识文件重建查询投影，且不得丢失文件事实

#### Scenario: SQLite 直接被修改

- **WHEN** 外部修改了 SQLite 投影内容
- **THEN** 系统 MUST 通过校验或重建检测漂移，不把未经文件事实源确认的内容返回为权威结果

### Requirement: 文件事件必须可投影和重试

系统 MUST 为每个事实事件保存唯一事件 ID、版本或时间序列和内容哈希，并允许投影失败后从上次检查点继续重试。

#### Scenario: 投影中途进程退出

- **WHEN** 文件事件已写入但 SQLite 事务未提交
- **THEN** 服务重启后 MUST 重新投影未确认事件，不产生重复有效记录

#### Scenario: 投影事件格式损坏

- **WHEN** 单个文件事件无法解析
- **THEN** 系统 MUST 保留其他事件投影，并将该事件和项目标记为 error

### Requirement: 同步状态必须可观察

系统 MUST 保存每个项目和公共根目录的 `synced`、`pending`、`error`、`conflict` 或 `rebuilding` 状态、最后成功检查点和错误摘要。

#### Scenario: 文件事实等待投影

- **WHEN** 新事实事件尚未完成 SQLite 投影
- **THEN** 查询 API MUST 返回 pending 状态或明确提示结果可能滞后

#### Scenario: 文件与投影哈希不一致

- **WHEN** 检查点发现文件哈希与 SQLite 记录不一致
- **THEN** 系统 MUST 标记 conflict 或 rebuilding，并阻止错误地报告完全同步

### Requirement: 重建必须安全且幂等

系统 MUST 支持按全部文件事实重建 SQLite 投影，重建过程不得改写或删除源文件，重复重建结果必须一致。

#### Scenario: 操作者触发全量重建

- **WHEN** 操作者确认重建全局目录
- **THEN** 系统 MUST 写入 rebuilding 状态，完成后更新检查点和内容哈希

#### Scenario: 重建失败

- **WHEN** 重建过程中发生错误
- **THEN** 系统 MUST 保留旧投影或标记不可用状态，并保留错误详情供重试
