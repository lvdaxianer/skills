# Tasks

## 1. 技能规则写入与验证

- [x] 1.1 在 `frontend-interaction-guidelines/SKILL.md` 新增列表/表格刷新防闪烁硬性规则，覆盖刷新不卸载、首次加载与刷新态区分、稳定 ID 行级浅合并、手动刷新与自动轮询、慢网络 DOM 验证及测试/类型检查要求；通过定向文本检查确认所有核心约束均存在且未修改无关规则。
- [x] 1.2 运行 `openspec validate prevent-list-refresh-flicker --strict`，并检查完整 diff，确认 OpenSpec、技能正文和任务范围一致且无业务代码变更。

## Workflow follow-up

- 完成 per-task audit、文档 review 和提交后，归档本次 OpenSpec change。
- 将任务分支合并回 `SOURCE_BRANCH=master`，验证集成分支包含该文档变更。
