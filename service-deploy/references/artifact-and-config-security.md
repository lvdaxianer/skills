# Artifact and External Configuration Security

## Artifact checksum and provenance

Require a trusted SHA-256 supplied out of band or from the release system:

```sh
printf '%s  %s\n' '<expected-sha256>' '<artifact>' | sha256sum -c -
```

If the artifact is signed or has a provenance/SBOM attestation, verify it before extraction. Signature/provenance is mandatory when the organization signs releases, the artifact crosses a trust boundary, or policy marks the service high-risk; otherwise record `not_configured` rather than claiming verification. A checksum proves integrity, not publisher identity.

## Safe archive extraction

Extract only into a newly created staging directory under the service's `releases/` filesystem. Before extracting or promoting, inspect every member:

```sh
tar -tzf "$artifact" | awk '
  /^\// || /(^|\/)\.\.($|\/)/ || /(^|\/)(conf|logs|run|release-records)(\/|$)/ { bad=1 }
  END { exit bad }
'
```

Also inspect tar metadata for symlinks and hard links. Reject links whose resolved target leaves staging or points to service-root `conf`, `logs`, `run`, `release-records`, or any path outside the release. Require exactly one expected top-level release content layout; do not silently accept a tarbomb with multiple unrelated top-level directories or an extra `package/` wrapper unless the artifact contract names it. After extraction, use `find`/`stat` to check owner/group, regular file modes, executable bits on declared scripts, required files and forbidden device files/FIFOs.

The release package MUST NOT contain live env values, private keys, or instructions that overwrite external paths. A package may contain static non-secret defaults under its own `conf/`, but promotion MUST never copy them into `<service-root>/conf`.

## Environment loading boundary

There are three distinct mechanisms:

1. **systemd `EnvironmentFile`**: the unit parses and injects variables. Check the exact file path, owner/group, mode and required key names, then use `systemctl`; do not `source` it in the deployment shell.
2. **Shell loader**: allowed only when the file passes the restricted grammar below and the service explicitly requires shell expansion. Load in a child shell with `set -a; . file; exec ...`; never print the environment.
3. **Dedicated env parser**: preferred for manual modes. Parse `KEY=value` as data, reject shell syntax, and pass an environment vector to the process without evaluating values.

If the service needs quotes, escapes, multiline values or command expansion, do not guess. Require a dedicated parser contract or refuse manual Shell mode.

## Restricted `KEY=value` grammar

The accepted source file contains only blank lines, comments beginning at column 1, or one assignment per line:

```regex
^[A-Z_][A-Z0-9_]*=[A-Za-z0-9_./:@%+,-]*$
```

This conservative grammar intentionally rejects whitespace quoting and shell syntax. Reject `$()`/backticks, `${}`, semicolons, `&`, `|`, `>`, `<`, `;`, `()`, `{}`, `eval`, `function`, `export`, here-docs, command names and newline injection. Do not use `grep` output that includes values; report only key names and line numbers.

Before load, require service-owned owner/group, mode `0640` or stricter, no world read/write, regular file, and readability by the service user. Check required keys exist and are non-empty without outputting values. Validate declared types: URL scheme/host/port, port `1..65535`, boolean `true|false`, duration with an explicit unit, positive integer limits, and minimum secret length using only length metadata. Redact values in errors.

## Configuration acceptance

The deployment record stores `environment_loading` and the config path, never values. A release-bundled env file is evidence to reject or ignore, not a source to copy. If systemd and Shell commands disagree about the loader, stop before current switch.
