# Proposal

## Why

当前 Docker 镜像同时出现完整 release tag 和单独 Git SHA tag；同一个 image ID 可能显示多行，既不方便识别最近一次有效版本，也没有规定何时更新 `latest`。需要把历史版本 tag、verified 移动别名和生产 digest 的职责分开。

## What Changes

- 规定镜像格式为 `<registry>/<service-name>:<release-id>`、`<registry>/<service-name>:latest` 和 `<registry>/<service-name>@sha256:<digest>`。
- 保留完整 release tag 作为不可复用的历史定位；允许 `latest` 作为最近一次验证成功版本的移动别名。
- 只有部署完成 status/readiness/liveness/依赖/smoke 检查、release record 写入成功后，才能更新 `latest`。
- 失败发布不得更新 `latest`；回滚健康检查通过后，`latest` 必须重新指向回滚 digest。
- 生产容器仍必须使用 digest，禁止 latest-only 部署；记录 image repository、release tag、digest 和 latest alias 状态。
- 增加 schema、checklist、Docker reference 和 eval 覆盖，解释相同 image ID 的多个 tag 是别名而不是多个镜像。

## Capabilities

### New Capabilities

### Modified Capabilities

- `service-deployment-docker-runtime`: 增加 release tag、verified latest alias 和 digest 的生命周期及审计规则。
- `service-deployment-standard`: 将 latest alias 更新与回滚纳入 Docker 发布流程。

## Impact

- 影响 `service-deploy/SKILL.md`、Docker deployment reference、部署 checklist、release record schema 和 evals。
- 不修改业务代码，不连接服务器，不执行真实镜像构建或部署。
