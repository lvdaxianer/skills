# Proposal

## Why

Docker 服务不一定具备可用的远程 Registry。当前规范把 push、pull 和 `imagetools` 作为默认路径，无法完整描述直接在部署主机本地构建，或通过 `docker save/load` 传输镜像的场景。

## What Changes

- 将镜像传输方式定义为 `registry`、`local-daemon` 和 `archive`，Registry 不再是部署前置条件。
- Registry 模式继续使用远程 digest；local-daemon 使用本地 image ID；archive 模式先校验归档 SHA-256，再 `docker load` 并记录加载后的 image ID。
- 三种模式都保留不可复用 release tag 和 verified `latest` 移动别名；latest-only 仍然禁止。
- `latest` 在无 Registry 模式下使用本地 `docker tag` 更新，并通过本地 inspect 验证目标身份。
- release record 增加 image transport、registry 可空字段和 identity kind，保留 host-process 兼容性。
- 更新 Docker reference、Skill、checklist、schema、evals 和主 OpenSpec 规格。

## Capabilities

### New Capabilities

### Modified Capabilities

- `service-deployment-docker-runtime`: 支持 Registry、local-daemon 和 archive 三种镜像传输/恢复方式。
- `service-deployment-standard`: 将镜像传输方式和本地镜像身份纳入 Docker 发布门禁与审计记录。

## Impact

- 影响 `service-deploy/SKILL.md`、Docker deployment reference、Compose/checklist、release record schema 和 evals。
- 不修改业务代码，不连接服务器，不执行真实镜像构建、推送或部署。
