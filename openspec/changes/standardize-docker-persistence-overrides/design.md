# Design

## Context

本 change 只修改 Docker 部署标准 skill 及其机器可读/示例参考，不修改业务 Dockerfile 或执行服务器操作。当前规范已经有不可变 release、外部 `conf`、JAR/config override 和 `/app/overrides/lib`，需要补齐 HTML、未来扩展点、宿主机持久化和增量替换的一致契约。

## Decisions

1. `conf` 使用 `<service-root>/conf/` 作为跨 release 的 live 配置边界，按配置/secret/certificate 规则只读挂载并保留备份恢复策略。
2. `html`、`lib`、配置覆盖和未来资源都使用选定 release 下的 `overrides/<extension>/`。每次增量替换都生成完整的新 release-bound unit，不允许修改全局共享 override 目录。
3. Compose 使用物理 release 路径，覆盖层只读挂载到独立 `/app/overrides/<extension>`；禁止覆盖 `/app/lib`、entrypoint、host root、Docker socket 或未声明容器路径。
4. persistence manifest 负责挂载目的/权限/备份恢复；override/release manifest 负责每个文件的 mode、SHA-256、原因、兼容性和有效路径。HTML 是否可外置由 `html_status` 与服务声明的实际 extension path 决定。
5. 应用启动器负责确定性加载顺序；不能安全 merge 的配置必须采用完整 replace 并记录决定。运行时不下载、不安装、不修改 release 内容。

## Flow

```text
source change -> staging -> manifest/checksum/path validation
              -> new release-bound overrides + physical Compose
              -> exact container recreate/restart
              -> health/dependency/smoke/effective-load checks
              -> record and latest alias update
              -> failure: restore recorded previous release unit
```

## Validation

- `openspec validate ... --strict`
- 所有 JSON manifest 通过 JSON 解析，并检查新增 `html` 结构与路径禁止项。
- Compose 模板包含 `conf`、`overrides/lib`、`overrides/html` 的显式挂载与禁止全局目录说明。
- `rg` 审计无与设计冲突的“直接覆盖 `/app/lib`”或“全局 overrides 为有效输入”规则。
- 四个本地 skill root 同步后，修改文件 checksum 与源目录一致，最终 Git 工作区干净。
