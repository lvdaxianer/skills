# Release Layout and Path Resolution

## Path model

Compute paths from two inputs:

```text
deploy_root  = user-provided absolute path, default /opt
service_name = stable lowercase service slug
service_root = deploy_root/service_name
```

The standard layout is:

```text
<service_root>/
├── current -> releases/<release-id>
├── releases/
│   ├── <release-id-1>/
│   └── <release-id-2>/
├── conf/
│   └── <service-runtime-config>
├── logs/
├── run/
├── release-records/
└── bin/
    ├── start.sh
    ├── stop.sh
    └── status.sh
```

The `bin/`, `logs/`, `run/`, and `release-records/` directories are conventional. Create or use them only when the service needs them. `releases/`, `current`, and the external `conf/` boundary are the core contract.

## Examples

Default root:

```text
/opt/kbsearch/releases/kbsearch-20261028100814-c0de704-001
/opt/kbsearch/current -> /opt/kbsearch/releases/kbsearch-20261028100814-c0de704-001
/opt/kbsearch/conf/knowledge-runtime.env
```

Custom root:

```text
/uinnova/deploy/kbsearch/releases/kbsearch-20261028100814-c0de704-001
/uinnova/deploy/kbsearch/current -> /uinnova/deploy/kbsearch/releases/kbsearch-20261028100814-c0de704-001
/uinnova/deploy/kbsearch/conf/knowledge-runtime.env
```

When a custom root is provided, do not write to the default `/opt/<service-name>` tree.

## Safe current switch

Before switching, resolve and record the old target. Prepare the new release completely. On systems with GNU coreutils, use a temporary symlink in the same service root and atomically rename it over `current`; verify the result with `readlink -f`. If the host's `mv` semantics differ, stop and use a host-appropriate atomic method rather than guessing.

Never switch `current` to a staging directory, an incomplete extraction, or a path outside `<service_root>/releases/`.

## Configuration boundary

The release may contain non-secret defaults or examples, but the live configuration belongs in `<service_root>/conf/`. Validate required key names and file permissions without printing values. A new release must not overwrite the external configuration merely because it contains a file with the same basename.
