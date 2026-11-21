# Design

## Context

现有 manifest 已有包身份、模式、入口、持久化资源和基础端口目录，但缺少一个能被构包校验和目标机 `doctor.sh` 共同消费的检查契约。现有参考文档已经规定 Kubernetes 不降级、Docker 挂载不可遮蔽镜像默认资源、目录需客户确认以及发布失败需回滚，因此本设计只补齐 preflight 的数据边界和执行顺序，不重写生命周期模型。

## Goals / Non-Goals

**Goals:**

- 使用一个 `preflight` 对象表达通用检查、模式检查、端口、存储阈值和权限目标。
- 把“声明什么”与“现场如何检查”分开：manifest 提供期望值，`doctor.sh` 解析客户确认目录和运行身份执行只读检查。
- 让 `deploy.sh` 只接受已成功、未过期且与当前 package/mode/path 输入绑定的 doctor 结果。
- 为失败输出提供稳定检查项、结果级别、修复建议和脱敏诊断路径。

**Non-Goals:**

- 不自动修复权限、清理磁盘、终止不明进程、修改防火墙或切换端口。
- 不实现某个具体服务的 doctor/deploy 入口，不连接客户环境，不安装 Docker/Kubernetes。
- 不把业务依赖的凭据或敏感连接串写入 manifest、日志或诊断报告。

## Decisions

1. **采用 manifest 声明 + 现场解析。** `preflight.required_checks` 声明通用和模式检查集合；`ports` 声明协议、监听地址、端口和冲突策略；`storage.paths` 声明路径引用、最小可用字节/inode 和安全余量；`permissions` 声明路径引用、owner/group、模式和所需读写执行能力。这样构包阶段能验证结构，现场阶段能把 `service_root`、`conf`、`data`、`logs`、`backup` 等客户确认路径解析成物理目标。相比只在手册写阈值，这种方式可阻止缺字段的包进入部署。
2. **把检查分成三层。** 构包契约测试只读检查清单完整性和静态安全；`doctor.sh` 只读检查目标机实际状态并生成报告；`deploy.sh` 在停止或写入前验证同一份报告的 package、mode、目录和时间绑定。相比让 `deploy.sh` 临时拼接检查，三层边界更容易审计且不会把修复动作误当成检测。
3. **所有必需检查 fail-closed。** 端口冲突、容量/ inode 不足、owner/group 或读写执行能力不满足、资源/依赖/配置/身份冲突不明确时，状态为 `不通过`，流程停留在 dry-run。升级时允许“端口属于当前服务”仅在完整进程/容器身份证据匹配时通过；未知占用者一律失败。
4. **采用稳定、脱敏的报告结构。** 每项输出 `id`、`scope`、`status`、`observed` 的非敏感摘要、`required`、`remediation` 和 `evidence_path`。报告不包含变量值、Token、私钥、完整连接串或命令输出中的敏感内容。相比把原始命令输出直接打包，结构化摘要更适合零经验操作人员和交接审计。
5. **保持向后边界清晰。** 不改变已有顶层端口目录的业务含义；新增 `preflight` 是新包的必需契约。没有 preflight 契约的旧包只能进入包校验失败/dry-run，不能被静默解释为“没有检查要求”。

## Risks / Trade-offs

- [Risk] 客户目录和运行用户在构包时未知。→ 使用受限的路径引用和 `owner_ref`，由现场确认表解析；禁止把研发机绝对路径写入包。
- [Risk] Docker/Kubernetes 的“端口冲突”语义不同。→ manifest 区分暴露边界，模式检查分别验证宿主监听、容器映射或 Service/Ingress 目标，不用 VM 的单一命令强行覆盖所有模式。
- [Risk] 严格的 inode/容量阈值可能拒绝容量看似足够的主机。→ 阈值必须由包声明，报告同时显示所需字节、inode 和实际摘要，现场只能调整经客户确认的目录或重新构包。
- [Risk] doctor 报告可能过期。→ 报告绑定 package SHA、deployment mode、物理目录和生成时间；`deploy.sh` 重新校验绑定，不接受跨包、跨目录或超时报告。

## Migration Plan

1. 新增并验证 preflight schema、契约测试和参考文档。
2. 新构建包生成 `preflight` 声明；旧包在 `package-contract-test.sh` 或 `doctor.sh` 中明确失败并保持 dry-run。
3. 部署升级时先运行 doctor，确认端口、空间、权限和其他必需检查通过，再执行现有 release 状态机。
4. 若新包 preflight 失败，不改变 `current`、容器、Pod、配置或持久化数据；修复现场条件或重新构包后重跑。

## Open Questions

无。检查项集合、失败策略和字段边界已足以实现本次变更，具体服务可以在 manifest 中选择适用的模式检查。
