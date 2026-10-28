# Tasks

## 1. Lifecycle mode documentation

- [x] 1.1 更新 `service-deploy/SKILL.md`、新增生命周期模式 reference、更新部署清单和 knowledge-app 案例，明确 systemd、manual-foreground、manual-background、env 加载、无 PID 文件和安全停止规则；通过 Skill quick validation、规则检索、引用文件检查和敏感信息扫描
- [x] 1.2 更新 `service-deploy/evals/evals.json`，覆盖 systemd EnvironmentFile、手动前台 Ctrl+C、无 PID 文件和后台精确停止；通过 JSON schema 校验并确认每个用例有可验证 expectations
- [x] 1.3 将同一份内容同步到 `/Users/lvdaxianer/.codex/skills/service-deployment`，并通过本地 Skill quick validation、目录结构检查和名称一致性检查

## Workflow follow-up

- 完成实现、验证、审计和提交后同步主规格并归档本 OpenSpec change。
- 将任务分支合并回 `master`，确认本地注册 Skill 与仓库源文件一致。
