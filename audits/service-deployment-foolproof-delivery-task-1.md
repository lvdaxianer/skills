# Per-task Audit: service-deployment-foolproof-delivery / 1.1

## Scope

- 主 skill：`service-deploy/SKILL.md`
- 新增交付规范：部署包、部署手册、三模式 preflight、包 manifest schema
- 新增验证入口：`service-deploy/scripts/package-contract-test.sh`
- 新增测试：`service-deploy/tests/test-foolproof-delivery.sh`
- 新增 eval：原有 30 条扩展至 35 条
- OpenSpec：proposal、三份 spec delta、design、tasks

## Acceptance evidence

| 要求 | 证据 |
| --- | --- |
| 一键部署/升级 | `deployment-handbook.md` 和 `SKILL.md` 规定 `./deploy.sh` |
| 一键重启/状态/日志 | `deployment-handbook.md` 的 `./service.sh` 菜单和健康检查规则 |
| 一键诊断/回滚/卸载 | `doctor.sh`、`rollback.sh`、`uninstall.sh` 契约及手册章节 |
| 客户确认部署目录 | `deployment-package.md`、handbook、preflight matrix 和 modified service spec |
| 部署包必须有版本 | manifest schema、包命名规则、安装前门禁和 eval 34 |
| VM/Docker/Kubernetes 分流 | `deployment-preflight-matrix.md`、`SKILL.md` 和 eval 31/35 |
| K8s 不存在立即停止 | preflight matrix、service spec、handbook 和 eval 35 |
| 无基础环境可处理 | VM 内置 runtime、Docker 离线材料、mode-specific preflight 规则 |
| 失败不猜版本/不泄露秘密 | 现有 v2 invariant、包契约脚本、手册故障交接规则 |

## Verification evidence

- `bash -n service-deploy/scripts/package-contract-test.sh`：通过。
- `bash -n service-deploy/tests/test-foolproof-delivery.sh`：通过。
- 两份 JSON 使用 `python3 -m json.tool`：通过。
- `bash service-deploy/tests/test-foolproof-delivery.sh`：通过。
- `openspec validate service-deployment-foolproof-delivery --strict`：通过。
- 临时有效包通过 `package-contract-test.sh`；将版本改为 `latest` 的包被拒绝。
- `git diff --cached --check`：通过。
- 暂存文件名和 staged diff 未发现真实私钥、认证连接串或敏感文件名。

## Review gates

- 直接执行回退已记录：本任务文件相互引用，单代理可避免共享 skill 契约拆分冲突。
- `code-review-spec`：Shell/Python 校验入口已补充中文说明、输入类型校验、路径边界、稳定排序、敏感内容不回显和 fail-closed 行为；未发现待修复问题。
- REST API、backend、frontend、logging 域门禁：本任务未修改 API、业务服务、前端交互或生产日志；不适用。
- `project-hygiene`：未新增构建清单、环境变量或秘密文件；`.claude/worktrees` 保持忽略；仓库既有 `LICENSE` CRLF 未被本任务修改。

## Result

通过 per-task audit，允许标记 OpenSpec task 1.1 完成。
