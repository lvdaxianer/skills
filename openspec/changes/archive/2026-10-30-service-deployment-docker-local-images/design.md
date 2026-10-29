# Design

## Image transport modes

`image_transport` 必须明确为 `registry`、`local-daemon` 或 `archive`：

- `registry`：repository 带 Registry 主机名；推送 release tag，拉取并部署 manifest digest。
- `local-daemon`：不依赖远程 Registry；镜像已存在于部署主机 Docker daemon，使用本地 image ID 作为身份，release tag 和 latest 作为本地别名。
- `archive`：构建产物是 `docker save` 生成的归档；先校验归档 SHA-256，再加载到目标 daemon，记录 image ID，并校验 release tag/OCI labels。

Registry 认证、pull 和 `imagetools` 只属于 `registry` 模式。没有 Registry 时不得伪造远程 digest；本地 image ID 必须写入 release record，回滚前必须确认 image ID 仍存在或能从已校验归档恢复。

## Alias and deployment

三种模式共用同一生命周期：release tag -> identity validation -> digest/image-ID deployment -> health/smoke -> record verified -> update latest -> inspect latest. Registry 模式通过远程 tag 操作更新 latest；local-daemon/archive 通过本地 `docker tag <image-id> <service>:latest` 更新并 inspect。latest-only 仍失败。

## Safety

本地镜像不能替代持久化数据、配置、override 或 release record。`docker save/load` 只传输镜像，不传输宿主机持久化目录。Archive retention 保护受引用的 image ID 和归档 checksum；禁止 broad prune 或删除 volume。
