# Proposal

## Why

服务部署目前依赖个人经验，版本目录、`current` 软链接、外置配置、备份保留和回滚步骤容易在不同服务之间产生差异。需要把已在 `knowledge-app` 上验证过的发布模式沉淀为可复用 Skill，使后续部署在不同根目录和不同启动方式下仍能保持一致、可审计、可回滚。

## What Changes

- 新增通用服务部署 Skill，默认部署根目录为 `/opt`，但允许用户指定任意绝对路径。
- 规定每次发布使用独立版本目录，并通过 `current` 软链接指向当前版本。
- 规定配置与敏感变量放在版本目录之外，服务通过 Shell 启停、状态检查和健康检查完成生命周期管理；不强制依赖 systemd。
- 规定版本命名格式：`<service-name>-<YYYYMMDDHHmmss>-<git-short-sha>-<number>`；无提交记录时使用发布包版本号或 `manual`。
- 规定按服务独立递增发布序号，默认保留最近 5 个版本，并保护当前版本、上一版本和未完成验证版本。
- 规定发布前校验、原子切换、失败回滚、清理和发布记录要求。
- 在 `references/` 中提供目录布局、命名保留规则、部署清单和 `knowledge-app` 参考资料。

## Capabilities

### New Capabilities

- `service-deployment-standard`: 可配置部署根目录下的版本化发布、外置配置、软链接切换、生命周期操作、校验、回滚和保留清理标准。

### Modified Capabilities

无。

## Impact

- 新增 `service-deploy/` Skill 包及其参考资料和评测用例。
- 新增 OpenSpec change、设计文档和实施计划。
- 不修改远程服务器、不修改现有服务文件、不引入运行时依赖或公开 API。
