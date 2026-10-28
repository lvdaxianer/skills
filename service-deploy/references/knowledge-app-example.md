# Knowledge App Reference Example

This is a layout reference derived from a read-only inspection of test host `10.100.32.70` on 2026-10-28. It is an example, not a hard-coded target. No credentials or configuration values are included.

## Observed layout

```text
/opt/knowledge-app/
├── bin/                              # 外层部署管理脚本
├── releases/
│   └── kbsearch-20261028100814-c0de704-001/
│       ├── bin/                      # 当前版本运行脚本
│       ├── conf/                     # 版本静态配置
│       └── lib/                      # 程序和依赖
├── current -> releases/kbsearch-20261028100814-c0de704
├── conf/
│   └── knowledge-runtime.env
├── bin/
│   ├── start.sh
│   ├── stop.sh
│   └── status.sh
├── logs/
├── run/
└── release-records/
```

The target standard adds the service-local sequence suffix for future releases, for example `kbsearch-20261028100814-c0de704-001`. Existing names are historical evidence and must not be renamed during a normal deployment.

## Service behavior

- `bin/start.sh`, `bin/stop.sh`, and `bin/status.sh` validate `current` and the external env file before delegating to the service lifecycle command.
- The runtime env file is external to the release and contains names such as `KNOWLEDGE_SERVER_PORT`, `KNOWLEDGE_MANAGEMENT_PORT`, and service integration keys. Values are intentionally not documented here.
- The process loads application libraries through `/opt/knowledge-app/current`, so switching `current` changes the loaded release without copying the application in place.
- The outer `/opt/knowledge-app/bin/start.sh` checks the env file and delegates to `systemctl start knowledge-app.service`.
- The unit loads the external file through `EnvironmentFile=/opt/knowledge-app/conf/knowledge-runtime.env`; this is the systemd loading path.
- The version-local `/opt/knowledge-app/current/bin/start.sh` sources only its local `app-env.sh` and does not automatically load the outer env file. Direct Shell mode therefore needs an explicit env loader before starting Java.
- Manual foreground mode can run the Java command with `exec` in a terminal and stop with `Ctrl+C`; it does not need a PID file or systemd. Manual background mode requires an exact service-owned stop contract.

## Applying the standard

For a new deployment, preserve the observed `conf/`, logs, runtime data, and external services. Prepare the new release under `releases/`, validate the external env key names and permissions, switch `current` atomically, run the service scripts and health checks, write a release record, then apply the default five-version retention policy.
