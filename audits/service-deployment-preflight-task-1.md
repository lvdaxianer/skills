# Per-task Audit: service-deployment-preflight / Manifest contract

## Scope

- `service-deploy/references/deployment-package-manifest.schema.json`
- `service-deploy/scripts/package-contract-test.sh`
- `service-deploy/tests/test-preflight-contract.sh`
- OpenSpec `standardize-deployment-preflight` tasks 1.1 and 1.2

## TDD evidence

- RED：新增测试首次运行时，缺少 `preflight.ports` 的包错误通过，测试按预期失败。
- GREEN：补充 schema、common/mode 检查白名单、端口、容量/inode、目录引用、权限、资源和依赖校验后，聚焦测试通过。

## Acceptance evidence

- 完整 preflight 清单通过 package contract test。
- 缺少端口、存储或权限声明、无效 inode 阈值、未知检查、不安全路径引用和缺失 Docker 模式检查均被拒绝。
- Schema 要求通用检查、支持模式检查、端口冲突策略、空间/inode 阈值、路径引用、权限目标、主机资源和依赖字段。
- 校验器不读取目标机状态、不连接外部环境、不输出清单敏感值；错误只输出字段和非敏感原因。

## Verification

- `python3 -m json.tool service-deploy/references/deployment-package-manifest.schema.json`：通过。
- `bash -n service-deploy/scripts/package-contract-test.sh service-deploy/tests/test-preflight-contract.sh`：通过。
- `./service-deploy/tests/test-preflight-contract.sh`：通过。
- `./service-deploy/tests/test-foolproof-delivery.sh`：通过。
- `./service-deploy/tests/test-persistence-hard-gate.sh`：通过。
- `git diff --check`：通过。
- `openspec validate standardize-deployment-preflight --strict`：通过。
- `shellcheck` 和 Python `jsonschema` 模块在当前环境不可用，使用项目已有 shell 语法、标准库 JSON、契约和 OpenSpec 检查替代。

## Review gates

- `code-review-spec`：输入类型、边界、重复端口、路径引用、权限字段、依赖字段和敏感信息边界已检查；无待修复问题。
- REST API、backend、frontend、production logging 和 project-hygiene：本任务未触及，均不适用。
- Direct execution fallback：schema、嵌入式 Python checker 和测试共享同一契约，单代理执行避免拆分后的字段漂移。

## Per-task result

PASS。任务 1.1 和 1.2 的实现、测试、规格和设计一致，无未完成项或实现漂移。
