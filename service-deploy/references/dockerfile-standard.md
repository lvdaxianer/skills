# Dockerfile Standard

## Scope

本规范约束 `runtime_target=docker-container` 的 Dockerfile、构建上下文和运行时入口。它与 [docker-deployment.md](docker-deployment.md) 配套：本文件负责镜像如何构建以及启动时资源从哪里来，Docker deployment reference 负责镜像发布、宿主机持久化、生命周期、健康、回滚和保留。

Kubernetes、Helm 和 Swarm 不自动继承本规范；这些目标必须使用各自的容器标准。

## Non-negotiable rules

生产 Dockerfile MUST 满足以下规则：

1. 生产基础镜像必须使用完整 digest，例如 `eclipse-temurin:21-jre@sha256:<64-hex>`；禁止只使用 `latest`、`stable`、`dev`、`snapshot` 或未审批的浮动 tag。
2. 生产镜像 MUST 使用独立的 build stage 和 runtime stage；如果确实无法多阶段构建，必须记录原因，并证明构建工具、缓存和凭据不会进入 runtime stage。
3. 构建上下文必须有 `.dockerignore`，至少排除 `.git/`、`.env*`、密钥、证书私钥、`conf/`、`logs/`、`run/`、`release-records/`、本地缓存、测试输出和未审计构建产物。
4. `COPY` 只能复制已声明的应用产物、默认配置、静态资源、模型和库；生产 Dockerfile 禁止使用远程 URL `ADD`。需要归档时先在 build stage 下载并校验，再用本地 `COPY` 进入 runtime stage。
5. 依赖下载只能发生在受信任的 build stage。下载必须使用 lockfile、版本固定和 SHA-256/签名校验；下载结果必须成为可审计的镜像层或构建产物。
6. runtime stage 必须使用非 root 用户运行；例外必须记录原因、影响范围和补偿控制。用户、组、UID/GID 必须固定或由发布 manifest 明确记录，不能依赖宿主机动态创建。
7. 必须设置显式 `WORKDIR /app`，并使用 `/app/bin`、`/app/lib`、`/app/conf`、`/app/data` 等稳定路径。Java 服务的默认库必须保留在 `/app/lib`，增量覆盖只能使用独立的 `/app/overrides/lib` 挂载。
8. 必须使用本地、确定性的 `ENTRYPOINT`；启动脚本必须以 `exec` 替换为实际主进程。`CMD` 只能提供稳定默认参数，不得包含下载、安装或远程脚本。
9. `HEALTHCHECK` 只能做快速本地探测；它不能下载资源、修改数据或替代部署流程中的 readiness、liveness、依赖和业务 smoke check。
10. runtime 镜像必须支持 `read_only: true`；确需写入的临时目录只能使用声明的 `tmpfs` 或持久化挂载。不得把业务数据、配置、证书、日志、release record 或不可重建索引留在容器 writable layer 中。

## Standard runtime layout

推荐的生产镜像布局如下：

```text
/app/
├── bin/
│   ├── entrypoint.sh       # 本地启动入口，负责校验并 exec 主进程
│   └── healthcheck.sh      # 快速本地探测，不下载资源
├── lib/                    # 镜像内默认库，不能被 overrides/lib 直接遮蔽
├── conf/                   # 非敏感默认配置；live 配置来自外部 conf/ 或 EnvironmentFile
├── data/                   # 仅在 manifest 明确声明时使用
└── overrides/
    └── lib/                # 运行时只读 override 挂载点
```

镜像内的 `conf/` 只能是非敏感默认值。部署不得把镜像默认配置复制回 `<service-root>/conf`，也不得把宿主机 live env、证书或密钥打进镜像。

## Reference Dockerfile

下面示例是结构模板，不是可直接部署的业务 Dockerfile。所有版本、digest、产物路径和用户 ID 必须替换为发布 manifest 中经过验证的值：

```dockerfile
# syntax=docker/dockerfile:1.7
FROM registry.example.invalid/build-jdk:21@sha256:<64-hex> AS build
WORKDIR /src

# 只 COPY lockfile 和构建描述，利用缓存但不带入 live 配置。
COPY pom.xml pom.xml
COPY pom.xml.sha256 pom.xml.sha256
RUN sha256sum -c pom.xml.sha256
RUN ./mvnw -B -DskipTests package

FROM registry.example.invalid/runtime-jre:21@sha256:<64-hex> AS runtime
WORKDIR /app
RUN addgroup --gid 10001 service \\
 && adduser --uid 10001 --gid 10001 --disabled-password service
COPY --from=build --chown=10001:10001 target/app.jar /app/lib/app.jar
COPY --chown=10001:10001 bin/ /app/bin/
COPY --chown=10001:10001 conf/defaults/ /app/conf/
RUN chmod 0555 /app/bin/entrypoint.sh /app/bin/healthcheck.sh \\
 && chmod 0555 /app \\
 && test -r /app/lib/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app/bin/entrypoint.sh"]
CMD ["/app/lib/app.jar"]
HEALTHCHECK --interval=5s --timeout=3s --retries=18 \\
  CMD ["/app/bin/healthcheck.sh"]
```

实际项目如果使用 Node、Python、Go 或其他运行时，目录、用户和入口契约仍然适用；依赖锁定、产物校验和 runtime/build stage 分离必须按对应生态实现。

## Entrypoint contract

`/app/bin/entrypoint.sh` MUST：

- 使用 `set -eu` 或等价的失败即停策略，并在启动前校验必需本地文件、目录和外部配置的存在性；
- 不 `source` 镜像内未经验证的 live 配置；Shell env loader 必须遵守 [artifact-and-config-security.md](artifact-and-config-security.md)；
- 不执行远程 shell、包安装或资源下载；
- 按服务声明的顺序加载 `/app/overrides/lib` 和 `/app/lib`，不得用 override 目录覆盖 `/app/lib`；
- 最后使用 `exec` 启动唯一主进程，并将退出码传递给容器运行时；
- 不依赖宿主机当前目录、宿主机 PATH、未声明的 socket 或任意外部文件。

下列行为在 runtime entrypoint、`CMD`、`HEALTHCHECK`、启动 hook 和应用启动脚本中禁止：

```text
curl/wget/aria2c 下载文件或脚本
git clone/fetch/pull
curl ... | sh、wget ... | bash 及等价远程执行
apt/apk/yum/dnf/pip/npm/pnpm/yarn/mvn/gradle install 或 update
下载 JAR、wheel、npm 包、模型、浏览器、字体、证书或压缩包后再使用
通过环境变量控制下载 URL、安装命令或远程脚本
```

`curl`、`wget` 等工具只有在本地健康检查确实需要时才允许使用，并且目标必须是 loopback/声明的本地服务，不能把响应保存为文件、交给 shell 执行或作为运行时依赖补齐机制。

## Runtime network policy

“运行时不能下载资源”不等于“服务必须完全断网”。允许访问的网络目标必须在部署 manifest 中声明，例如数据库、Redis、Milvus/Elasticsearch、对象存储或内部 API。以下目标默认禁止：

- 容器 registry、操作系统包仓库、语言包仓库、代码仓库；
- 模型仓库、脚本 CDN、浏览器/字体下载站点；
- 任意未列入依赖清单的 URL、IP 和端口。

首选使用 `--network none` 做无依赖启动测试。若服务确实依赖外部组件，使用只允许声明业务依赖的 egress-restricted 网络，并确保测试中 registry、包仓库、代码仓库和模型仓库不可达。业务依赖访问失败属于依赖健康失败；下载或安装行为属于镜像契约失败，不能通过重试掩盖。

## Build and acceptance commands

构建和部署工具必须以不泄露凭据的方式传入 registry 认证。示例命令中的值均为占位符：

```sh
# 1. 检查 Dockerfile 语法和最佳实践
docker buildx build --check .

# 2. 构建并生成 SBOM/provenance；所有基础镜像在 Dockerfile 中已固定 digest
docker buildx build --provenance=true --sbom=true \\
  --label org.opencontainers.image.revision="$SOURCE_COMMIT" \\
  --label org.opencontainers.image.version="$RELEASE_ID" \\
  --tag "$REGISTRY/$SERVICE:$RELEASE_ID" \\
  --push .

# 3. 拉取后只使用 digest 验证
docker pull "$IMAGE_DIGEST"
docker image inspect "$IMAGE_DIGEST" \\
  --format '{{json .RepoDigests}} {{json .Config.User}} {{json .Config.WorkingDir}} {{json .Config.Entrypoint}} {{json .Config.Labels}}'

# 4. 无业务依赖的服务必须进行无外网启动；依赖型服务改用 egress allowlist
docker run --rm --network none "$IMAGE_DIGEST" \\
  /app/bin/healthcheck.sh

# 5. 检查镜像历史中没有明显的秘密或运行时安装层
docker history --no-trunc "$IMAGE_DIGEST"
```

上述命令不是只看退出码。验收还必须确认：

- `/app/bin/entrypoint.sh`、healthcheck、默认 JAR/库和必需静态资源存在且权限正确；
- `Config.User` 为声明的非 root 用户，`WorkingDir` 为 `/app`，入口为本地路径；
- image digest、OCI labels、SBOM/provenance 与 release record 一致；
- 启动日志没有下载/安装行为，进程命令行没有隐藏下载命令，容器没有产生未声明的文件；
- 实际加载的 JAR/override 来自 current release 对应的 image/manifest；
- 运行时网络策略只允许已声明的业务依赖。

如果服务需要外部业务依赖，不能把 `--network none` 的失败误判为镜像失败；必须改用精确 allowlist，并单独记录依赖不可用与 runtime download 两种结果。

## Failure behavior

Dockerfile lint、digest、资源完整性、用户/入口、runtime offline/egress-restricted startup、网络策略或日志检查任一失败时：

1. 在停止 current 或替换容器前失败；
2. 保留失败 release descriptor、镜像 digest、检查输出路径和失败阶段；
3. 不通过重试、启动脚本补下载或临时安装来绕过门禁；
4. 只允许按现有 rollback state machine 恢复已记录的 previous release，不得猜测第三个版本。
