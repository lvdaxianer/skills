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

For a v2 release, validate the exact new ID with the sequence state under `release-records/`; the historical current target above is not evidence that a new release may omit the suffix.

## Service behavior

- `bin/start.sh`, `bin/stop.sh`, and `bin/status.sh` validate `current` and the external env file before delegating to the service lifecycle command.
- The runtime env file is external to the release and contains names such as `KNOWLEDGE_SERVER_PORT`, `KNOWLEDGE_MANAGEMENT_PORT`, and service integration keys. Values are intentionally not documented here.
- The process loads application libraries through `/opt/knowledge-app/current`, so switching `current` changes the loaded release without copying the application in place.
- The outer `/opt/knowledge-app/bin/start.sh` checks the env file and delegates to `systemctl start knowledge-app.service`.
- The unit loads the external file through `EnvironmentFile=/opt/knowledge-app/conf/knowledge-runtime.env`; this is the systemd loading path.
- The version-local `/opt/knowledge-app/current/bin/start.sh` sources only its local `app-env.sh` and does not automatically load the outer env file. Direct Shell mode therefore needs an explicit env loader before starting Java.
- Manual foreground mode can run the Java command with `exec` in a terminal and stop with `Ctrl+C`; it does not need a PID file or systemd. Manual background mode requires an exact service-owned stop contract.
- The first deployment failure showed why version-local scripts must resolve `$0` through its physical path: both `current/bin/start.sh` and `releases/<release-id>/bin/start.sh` must report the same service root. Direct Shell mode must validate the restricted env grammar before loading `knowledge-runtime.env`.

## Applying the standard

For a new deployment, preserve the observed `conf/`, logs, runtime data, and external services. Prepare the new release under `releases/`, verify SHA-256 and archive boundaries, validate env key names/permissions without values, test both script paths, switch `current` atomically, run the full health/smoke matrix, write a schema-valid release record, then preview/apply the default five-version retention policy.

If this service is later packaged as Docker, keep the same service root and make the runtime target explicit. Select `registry`, `local-daemon` or `archive`; the image may contain default configuration and `/app/lib`; persistent host inputs belong in `conf/`, `data/`, `overrides/` and any separately declared `volumes/`. Mount `overrides/lib` at a separate `/app/overrides/lib` path and load it before packaged libraries; never mount it over `/app/lib`. Record the Registry digest or local image ID, container identity, mount manifest and override checksums, and recover them together on rollback.
