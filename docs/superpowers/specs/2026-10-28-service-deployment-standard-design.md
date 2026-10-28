# 服务部署标准 Skill 设计

## 目标

将 `knowledge-app` 已验证的版本化部署方式沉淀为通用 Skill：部署根目录可配置，发布版本独立保存，`current` 通过软链接指向当前版本，运行配置外置，生命周期由服务自身命令负责，并具备可审计的验证、回滚和保留清理规则。

## 方案

Skill 采用“通用流程 + references 细节 + 服务案例”的结构。

- `SKILL.md` 负责触发条件、输入参数、标准执行顺序、失败处理和安全边界。
- `references/release-layout.md` 负责目录布局和路径计算。
- `references/release-naming-and-retention.md` 负责版本命名、服务级递增序号和默认保留 5 个版本。
- `references/deployment-checklist.md` 负责预检、发布、切换、验证、回滚和清理清单。
- `references/knowledge-app-example.md` 记录当前服务器模式，仅保留路径、变量名和命令形态，不记录敏感值。
- `evals/evals.json` 验证自定义根目录、无提交元数据和回滚保留场景。

## 核心决策

### 参数化部署路径

所有路径由 `deploy_root`、`service_name` 和版本标识计算。默认根目录为 `/opt`，用户指定 `/uinnova/deploy` 时，服务目录及所有子目录都必须落在该根目录下。

### 不可变版本与 current 指针

每次发布先准备新的 `releases/<release-id>`，完成校验后再原子替换 `current`。版本目录本身就是回滚备份，不额外复制完整应用。

### 外置配置

敏感变量和环境配置位于 `<service-root>/conf/`，版本包不得覆盖它们。配置只在必要时生成带版本标识的快照。

### 服务自有生命周期命令

Skill 不强制 systemd。默认优先使用服务提供的 `bin/stop.sh`、`bin/start.sh`、`bin/status.sh` 和健康检查命令，也允许用户显式提供其他命令。

### 命名与保留

版本目录使用：

```text
<service-name>-<YYYYMMDDHHmmss>-<git-short-sha>-<number>
```

无提交记录时，第三段使用包版本号或 `manual`。序号按服务独立递增、三位补零且不复用。默认保留最近 5 个已验证版本，同时保护 current、previous、未验证版本和正在使用的版本。

## 验证与失败处理

发布必须先完成包校验、目录和权限检查、配置检查，再切换 `current`。切换后执行停止、启动、状态和应用健康检查。任何关键阶段失败，都恢复到发布前版本并重新检查旧版本；失败版本保留并生成失败记录。

## 非目标

本 Skill 不迁移远程服务、不执行真实部署、不实现 CI/CD 平台，也不处理数据库或向量库的数据迁移。

## 验收标准

- Skill 能指导默认 `/opt` 和自定义 `/uinnova/deploy` 两种部署路径。
- 文档明确包含版本命名、无提交回退、服务级递增编号和默认保留 5 个版本。
- 文档明确不强制 systemd，并以服务生命周期命令作为适配边界。
- references 内容不含真实密钥或配置值。
- OpenSpec、评测用例和结构检查均通过。
