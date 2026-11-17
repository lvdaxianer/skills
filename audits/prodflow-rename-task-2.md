# T2 任务级证据：完整流程 README

## Gate

PASS：`prodflow/README.md` 已成为从需求到交付、从环境职责到 RSI 的中文总览入口。

## Evidence

- RED：新增 README focused test 在旧 README 上因缺少“需求分流”和当前控制平面命令失败。
- GREEN：`node --test prodflow/test/prodflow-readme.test.mjs`：2/2 通过。
- README 链接检查：10 个相对链接全部存在。
- `npm test --prefix prodflow/references/control-plane`：79/79 通过。
- README 明确说明不覆盖 `CLAUDE.md`、`AGENTS.md`，并描述文件、Prompt、MCP 三种 RSI 注入方式及 `.product/rsi/audit.jsonl`。
- README 明确说明用户输入、Control Plane、三 Worker、开发、测试/验收、部署和知识治理的职责边界。

## Review notes

- README 只做流程总览和入口导航，具体执行规则仍由 `SKILL.md` 和 references 负责。
- 不改变控制平面 API、MCP 协议和部署行为。
- 当前有效文档使用 `prodflow/references/...` 路径。

## Result

T2.1、T2.2、T2.3 完成，允许进入最终集成审计。
