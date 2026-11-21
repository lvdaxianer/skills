# Per-task Audit: service-deployment-preflight / Operational contract

## Scope

- `service-deploy/SKILL.md`
- `service-deploy/references/deployment-preflight-matrix.md`
- `service-deploy/references/deployment-package.md`
- `service-deploy/references/deployment-handbook.md`
- `service-deploy/references/deployment-checklist.md`
- `service-deploy/tests/test-foolproof-delivery.sh`
- `service-deploy/evals/evals.json`
- OpenSpec `standardize-deployment-preflight` tasks 2.1–2.3

## Acceptance evidence

- 主 skill 明确三层 preflight、端口冲突、空间/inode、权限、资源、依赖、进程身份、回滚空间、报告绑定和 fail-closed 门禁。
- preflight 矩阵区分通用、VM、Docker、Kubernetes 检查，并规定不自动杀进程、改端口、清理磁盘、修复权限或安装替代运行时。
- 部署包、手册和 checklist 都说明构包静态校验 → `doctor.sh` 只读检查 → `deploy.sh` 变更门禁的顺序。
- 手册把端口冲突、空间/inode 不足和权限不足列为停止场景，并要求脱敏诊断交接。
- evals 增加 41–44，覆盖未知端口占用、inode/回滚空间、owner/group/读写执行权限和报告跨包/跨目录/过期。

## Verification

- `python3 -m json.tool service-deploy/references/deployment-package-manifest.schema.json`：通过。
- `python3 -m json.tool service-deploy/evals/evals.json`：通过。
- `bash -n service-deploy/scripts/*.sh service-deploy/tests/*.sh`：通过。
- `./service-deploy/tests/test-preflight-contract.sh`：通过。
- `./service-deploy/tests/test-foolproof-delivery.sh`：通过。
- `./service-deploy/tests/test-persistence-hard-gate.sh`：通过。
- `openspec validate standardize-deployment-preflight --strict`：通过。
- `git diff --check`：通过。

## Review gates

- `code-review-spec`：文档和 Shell 测试无敏感值回显、无破坏性自动修复指令，新增断言与 manifest 字段保持一致；无待修复问题。
- REST API、backend、frontend、production logging 和 project-hygiene：本任务未触及，均不适用。
- 实现未连接客户主机、Docker daemon 或 Kubernetes 集群；所有动态检查仅作为 operator contract 要求被文档化。

## Per-task result

PASS。任务 2.1–2.3 的文档、测试、评估和规格一致，无实现漂移。
