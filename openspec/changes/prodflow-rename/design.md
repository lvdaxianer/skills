# 设计：prodflow Skill 重命名与流程 README

## 目标

把 `prodflow` 作为唯一当前总控 Skill 名称，同时让 README 成为使用者理解整个交付闭环的入口，而不是重复 Skill 规则的第二套实现。

## 设计决策

1. 采用目录级 canonical rename：`product-delivery-workflow/` 移动为 `prodflow/`，并更新当前有效相对路径。
2. 历史 OpenSpec archive 不重写；代码和当前文档中的 actor、managedBy、运行说明改为 `prodflow`，MCP serverInfo 继续保留兼容名 `product-delivery-workflow-rsi`。
3. README 采用“先看全流程，再看环境职责，再看 RSI，再看证据与故障排查”的结构，明确区分事实源、运行时产物和派生投影。
4. README 不复制领域 Skill 的细则，只说明何时交接并链接到权威 Skill、协议和 API 文档。
5. 变更以引用扫描和现有控制平面全量测试为主要验证；重命名本身不新增业务 API。

## 流程内容边界

README 必须覆盖：入口分流、PRD 选择与三 Worker 独立复检、交互账本、开发交接、任务验证、最终审计、部署决策、错误/知识回流、公共与项目上下文、SQLite 一致性、RSI 三层快照和三种注入方式。

## 风险与恢复

- 外部调用者仍可能引用旧路径；通过当前有效引用扫描发现遗漏，历史归档不作为当前入口。
- 改名若导致 Node 测试路径或脚本失效，必须在提交前修正，不能用兼容软链接掩盖引用错误。
- README 只做说明，不作为运行时事实源；运行时仍以 `.product/` 文件和控制平面响应为准。
