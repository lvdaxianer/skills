# knowledge-ownership Specification

## Purpose

为问题和规则建立可追踪的公共、项目与 hybrid 归属模型，支持安全移动和复制复用，让人工可以修正自动分类结果，同时不丢失原始证据、来源项目和历史决策。

## Requirements

### Requirement: 归属模型必须区分公共项目和 hybrid

系统 MUST 支持 `common`、`project`、`hybrid` 和 `unknown` 归属，并为项目归属保存项目标识；未经过人工确认的事件 MUST 保持 `unknown`。

#### Scenario: 人工确认项目归属

- **WHEN** 操作者将 unknown 问题归属到项目 A
- **THEN** 系统 MUST 保存项目标识、操作者、原因和版本，并将项目规则写入项目事实源

#### Scenario: 人工确认公共归属

- **WHEN** 操作者将问题归属到 common
- **THEN** 系统 MUST 要求脱敏、可移植性和独立复检门禁通过后才发布公共规则

### Requirement: 移动和复制必须是不同操作

系统 MUST 将归属移动建模为所有权变化，将复制复用建模为新规则引用；复制公共规则到项目不得删除或改变原公共规则。

#### Scenario: 公共规则复制到项目

- **WHEN** 操作者将公共规则复用到项目 A
- **THEN** 系统 MUST 创建项目适配记录并保留对公共规则版本的引用

#### Scenario: 项目问题移动到公共

- **WHEN** 操作者请求把项目 A 的问题移动为公共候选
- **THEN** 系统 MUST 先进入公共候选状态，完成公共晋升门禁后才能进入公共有效规则

### Requirement: 归属变化必须可回放

系统 MUST 追加归属变化事件，事件至少包含来源归属、目标归属、项目标识、操作者、原因、时间和关联版本。

#### Scenario: 查看归属历史

- **WHEN** 操作者打开问题的归属历史
- **THEN** 系统 MUST 按时间顺序展示每次移动、复制、覆盖、排除和恢复

#### Scenario: 归属写入失败

- **WHEN** 归属变化无法写入文件事实源
- **THEN** 系统 MUST 不更新查询投影，也不得返回迁移成功

### Requirement: 有效规则必须遵循覆盖优先级

系统 MUST 按项目规则优先于 hybrid、hybrid 优先于 common 的顺序计算项目有效规则，并保留被覆盖规则的来源引用。

#### Scenario: 项目规则覆盖公共规则

- **WHEN** 项目 A 存在与公共规则相同指纹的项目覆盖
- **THEN** 项目 A 的有效规则 MUST 使用项目覆盖，同时展示公共规则和覆盖关系
