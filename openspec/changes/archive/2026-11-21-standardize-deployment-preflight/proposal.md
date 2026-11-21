# Proposal

## Why

当前部署标准虽然提到端口、磁盘和权限，但这些要求分散在说明文字中，包清单无法完整表达，导致一键部署可能在资源不足、目录不可写、端口冲突或已有进程身份不明时才失败。现在需要把这些检查以及常见的运行环境、依赖、配置、回滚空间和安全检查统一成可校验、可审计、失败即停止的 preflight 契约。

## What Changes

- 为部署包增加机器可验证的 preflight 契约，声明必检项目、端口、空间/inode 预留、目录权限、主机资源和依赖检查要求。
- 明确构包静态校验、`doctor.sh` 只读动态检查、`deploy.sh` 强制门禁三层边界。
- 要求所有支持模式检查端口冲突、磁盘空间/inode、owner/group、读写执行权限和已有服务身份；按 VM、Docker、Kubernetes 补充模式专属检查。
- 统一失败输出、诊断证据和脱敏规则；任一必需检查失败时只能 dry-run，不得停止、写入、创建容器/Pod 或切换 `current`。
- 同步部署手册、清单、检查表、契约测试和评估用例。

## Capabilities

### New Capabilities

无。本次增强已有部署包、部署手册和服务部署标准的要求。

### Modified Capabilities

- `deployment-package-delivery`: 部署包必须携带可机器校验的 preflight 声明，并在交付校验阶段拒绝缺失或不完整的检查契约。
- `deployment-operator-handbook`: 零经验操作路径必须展示分层 preflight、结果、停止条件和诊断交接信息。
- `service-deployment-standard`: doctor/deploy 必须执行统一的端口、空间、权限及扩展环境检查，并以 fail-closed 方式阻止变更。

## Impact

- 修改 `service-deploy` skill 主契约及其 package、preflight、handbook、checklist 参考文档。
- 扩展 `deployment-package-manifest.schema.json` 和 `package-contract-test.sh`，增加 preflight 契约回归测试。
- 不新增运行时依赖，不改变 systemd、Docker、Kubernetes 的生命周期命令，不执行真实主机部署。
