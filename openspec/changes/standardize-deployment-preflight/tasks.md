# Tasks

## 1. Manifest preflight contract

- [x] 1.1 扩展 `references/deployment-package-manifest.schema.json`，增加通用/模式检查集合、端口冲突策略、存储字节/inode 预留和权限目标，并验证 schema JSON 可解析且保留现有 manifest 字段。
- [x] 1.2 先补充 `tests/test-preflight-contract.sh` 的缺字段、无效阈值、未知检查和完整清单场景，运行确认 RED，再实现 `scripts/package-contract-test.sh` 的 preflight 校验并运行 GREEN。

## 2. Skill and reference behavior

- [x] 2.1 更新 `SKILL.md` 的必需输入、零经验交付契约、有序 workflow、报告字段和 fail-closed 规则，覆盖端口、空间/inode、权限及扩展运行环境检查。
- [x] 2.2 更新 `references/deployment-preflight-matrix.md`、`deployment-package.md`、`deployment-handbook.md` 和 `deployment-checklist.md`，明确三层检查顺序、停止条件、非破坏性修复边界和模式专属检查；验证入口命令与输出示例一致。
- [x] 2.3 更新 `tests/test-foolproof-delivery.sh` 与 `evals/evals.json`，验证 preflight 引用、schema 字段和典型冲突场景均被覆盖。

## 3. Verification and audit

- [x] 3.1 运行所有 service-deploy 契约测试、OpenSpec strict validation、JSON/shell 语法检查并修复失败项。
- [x] 3.2 逐项对照规格、设计、任务和实现做一致性审计，确认不执行真实部署且报告不泄露敏感信息。

## Workflow follow-up

- 完成代码审查、每任务审计和提交后，将任务分支合并回 `master`。
- 最终验证通过后归档 `standardize-deployment-preflight` OpenSpec change。
