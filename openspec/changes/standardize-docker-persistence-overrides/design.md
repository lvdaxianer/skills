# Design

## Context

本 change 只修改部署标准 skill 及其机器可读/示例参考，不修改业务 Dockerfile 或执行服务器操作。当前规范已经有不可变 release、外部 `conf`、JAR/config override 和 `/app/overrides/lib`，需要补齐前后端、HTML、未来扩展点、宿主机持久化和 Kubernetes PVC/PV 的一致硬门禁。

## Decisions

1. `conf` 使用 `<service-root>/conf/` 作为跨 release 的 live 配置边界，按配置/secret/certificate 规则只读挂载并保留备份恢复策略。
2. `html`、`lib`、配置覆盖和未来资源都使用选定 release 下的 `overrides/<extension>/`。每次增量替换都生成完整的新 release-bound unit，不允许修改全局共享 override 目录。
3. Compose 使用物理 release 路径，覆盖层只读挂载到独立 `/app/overrides/<extension>`；禁止覆盖 `/app/lib`、entrypoint、host root、Docker socket 或未声明容器路径。
4. persistence manifest 负责挂载目的/权限/备份恢复；override/release manifest 负责每个文件的 mode、SHA-256、原因、兼容性和有效路径。HTML 是否可外置由 `html_status` 与服务声明的实际 extension path 决定。
5. 应用启动器负责确定性加载顺序；不能安全 merge 的配置必须采用完整 replace 并记录决定。运行时不下载、不安装、不修改 release 内容。
6. 包 manifest 生成默认资源确认表，代码/配置资源默认镜像内可回退，数据资源默认要求外部持久化；客户必须逐项确认目标和恢复责任，未确认只输出 dry-run。
7. Docker 资源目标为客户确认的绝对宿主机路径；Kubernetes 资源目标为现有 PVC/PV。Kubernetes 不允许以 `hostPath` 作为默认或缺失存储时的降级路径。
8. 资源覆盖必须挂载到独立 extension point；`/app/bin`、`/app/lib`、`/app/html`、entrypoint、`/app` 和容器 writable layer 均不可被宿主机/PVC 覆盖为唯一来源。

## Flow

```text
source change -> staging -> resource confirmation -> path/PVC validation
              -> manifest/checksum/mount-boundary validation
              -> new release-bound overrides + physical Compose/Kubernetes manifest
              -> exact container recreate/restart
              -> health/dependency/smoke/effective-load checks
              -> record and latest alias update
              -> failure: restore recorded previous release unit
```

## Validation

- `openspec validate ... --strict`
- 所有 JSON manifest 通过 JSON 解析，并检查新增 `html` 结构与路径禁止项。
- Compose/Kubernetes 模板包含前端、后端、`lib`、`conf` 的独立覆盖位置和数据库/对象存储数据挂载说明；Kubernetes 明确 PVC/PV 与无 `hostPath` 降级。
- `rg` 审计无与设计冲突的“直接覆盖 `/app/lib`”或“全局 overrides 为有效输入”规则。
- 三个存在的本地 skill root 同步后，修改文件 checksum 与源目录一致，最终 Git 工作区干净。
