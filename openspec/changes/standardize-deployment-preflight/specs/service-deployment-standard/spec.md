# Spec Delta

## ADDED Requirements

### Requirement: Preflight validates port, storage and permission boundaries

所选部署模式的 doctor MUST 只读检查声明端口的冲突和监听边界、目标路径的可用字节与 inode、运行用户的 owner/group 和读写执行能力；未知占用者或任一必需项失败 MUST 阻止部署。

#### Scenario: Port is occupied by an unrelated identity
- **WHEN** 声明端口已被无法证明属于当前服务的进程、容器或 workload 使用
- **THEN** doctor MUST 标记失败、报告非敏感身份摘要并阻止停止/写入/替换

#### Scenario: Upgrade sees the current service port
- **WHEN** 声明端口由记录的 current release 或精确 Docker/Kubernetes identity 使用
- **THEN** doctor MAY 将该项标记为通过，但 MUST 保留身份证据并继续执行其他检查

#### Scenario: Storage or permission is insufficient
- **WHEN** 任一目标文件系统低于 manifest 预留的字节/inode，或运行用户无法满足声明的 owner/group/读写执行能力
- **THEN** doctor MUST 失败并保持原运行版本不变

### Requirement: Preflight covers mode-specific operational readiness

除端口、空间和权限外，doctor MUST 按模式检查平台/架构、运行时或 Docker/Kubernetes 工具、资源限制、配置、依赖、持久化、生命周期、进程身份、日志和回滚所需空间；不适用项 MUST 有清晰的 `not_applicable` 记录。

#### Scenario: Required mode prerequisite is absent
- **WHEN** VM runtime、Docker daemon/Compose、Kubernetes context/Namespace/RBAC/PVC 或其他所选模式必需材料缺失
- **THEN** doctor MUST 失败并列出补齐清单，不得安装替代运行时或静默切换模式

#### Scenario: All required checks pass
- **WHEN** 所选模式的 package、目录、资源、依赖、配置和身份检查均通过
- **THEN** doctor MUST 生成绑定 package、mode、物理目录和时间的可审计通过报告，`deploy.sh` 才能继续

### Requirement: Deployment consumes a fresh redacted preflight report

`deploy.sh` MUST 在任何停止、写入、容器/Pod 创建或 `current` 切换前验证 doctor 报告的 package SHA、部署模式、物理目录、检查状态和有效期；报告缺失、过期、跨包或包含敏感内容时 MUST 保持 dry-run。

#### Scenario: Report is stale or mismatched
- **WHEN** doctor 报告与当前 package、mode、目录或有效期不匹配
- **THEN** deploy MUST 拒绝继续并要求重新运行 doctor

#### Scenario: Report contains sensitive values
- **WHEN** 诊断报告包含密码、Token、私钥、环境值或完整敏感连接串
- **THEN** 报告生成/校验 MUST 失败并在错误中仅保留脱敏字段名和证据路径
