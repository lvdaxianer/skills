# Spec Delta

## ADDED Requirements

### Requirement: Handbook exposes layered preflight gates

零经验手册 MUST 明确构包校验、`doctor.sh` 只读现场检查和 `deploy.sh` 强制门禁的顺序，并列出端口、空间/inode、权限、运行环境、资源、依赖、配置、进程身份、持久化、日志和回滚空间检查。

#### Scenario: Doctor reports a required failure
- **WHEN** 任一必需 preflight 项为“不通过”或“待客户确认”
- **THEN** 手册 MUST 要求停止，不执行 `deploy.sh`，保留脱敏诊断证据并交接给指定联系人

#### Scenario: Doctor passes
- **WHEN** 所选模式的 package、目录确认、端口、空间、权限和其他必需检查均通过
- **THEN** 手册 MUST 说明安装预览、最终确认和成功报告中应出现的版本、目录、端口和诊断记录

### Requirement: Handbook explains non-destructive remediation boundaries

手册 MUST 明确一键入口不会自动杀进程、改端口、清理磁盘、修复 owner/group、改防火墙或安装缺失的 Kubernetes/Docker 环境。

#### Scenario: Operator sees a port or permission conflict
- **WHEN** doctor 发现未知端口占用者或权限不足
- **THEN** 手册 MUST 指导实施人员停止并联系管理员，不得要求其执行宽泛 kill、递归删除或自行修改安全策略
