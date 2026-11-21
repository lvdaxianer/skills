#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CHECKER="$SCRIPT_DIR/../scripts/persistence-contract-test.sh"
TEMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/persistence-hard-gate.XXXXXX")
trap 'rm -rf "$TEMP_ROOT"' EXIT

if [ ! -x "$CHECKER" ]; then
  echo "RED: persistence-contract-test.sh 尚未实现" >&2
  exit 1
fi

write_manifest() {
  local output_path=$1
  local deployment_mode=$2
  local scenario=$3
  python3 - "$output_path" "$deployment_mode" "$scenario" <<'PY'
import json
import sys

output_path, deployment_mode, scenario = sys.argv[1:]
classes = ["frontend", "backend", "lib", "conf", "database", "object-storage"]
resources = []
for resource_class in classes:
    item = {
        "resource_class": resource_class,
        "default_in_image": resource_class not in {"database", "object-storage"},
        "persistence_decision": "host-persistent" if deployment_mode == "docker" else "cluster-persistent",
        "container_path": f"/app/overrides/{resource_class}",
        "read_only": resource_class not in {"database", "object-storage"},
        "override_allowed": resource_class not in {"database", "object-storage"},
        "backup": "required",
        "restore_procedure": f"restore {resource_class} from the recorded backup",
        "confirmation": {
            "status": "confirmed",
            "confirmer": "customer-operator",
            "confirmed_at": "2026-11-21T10:00:00+08:00",
            "record_path": "/srv/example/release-records/persistence-confirmation.json",
        },
    }
    if deployment_mode == "docker":
        item["host_path"] = f"/srv/example/persistence/{resource_class}"
    else:
        item["pvc"] = {
            "name": f"example-{resource_class}",
            "namespace": "customer-prod",
            "storage_class": "customer-storage",
            "bound": True,
        }
    resources.append(item)

manifest = {
    "schema_version": "1",
    "service": "example",
    "deployment_mode": deployment_mode,
    "service_root": "/srv/example",
    "resources": resources,
}

if scenario == "missing-catalog":
    manifest["resources"] = []
elif scenario == "unconfirmed":
    manifest["resources"][0]["confirmation"]["status"] = "unconfirmed"
elif scenario == "docker-relative":
    manifest["resources"][0]["host_path"] = "relative/persistence"
elif scenario == "k8s-hostpath":
    manifest["resources"][0]["hostPath"] = "/var/lib/example"
elif scenario == "k8s-unbound":
    manifest["resources"][0]["pvc"]["bound"] = False
elif scenario == "masked-root":
    manifest["resources"][0]["container_path"] = "/app/lib"
elif scenario == "external-managed":
    for item in manifest["resources"]:
        item.pop("host_path", None)
        item.pop("pvc", None)
        item["persistence_decision"] = "external-managed"
        item["external_owner"] = "customer-database-team"
        item["endpoint_ref"] = "customer-managed://example-storage"
        item["recovery_evidence"] = "/srv/example/recovery/storage-restore-record.json"

with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2)
PY
}

expect_fail() {
  local name=$1
  local mode=$2
  local scenario=$3
  local manifest="$TEMP_ROOT/$name.json"
  write_manifest "$manifest" "$mode" "$scenario"
  if "$CHECKER" "$manifest" >/dev/null 2>&1; then
    echo "FAIL: $name 应该被拒绝" >&2
    exit 1
  fi
}

expect_pass() {
  local name=$1
  local mode=$2
  local scenario=$3
  local manifest="$TEMP_ROOT/$name.json"
  write_manifest "$manifest" "$mode" "$scenario"
  if ! "$CHECKER" "$manifest" >/dev/null 2>&1; then
    echo "FAIL: $name 应该通过" >&2
    exit 1
  fi
}

expect_fail "missing-catalog" docker missing-catalog
expect_fail "unconfirmed" docker unconfirmed
expect_fail "docker-relative" docker docker-relative
expect_fail "k8s-hostpath" kubernetes k8s-hostpath
expect_fail "k8s-unbound" kubernetes k8s-unbound
expect_fail "masked-root" docker masked-root
expect_pass "valid-docker" docker valid
expect_pass "valid-kubernetes" kubernetes valid
expect_pass "valid-external" docker external-managed

echo "persistence hard gate contract test passed"
