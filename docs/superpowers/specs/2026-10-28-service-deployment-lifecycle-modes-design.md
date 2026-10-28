# 服务部署生命周期模式设计

## 目标

让服务部署 Skill 同时支持 systemd、手动前台和手动后台三种生命周期方式，同时保持版本目录、`current` 软链接、外置配置、健康检查和回滚主流程不变。

## 设计

部署流程拆成公共发布阶段和生命周期适配阶段：

```text
预检 → 准备新版本 → 校验 → 切换 current → 生命周期适配器 → 健康检查 → 记录/回滚
```

生命周期适配器由 `lifecycle.mode` 选择：

- `systemd`：使用 unit 的 `EnvironmentFile`、启动、停止和状态命令。
- `manual-foreground`：显式加载外置 env 文件，使用 `exec` 前台启动，用户通过 `Ctrl+C` 停止，不需要 PID 文件。
- `manual-background`：允许后台启动，但必须有精确停止命令或唯一进程匹配规则，禁止 `killall java`。

外置 env 文件的加载责任随模式变化：systemd 由 unit 读取，Shell 模式由启动脚本显式加载。Skill 不打印环境变量值，也不把 PID 文件作为强制标准。

## 目录指南

```text
knowledge-app/
├── bin/                              # 外层部署管理脚本
├── releases/
│   └── <release-id>/
│       ├── bin/                      # 当前版本运行脚本
│       ├── conf/                     # 版本静态配置
│       └── lib/                      # 程序和依赖
├── current -> releases/<release-id>
├── conf/                             # 外置运行配置和敏感变量
│   └── knowledge-runtime.env
├── logs/
├── run/
└── release-records/
```

## 验收

- 文档明确 systemd、manual-foreground、manual-background 三种模式。
- 手动前台模式明确不要求 systemd 和 PID 文件，并使用 Ctrl+C 停止。
- 文档明确 `knowledge-runtime.env` 在 systemd 与 Shell 模式下的不同加载链路。
- 目录指南同时展示外层管理脚本、版本内运行脚本、外置配置和 current 软链接。
- 评测用例覆盖 systemd、手动前台、无 PID 文件和环境加载缺口。
