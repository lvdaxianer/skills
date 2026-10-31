# Proposal

## Why

列表或表格在手动刷新、切换筛选和自动轮询时不应因加载状态切换而整块消失再出现。将防闪烁规则写入前端交互技能，可以让后续实现默认保留旧内容、减少无意义重绘，并用慢网络场景验证 DOM 稳定性。

## What Changes

- 在前端交互技能中新增列表/表格刷新防闪烁的硬性规则。
- 要求刷新期间保持已有列表、分页和统计区域挂载，仅首次无数据加载允许使用全屏占位。
- 要求使用稳定 ID 作为 row key，并按 ID 浅比较合并数据，复用未变化行的对象引用。
- 要求手动刷新和自动轮询都使用轻量增量更新，并覆盖过期响应保护。
- 要求通过约 1 秒接口延迟验证刷新期间列表 DOM 节点不重建，并完成相关测试与类型检查。

## Capabilities

### New Capabilities

无。本次只更新技能规范，不引入项目运行时能力。

### Modified Capabilities

无。本次不修改项目 OpenSpec 的运行时需求；`skip_specs: true`。

## Impact

- Affected files: `frontend-interaction-guidelines/SKILL.md`。
- No application code, API, dependency, or runtime behavior changes.
- Documentation verification will use the OpenSpec validator and targeted content checks.
