# Spec Delta

## ADDED Requirements

### Requirement: Packages declare a machine-verifiable preflight contract

部署包 MUST 声明通用和所支持模式的必需检查，以及端口、存储容量/inode 预留和目录权限目标；缺少任一端口、空间或权限契约时，包校验 MUST 失败。

#### Scenario: Preflight contract is complete
- **WHEN** 包清单包含所支持模式的检查集合、端口协议/监听边界、最小存储要求和权限目标
- **THEN** 构包契约校验 MUST 通过并允许进入目标机 doctor 检查

#### Scenario: Preflight contract is missing
- **WHEN** 包清单缺少端口、存储或权限声明，或声明的阈值/路径引用格式无效
- **THEN** 构包契约校验 MUST 失败且不得解压到最终部署目录

### Requirement: Package validation separates static and dynamic checks

构包校验 MUST 只验证包内可确定的静态事实；目标机系统、端口占用、实际空间、owner/group、运行用户、依赖和持久化状态 MUST 留给只读 doctor 检查，不得以包内声明伪造现场通过结果。

#### Scenario: Package passes but host is unknown
- **WHEN** 包内材料完整但尚未检查目标机端口、空间或权限
- **THEN** 安装器 MUST 只输出待执行的 dry-run/preflight 状态，不得开始停止或写入
