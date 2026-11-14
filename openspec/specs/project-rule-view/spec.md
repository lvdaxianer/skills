# project-rule-view Specification

## Purpose

为每个项目提供可解释的有效规则视图，展示本地规则、继承的公共规则、hybrid 适配和覆盖关系，并支持项目之间的差异比较。

## Requirements

### Requirement: 项目规则视图必须展示有效规则

系统 MUST 返回项目当前生效的规则集合，并标识每条规则的来源、版本、归属层级、状态和证据引用。

#### Scenario: 查看项目有效规则

- **WHEN** 操作者打开项目 A 的规则页面
- **THEN** 系统 MUST 展示项目规则、hybrid 规则和继承的公共规则，并标记最终生效来源

#### Scenario: 排除项目规则

- **WHEN** 项目 A 的规则被排除
- **THEN** 项目 A 的有效规则中 MUST 移除该规则，但公共原规则和历史证据仍保留

### Requirement: 项目规则视图必须展示继承和覆盖关系

系统 MUST 为每条项目有效规则提供 `inherited`、`overridden`、`local` 或 `hybrid` 状态，并可跳转到来源规则和归属历史。

#### Scenario: 项目覆盖公共规则

- **WHEN** 项目 A 使用本地规则覆盖公共规则 R
- **THEN** 页面 MUST 同时显示 R、本地覆盖版本和覆盖原因

### Requirement: 系统必须支持跨项目规则差异

系统 MUST 支持选择至少两个项目并比较规则的存在、版本、解决方案、严重级别和覆盖状态。

#### Scenario: 比较两个项目

- **WHEN** 操作者选择项目 A 和项目 B
- **THEN** 系统 MUST 展示两者共有规则、仅 A 规则、仅 B 规则和同一规则的字段差异

### Requirement: 项目视图必须受同步状态约束

系统 MUST 在项目或公共文件未完成投影时显示同步提示，并禁止操作者将不完整的查询结果当作最终归属结论。

#### Scenario: 项目正在重建

- **WHEN** 项目 A 的规则投影状态为 rebuilding
- **THEN** 页面 MUST 显示重建状态，并标记当前差异结果可能不完整
