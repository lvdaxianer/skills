# service-deployment 可选交接协议

## 部署决策时机

只有开发、测试、验收和最终审计完成，运行状态进入 `FINAL_AUDIT_PASSED` 后，产品总控才会生成部署决策记录。控制平面先写入 `.product/runs/<runId>/deployment/dry-run.json`，返回：

> 是否需要部署？请明确授权并提供部署参数；未授权不会执行真实部署。

部署不是默认步骤。用户明确选择不部署时，运行可以进入 `VERIFIED_NOT_DEPLOYED`；没有明确选择时保持 `DEPLOYMENT_DECISION_REQUIRED`。

## dry-run 约束

dry-run 报告必须标记 `dry_run: true`，列出缺失的必需输入和已知的精确生命周期命令，不猜测部署根目录、服务名、健康检查、迁移安全性、停止命令或秘密。部署输入按 `service-deployment` 权威 Skill 校验，至少包括：

- `DEPLOY_ROOT`、`service_name`、artifact 及其 SHA-256；
- 外部 `config_path`、`runtime_target`、`lifecycle.mode` 和 start/stop/status/readiness/liveness/smoke 命令；
- migration 策略和 retention；Docker 目标还必须提供 Docker manifest、镜像身份、挂载和 override 证据。

报告和消息不保存密码、token、私钥、完整敏感连接 URL 或配置文件内容。

## 明确授权后的交接

仅当当前请求包含 `approved: true`、操作者、授权原因且部署参数完整合法时，才向 `service-deployment` 追加：

```yaml
kind: request
action: execute
status: pending
from: product-delivery-workflow
to: service-deployment
```

适配器只发送可审计输入引用和经过脱敏的参数摘要，不执行 shell、systemd、Docker、SSH 或真实服务切换。`service-deployment` 继续负责部署前置校验、不可变 release、健康矩阵、回滚、保留策略和最终发布证据。

## 失败和幂等

- 未授权：只生成/更新 dry-run，不发送执行消息。
- 参数缺失：返回 `DEPLOYMENT_INPUT_REQUIRED`，不发送执行消息。
- 参数非法：返回稳定错误码，不执行写操作之外的部署动作。
- 相同 run 的部署请求使用固定 correlation ID，重复调用只返回已有请求，不重复发布。
- 部署结果必须回写事实源；没有健康、业务 smoke、loaded-artifact 和 release record 证据，不得标记 `DEPLOYED`。
