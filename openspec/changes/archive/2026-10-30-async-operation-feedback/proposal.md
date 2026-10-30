# Proposal

## Why

异步操作在用户确认后如果立即关闭弹框、恢复按钮或没有持续反馈，用户无法判断请求是否已提交，容易重复点击、重复提交或误以为操作失败。现有前端交互规范覆盖了防重复和失败恢复，但没有统一规定从触发到请求终态的反馈生命周期，导致删除、保存、发布、支付、上传和批量操作出现不一致体验。

## What Changes

- 为前端异步操作建立统一的 pending、success、error、cancelled 和 long-running 反馈生命周期。
- 要求提交、删除、保存、发布、支付、上传、导入和批量操作在触发后立即进入可识别的处理中状态，并防止重复触发。
- 明确弹框、抽屉和表单在请求完成前的保持、关闭、导航、刷新和后台任务行为。
- 明确成功、失败、超时、取消、离线和部分成功的恢复路径，并要求保留必要的用户输入与上下文。
- 将删除确认场景具体化：确认按钮在删除请求完成前持续 loading，成功或失败后才结束当前确认流程。
- 将生命周期规则同步写入前端交互 skill、交互检查清单和现有 OpenSpec capability。

## Capabilities

### New Capabilities

<!-- No new capability; the existing frontend interaction capability owns this behavior. -->

### Modified Capabilities

- `frontend-interaction-reliability`: 增加异步操作生命周期、持续反馈、防重复触发、终态恢复和操作承载面连续性的要求。

## Impact

- 受影响文件：`frontend-interaction-guidelines/SKILL.md`、`frontend-interaction-guidelines/references/interaction-checklist.md`、对应安装副本，以及 `openspec/changes/async-operation-feedback/` 变更资产。
- 不修改业务前端代码、后端 API、组件库或依赖。
- 不规定具体框架、请求库、分页协议或传输技术；实现可使用现有组件和状态管理能力满足行为契约。
