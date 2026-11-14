# Design

## Context

当前 `KnowledgeStore` 以项目目录下的 JSON 文件为事实源，控制平面绑定一个项目，查询接口也只读取当前项目。新需求需要跨项目聚合、项目规则差异和全局归属操作，同时必须保留文件事实源的可回放和可重建特性。

## Goals / Non-Goals

**Goals:**

- 让全局控制台查询多个已注册项目和公共 Guardrail。
- 让所有 CRUD、归属移动和复制操作都先写文件事件，再更新 SQLite 投影。
- 让 SQLite 删除、损坏、漂移或投影失败时可以从文件事实完全重建。
- 展示项目有效规则、公共继承、hybrid 适配、项目覆盖和跨项目差异。
- 保留 loopback、操作者/原因审计、软删除和现有 Worker 快照边界。

**Non-Goals:**

- 不引入远程数据库、登录系统、云端协作或多节点分布式锁。
- 不允许用户直接编辑 SQLite，不把 SQLite 当成权威事实源。
- 不物理删除错误、证据、归属历史或审计记录。
- 不改变 PRD、开发交接和部署 Skill 的既有门禁。

## Decisions

### 1. 文件事实源唯一，SQLite 单向投影

所有写操作先追加 JSON 事实事件或写入版本化 JSON 文档，事件包含 `eventId`、`operationId`、`version`、`contentHash` 和 `recordedAt`。SQLite 只保存当前解析结果、索引字段和检查点。选择单向投影而不是双写，是为了避免 SQLite 成功而文件失败时形成不可恢复分叉。

### 2. 共享目录保存项目注册和公共索引

共享知识根目录新增 `registry/projects/*.json` 保存已注册项目的路径、项目名和状态；`control-plane/catalog.sqlite` 保存跨项目查询投影；`control-plane/sync/` 保存投影检查点和错误摘要。项目自身仍保留 `.product/knowledge` 事实目录，公共规则仍保留 `common/guardrails`。

### 3. 投影器采用幂等事件应用和双阶段重建

正常同步按项目注册顺序读取事实事件，使用 `operationId`/`contentHash` 去重，并在 SQLite 事务中更新 checkpoint。全量重建先写临时 SQLite，完成全部源文件扫描和完整性校验后再原子替换正式数据库；失败时保留旧数据库和错误状态。

### 4. 归属移动和复制复用使用不同事实事件

`ownership_changed` 表示权威归属变化，保留来源和目标；`rule_reused` 表示项目新建引用，不改变公共规则。有效规则计算使用 `project > hybrid > common` 优先级，并保留来源链。

### 5. 控制台查询使用投影状态护栏

全局列表、项目规则和差异 API 返回 `syncStatus`、`checkpoint` 和 `isComplete`。`pending/error/conflict/rebuilding` 时仍可查看已知结果，但 UI 必须显示结果可能滞后，禁止把不完整结果展示为最终同步。

### 6. 使用 Node 内置 SQLite

控制平面使用 Node `node:sqlite`，不引入原生第三方数据库依赖；运行时最低版本调整为支持该内置 API 的 Node 版本。SQLite schema、迁移版本和重建逻辑由控制平面管理。

## Risks / Trade-offs

- [Node 版本升级] → 在 `package.json` 明确 engines，启动前检查 Node 版本并返回稳定错误。
- [跨项目路径不可访问] → 项目注册记录访问状态；同步失败只影响该项目，其他项目继续投影。
- [文件事件长期增长] → SQLite 只保留当前投影，文件历史按事实协议保留；后续可增加归档但不在本 change 删除历史。
- [并发人工编辑] → 使用 `operationId`、版本和 content hash 检测冲突，冲突进入人工处理，不静默覆盖。
- [SQLite 重建耗时] → 使用临时库和 `rebuilding` 状态，查询继续读取旧投影或显式显示不可用状态。

## Migration Plan

1. 启动时创建 SQLite schema 和共享项目注册目录，不迁移或删除既有 JSON 文件。
2. 首次运行扫描现有项目/公共文件，生成 catalog SQLite 和 checkpoint。
3. 控制台 API 从 SQLite 查询，但写操作仍走现有 KnowledgeStore 事实写入与新投影器。
4. 发现投影不一致时执行全量重建；重建成功后继续增量同步。
5. 回滚只需停止新投影读取并继续使用文件 API；SQLite 文件可以删除后重建。

