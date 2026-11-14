# Proposal

## Why

现有控制台只能围绕当前项目管理问题，无法回答“全局有哪些问题”“哪些规则属于哪个项目”以及“不同项目之间有什么差异”。同时，纯文件查询在跨项目汇总时效率不足，但直接把 SQLite 当成第二个事实源又会产生双写分叉和无法恢复的状态。

本次将控制台扩展为全局问题与规则治理中心：本地文件继续作为唯一权威事实源，SQLite 作为可重建的查询投影，并通过同步检查点、哈希校验和重建机制保证最终一致。

## What Changes

- 新增全局问题目录，支持跨项目查询、创建、编辑、排除、恢复、归档和软删除。
- 新增公共、项目、hybrid 归属的移动与复制语义，所有迁移追加归属历史和人工审计。
- 新增项目规则视图，展示项目规则、继承公共规则、项目覆盖和跨项目差异。
- 新增 SQLite 查询目录、文件投影器、同步检查点、漂移检测和从文件重建能力。
- 将现有知识 API/UI 扩展为全局治理 API 和 EJS 控制台页面，保留 loopback 限制。
- 不允许直接修改 SQLite；所有写操作必须先落本地文件事实源，再由投影器更新 SQLite。

## Capabilities

### New Capabilities

- `global-knowledge-catalog`: 跨项目问题目录、CRUD、软删除和可审计查询。
- `knowledge-ownership`: 公共、项目、hybrid 归属迁移、复制复用和归属历史。
- `project-rule-view`: 项目有效规则、继承关系、覆盖关系和差异视图。
- `sqlite-projection-sync`: 文件事实源到 SQLite 查询投影、检查点、漂移检测和重建。

### Modified Capabilities

- `product-control-plane`: 控制台和本地 API 从单项目知识管理扩展为跨项目治理，并增加 SQLite 投影状态。
- `product-knowledge-governance`: 增加全局目录、归属迁移和项目规则有效性计算，但保留人工优先和原始证据不删除规则。

## Impact

- 影响 `product-delivery-workflow/references/control-plane/` 的 Node 服务、知识存储、API、EJS UI 和测试。
- 新增 Node 内置 `node:sqlite` 使用，运行时最低版本调整为支持该 API 的 Node 版本。
- 新增共享知识根目录下的 SQLite 文件和同步元数据；SQLite 损坏时可从项目/公共文件重建。
- 不新增远程服务、登录系统或真实部署行为；控制台仍只监听本机回环地址。
