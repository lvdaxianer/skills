# 设计：RSI 运行时接入

## 目标

让“生成快照”和“把快照注入工具”成为两个可验证的运行时步骤：前一步产出固定 `snapshotId`，后一步返回具体注入方式、路径或 MCP 配置，并留下追加式审计。

## 关键决策

1. 控制平面通过显式 `POST /api/rsi/snapshots/:snapshotId/inject/:provider` 调用 Adapter，不在生成快照时隐式注入。
2. 文件注入只写 `.product/rsi/providers/<provider>/`；Prompt 注入返回有字节上限的内容；MCP 注入返回可执行命令和配置元数据。
3. 注入审计写入项目级 `.product/rsi/audit.jsonl`，它是运行证据，不参与公共或项目知识上下文，避免污染 RSI。
4. MCP 使用独立 Node stdio 进程，stdout 只输出 JSON-RPC 响应，启动错误写 stderr 并以非零状态结束。
5. 任何成功响应必须包含 `snapshotId`、`provider`、`injectionMethod`、`status` 和可验证的 manifest 或配置；降级和失败也必须可追溯。

## 失败与恢复

- 未知 provider、快照不存在、模式不支持等输入错误返回稳定错误码和 4xx，不写入宿主规则文件。
- Prompt 超出预算时返回 `fallback`，并记录实际采用的字节预算。
- 文件写入或审计写入失败时返回 `failed`；不把“目录存在”误报为“注入成功”。
- MCP 参数不合法或初始化依赖失败时进程返回非零，且不向 stdout 写非 JSON 内容。
