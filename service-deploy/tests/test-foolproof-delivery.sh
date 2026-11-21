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
assert_file "$skill_root/references/kubernetes-persistence.md"
assert_file "$skill_root/references/kubernetes-persistence-manifest.schema.json"
assert_file "$skill_root/scripts/package-contract-test.sh"
assert_file "$skill_root/scripts/persistence-contract-test.sh"
assert_file "$skill_root/tests/test-persistence-hard-gate.sh"

for entrypoint in deploy.sh service.sh doctor.sh rollback.sh uninstall.sh; do
  assert_contains "$entrypoint" "$skill_root/SKILL.md"
done

for reference in deployment-package.md deployment-handbook.md deployment-preflight-matrix.md deployment-package-manifest.schema.json kubernetes-persistence.md; do
  assert_contains "$reference" "$skill_root/SKILL.md"
done

for document in SKILL.md references/deployment-package.md references/deployment-handbook.md references/deployment-preflight-matrix.md references/deployment-checklist.md; do
  assert_contains "preflight" "$skill_root/$document"
  assert_contains "端口冲突" "$skill_root/$document"
  assert_contains "inode" "$skill_root/$document"
  assert_contains "权限" "$skill_root/$document"
  assert_contains "dry-run" "$skill_root/$document"
done

assert_contains "报告绑定" "$skill_root/SKILL.md"
assert_contains "不得自动杀进程" "$skill_root/references/deployment-handbook.md"
assert_contains "minimum_free_inodes" "$skill_root/references/deployment-package-manifest.schema.json"

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
    "persistence_resources",
    "files",
    "preflight",
}
missing = required.difference(schema.get("properties", {}))
if missing:
    raise SystemExit(f"schema missing properties: {sorted(missing)}")
catalog = schema["$defs"]["persistenceCatalogItem"]
catalog_required = {
    "resource_class", "default_in_image", "required_confirmation",
    "container_path", "read_only", "override_allowed", "backup",
}
if not catalog_required.issubset(catalog.get("required", [])):
    raise SystemExit("persistence catalog schema is missing confirmation fields")
expected_resources = {"frontend", "backend", "lib", "conf", "database", "object-storage"}
actual_resources = set(catalog["properties"]["resource_class"]["enum"])
if not expected_resources.issubset(actual_resources):
    raise SystemExit("persistence catalog schema is missing default resource classes")
preflight = schema["$defs"]["preflight"]
for field in {"common_checks", "mode_checks", "ports", "storage", "permissions", "resources", "dependencies"}:
    if field not in preflight["required"]:
        raise SystemExit(f"preflight schema is missing required field: {field}")
for definition in {"preflightPort", "storageRequirements", "permissionRequirement", "resourceRequirements"}:
    if definition not in schema["$defs"]:
        raise SystemExit(f"preflight schema is missing definition: {definition}")
PY

echo "foolproof delivery contract test passed"
