# Release Naming and Retention

## Release ID

Use this exact shape:

```text
<service-name>-<YYYYMMDDHHmmss>-<version-or-commit>-<number>
```

Examples:

```text
kbsearch-20261028100814-c0de704-001
kbsearch-20261028101530-v1.2.3-002
kbsearch-20261028102000-manual-003
```

Rules:

- `service-name` is the stable lowercase service slug.
- The timestamp uses the deployment host's local clock and 24-hour format. Put the timezone offset in the release record.
- Use the first seven characters of the source Git commit when a commit is available.
- If no commit is available, use the normalized package version. If no package version exists, use `manual`.
- `number` is a service-local, three-digit, zero-padded, monotonic sequence.
- Never reuse a number, including after a release directory is removed. Persist the last allocated number in a protected release state/record before publishing.
- A release ID is immutable once allocated.

## Snapshot suffixes

The release directory is the application rollback backup. Only create separate snapshots for mutable configuration or data, and retain the release ID as the prefix:

```text
kbsearch-20261028100814-c0de704-001-config
kbsearch-20261028100814-c0de704-001-data
```

Do not put secret values in snapshot names or release records.

## Default retention

The default is to retain the five newest `verified` releases per service. A deployment may override the count, but the following protected set always wins:

1. the release targeted by `current`;
2. the previous known-good release used for rollback;
3. the release being deployed or validated;
4. any release whose last record is failed, rolled back, or not yet verified;
5. any release explicitly marked active by the service operator.

After a successful release, preview the cleanup set. Delete only older verified releases outside the protected set and only under the intended service's `releases/` directory. Record deleted IDs and the retention value in the deployment report.
