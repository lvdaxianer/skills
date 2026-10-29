# Design

## Image identity

每个服务使用一个 repository。构建成功后发布不可复用的 release tag：`<registry>/<service-name>:<release-id>`；release ID 与 releases 目录、current、release record 和 OCI labels 一致。部署和回滚只使用 `<repository>@sha256:<digest>`。

`latest` 是同一 repository 下的移动别名，不代表构建完成，也不是生产部署身份。相同 image ID 出现多个 tag 是 tag alias，不应被解释为多个镜像副本；短 SHA-only tag 不再作为标准生产 tag。

## Alias state machine

```text
build/push release tag
  -> pull/inspect digest
  -> deploy by digest
  -> status + readiness + liveness + dependencies + smoke
  -> record verified release
  -> update latest to the verified digest
  -> inspect latest and confirm digest equality
```

发布失败时保持旧 `latest` 不变。回滚只有在 previous release 健康检查通过后才更新 `latest` 到 previous digest。若服务已经健康但 latest alias 更新失败，不回滚运行中的服务；记录 alias update failure 并要求人工重试，生产 manifest 仍使用已验证 digest。

## Record and retention

Docker release record 增加 repository、release tag 和 latest alias 状态。latest alias 的目标 digest、更新时间和证据路径不得记录密码、Token 或完整敏感 URL。Retention 必须保护 latest 当前指向的 digest，并且只按精确 digest 删除未被任何 release/alias 引用的本地镜像。
