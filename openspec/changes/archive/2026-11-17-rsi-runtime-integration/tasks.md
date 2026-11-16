## 1. 控制平面 Provider 注入

- [x] 1.1 先写控制平面注入、审计和宿主文件保护的 focused RED 测试
- [x] 1.2 接入 `RsiProviderAdapterRegistry`，实现文件、Prompt、MCP 三种显式注入响应和 JSONL 审计
- [x] 1.3 做代码审查、运行 focused/full tests 和任务级证据审计，提交任务变更

## 2. 独立 MCP 启动入口

- [x] 2.1 先写 MCP 独立进程和 npm script 的 focused RED 测试
- [x] 2.2 实现 stdio 启动器，补文档和端到端 smoke test，完成审查与提交

## 3. 最终集成审计

- [x] 3.1 在 master 上运行 strict OpenSpec、完整测试、Node 静态检查和真实链路核验，归档 change 并清理 worktree
