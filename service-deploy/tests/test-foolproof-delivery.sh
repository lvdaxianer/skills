#!/usr/bin/env bash
set -euo pipefail

skill_root=$(cd "$(dirname "$0")/.." && pwd)

assert_file() {
  local path="$1"
  test -f "$path" || {
    echo "missing required file: $path" >&2
    exit 1
  }
}

assert_contains() {
  local needle="$1"
  local path="$2"
  rg -F -- "$needle" "$path" >/dev/null || {
    echo "missing required text '$needle' in $path" >&2
    exit 1
  }
}

assert_file "$skill_root/references/deployment-package.md"
assert_file "$skill_root/references/deployment-handbook.md"
assert_file "$skill_root/references/deployment-preflight-matrix.md"
assert_file "$skill_root/references/deployment-package-manifest.schema.json"
assert_file "$skill_root/scripts/package-contract-test.sh"

for entrypoint in deploy.sh service.sh doctor.sh rollback.sh uninstall.sh; do
  assert_contains "$entrypoint" "$skill_root/SKILL.md"
done

for reference in deployment-package.md deployment-handbook.md deployment-preflight-matrix.md deployment-package-manifest.schema.json; do
  assert_contains "$reference" "$skill_root/SKILL.md"
done

python3 - "$skill_root/references/deployment-package-manifest.schema.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as stream:
    schema = json.load(stream)

required = {
    "package_name",
    "package_version",
    "application_version",
    "source_commit",
    "supported_modes",
    "supported_os",
    "architectures",
    "offline_supported",
    "files",
}
missing = required.difference(schema.get("properties", {}))
if missing:
    raise SystemExit(f"schema missing properties: {sorted(missing)}")
PY

echo "foolproof delivery contract test passed"
