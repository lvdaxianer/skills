# Per-task Audit: service-deployment persistence hard gate / T3

## Scope

- `SKILL.md`
- Docker/Kubernetes 参考文档、Compose 示例、部署手册、preflight、checklist、安全与回滚说明
- 版本化部署包和客户资源确认流程

## Evidence

- 文档要求先确认部署方式和部署目录，再逐项确认 frontend、backend、`lib`、`conf`、database、MinIO/object-storage 等资源。
- Docker 文档要求绝对宿主机路径、独立挂载和空目录回退镜像默认值。
- Kubernetes 文档要求使用现有可达集群、已绑定 PVC/PV，禁止 `hostPath`、匿名卷、安装集群和 Docker/VM 降级。
- 部署手册覆盖一键部署、重启、状态、日志、诊断、回滚、卸载及失败时立即停止规则。
- `service-deploy/tests/test-foolproof-delivery.sh`：通过。

## Result

T3 通过，允许标记完成。
