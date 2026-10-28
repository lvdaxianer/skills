# Knowledge App Reference Example

This is a layout reference derived from a read-only inspection of test host `10.100.32.70` on 2026-10-28. It is an example, not a hard-coded target. No credentials or configuration values are included.

## Observed layout

```text
/opt/knowledge-app/
├── current -> releases/kbsearch-20261028100814-c0de704
├── releases/
│   ├── kbsearch-20261027223500-1e5907b
│   ├── kbsearch-20261027224331-58747bed
│   ├── kbsearch-20261027225244-fceb812
│   ├── kbsearch-20261027225615-ab905f1
│   ├── kbsearch-20261027233948-adba3e7
│   └── kbsearch-20261028100814-c0de704
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
- The known service also has a systemd unit, but the deployment standard treats that as an optional adapter; equivalent Shell commands are valid.

## Applying the standard

For a new deployment, preserve the observed `conf/`, logs, runtime data, and external services. Prepare the new release under `releases/`, validate the external env key names and permissions, switch `current` atomically, run the service scripts and health checks, write a release record, then apply the default five-version retention policy.
