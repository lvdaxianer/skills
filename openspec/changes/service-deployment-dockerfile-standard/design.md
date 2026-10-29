# Design

## Boundary

新增独立的 `references/dockerfile-standard.md` 作为 Dockerfile 的规范来源。`docker-deployment.md` 继续负责镜像发布、宿主机持久化、生命周期和回滚；它只引用 Dockerfile 规范，不复制整套规则。Compose template 只保留安全起点和运行时禁止下载的注释。

## Dockerfile contract

规范将镜像拆成 build stage 和 runtime stage。基础镜像必须使用 digest；构建上下文必须通过 `.dockerignore` 缩小并拒绝 secrets、`.git`、日志、宿主机配置和凭据。依赖、前端静态资源、模型和其他运行时资源必须在构建阶段获取、校验并写入镜像，禁止运行时安装或下载。

运行阶段使用固定的非 root 用户和 `/app` 目录，默认库保存在 `/app/lib`，服务脚本在 `/app/bin`，应用不应依赖当前工作目录。`ENTRYPOINT` 必须是确定性的本地脚本或可执行文件，脚本必须 `exec` 主进程；`CMD` 只提供稳定默认参数。禁止在 entrypoint、CMD、HEALTHCHECK 或启动脚本中执行联网下载、包安装或远程脚本。

## Runtime verification

发布前执行 Dockerfile lint、镜像 inspect、镜像扫描和 digest/OCI label 校验。构建产物必须能够在无外网的运行环境中完成启动；如果服务需要数据库、Redis、对象存储等业务依赖，测试网络只允许访问声明的依赖地址，不能把 registry、包仓库、代码仓库、模型仓库或任意下载站点列入运行时 allowlist。

验证同时检查启动日志、entrypoint/进程命令、镜像文件完整性、容器网络策略和实际加载的 `/app/lib`/override。发现下载或安装行为时，在 current 切换或容器替换前失败，并保留 release descriptor 供排查。

## Compatibility

该规范不改变 `systemd`、`manual-foreground`、`manual-background` 三种生命周期模式，不要求所有服务必须断网运行，也不禁止服务访问已经声明的业务依赖。Kubernetes、Helm 和 Swarm 仍由其他标准负责。
