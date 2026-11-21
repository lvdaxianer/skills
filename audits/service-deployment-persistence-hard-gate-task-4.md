# Per-task Audit: service-deployment persistence hard gate / T4

## Scope

- `service-deploy/scripts/persistence-contract-test.sh`
- Docker、Kubernetes、外部托管和镜像默认值回退的只读合同检查

## Evidence

- 缺少资源清单、未确认、相对 Docker 路径、Kubernetes `hostPath`、未绑定 PVC/PV、覆盖 `/app/lib` 等测试均按预期拒绝。
- 有效 Docker、有效 Kubernetes、有效 external-managed 清单均通过。
- 检查器不创建目录、不连接集群、不修改服务状态；错误信息不回显敏感值；遇到不完整合同 fail closed。
- `bash -n service-deploy/scripts/*.sh service-deploy/tests/*.sh`：通过。
- `bash service-deploy/tests/test-persistence-hard-gate.sh`：通过。

## Result

T4 通过，允许标记完成。
