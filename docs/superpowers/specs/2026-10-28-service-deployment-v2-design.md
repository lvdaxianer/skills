# Service Deployment v2 设计

## 目标

把已有的 releases/current 部署模型升级为可以在 Linux 主机上逐项验收、可恢复、可审计的 v2 标准，同时兼容 systemd、manual-foreground 和 manual-background。该变更只修改 Skill 及其资源，不连接服务器、不执行真实部署、不接触环境变量值。

## 方案

`SKILL.md` 只保留适用范围、硬性门禁、执行路由和报告字段；细节放入按风险边界拆分的 references。所有部署动作先产生可验证证据，再允许进入下一状态。release ID、current 解析、外置配置、生命周期进程识别、健康检查、回滚、retention 和 release record 使用统一字段名。

新增三个 Skill 内资源：

- `references/release-record.schema.json`：验证发布记录结构、枚举和敏感字段排除规则。
- `scripts/current-contract-test.sh`：在临时或指定 service root 上验证 current/release/service-root 的物理解析、边界和两种脚本入口。
- `scripts/retention.sh`：提供 `preview` 和显式 `--apply`，删除前解析并限制在 releases 目录。

## 关键决策

1. **序列永不复用**：使用 `<service-root>/release-records/sequence.state`，owner 为部署用户、权限 `0600`；服务级 `flock` 锁覆盖序列分配到发布记录写入，失败发布仍消耗序列。
2. **路径安全优先**：所有生命周期脚本先用 `readlink -f` 或 `pwd -P` 得到物理路径，再断言 current 最终位于 `service-root/releases/`；contract test 同时调用 current 链接和真实 release 路径。
3. **配置不执行任意代码**：优先使用专用 KEY=value parser；若服务只能 source，必须先通过受限语法校验并使用子 Shell，禁止命令替换、函数、重定向、管道和执行语句。
4. **失败版本保留**：任何切换后失败都保留 release 和 record；rollback 只回到 recorded previous_release，rollback health 失败立即停止并报告 incident，不猜测第三个版本。
5. **验证不是进程存在**：status、readiness、liveness、启动日志、依赖、代理、真实 API smoke test 及加载 artifact 必须按服务能力声明；缺少关键检查时只能报告未验证。

## 验证

本地验证包括 `quick_validate.py`、Shell syntax/checks、临时目录 contract test、retention preview/apply 安全测试、JSON Schema 校验、OpenSpec strict validation、全文术语一致性检查和双副本 diff。不会执行远程 SSH 或真实服务命令。
