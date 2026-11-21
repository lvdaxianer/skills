#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CHECKER="$SCRIPT_DIR/../scripts/package-contract-test.sh"
TEMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/preflight-contract.XXXXXX")
trap 'rm -rf "$TEMP_ROOT"' EXIT

write_package() {
  local package_root=$1
  local scenario=$2
  mkdir -p "$package_root" "$package_root/modes/vm" "$package_root/modes/docker" "$package_root/modes/kubernetes"
  for entrypoint in deploy service doctor rollback uninstall; do
    printf '#!/usr/bin/env bash\nexit 0\n' > "$package_root/$entrypoint.sh"
    chmod 755 "$package_root/$entrypoint.sh"
  done

  python3 - "$package_root/package-manifest.json" "$package_root" "$scenario" <<'PY'
import hashlib
import json
import sys
from pathlib import Path

manifest_path, root_name, scenario = sys.argv[1:]
root = Path(root_name)
required_checks = [
    "platform", "privilege", "directories", "ports", "storage", "permissions",
    "resources", "configuration", "dependencies", "conflict", "persistence",
    "lifecycle", "security", "observability", "rollback-space",
]
path_refs = ["service_root", "conf", "data", "logs", "backup", "release_root"]
preflight = {
    "common_checks": required_checks,
    "mode_checks": {
        "vm": ["runtime", "process-identity"],
        "docker": ["docker-daemon", "compose", "image", "mounts", "container-identity"],
        "kubernetes": ["kubectl", "cluster", "namespace", "rbac", "pvc", "service-exposure"],
    },
    "ports": [{
        "name": "http",
        "port": 8080,
        "protocol": "tcp",
        "required": True,
        "bind_address": "127.0.0.1",
        "exposure": "host",
        "conflict_policy": "current-service-only",
    }],
    "storage": {
        "minimum_free_bytes": 1073741824,
        "minimum_free_inodes": 10000,
        "safety_margin_percent": 20,
        "paths": [{
            "path_ref": path_ref,
            "purpose": "release and rollback capacity",
            "required": True,
        } for path_ref in path_refs],
    },
    "permissions": [{
        "path_ref": "service_root",
        "owner_ref": "deploy-user",
        "group_ref": "deploy-group",
        "mode": "0750",
        "access": ["read", "write", "execute"],
        "required": True,
    }],
    "dependencies": [],
    "resources": {
        "minimum_memory_bytes": 1073741824,
        "minimum_cpu_cores": 1,
        "minimum_open_files": 1024,
        "minimum_processes": 128,
    },
}

if scenario == "missing-port":
    preflight.pop("ports")
elif scenario == "missing-storage":
    preflight.pop("storage")
elif scenario == "missing-permissions":
    preflight.pop("permissions")
elif scenario == "invalid-threshold":
    preflight["storage"]["minimum_free_inodes"] = 0
elif scenario == "unknown-check":
    preflight["common_checks"].append("magic-fix")
elif scenario == "unsafe-path-ref":
    preflight["storage"]["paths"][0]["path_ref"] = "/tmp/customer-root"
elif scenario == "missing-mode-check":
    preflight["mode_checks"].pop("docker")

resources = []
for resource_class in ["frontend", "backend", "lib", "conf", "database", "object-storage"]:
    resources.append({
        "resource_class": resource_class,
        "default_in_image": resource_class not in {"database", "object-storage"},
        "required_confirmation": True,
        "container_path": f"/app/overrides/{resource_class}",
        "read_only": resource_class not in {"database", "object-storage"},
        "override_allowed": resource_class not in {"database", "object-storage"},
        "backup": "required",
    })

manifest = {
    "schema_version": "1",
    "package_name": "example",
    "package_version": "2.4.1",
    "application_version": "2.4.1",
    "build_time": "2026-11-21T10:00:00+08:00",
    "source_commit": "manual",
    "supported_modes": ["vm", "docker", "kubernetes"],
    "supported_os": ["linux"],
    "architectures": ["amd64"],
    "offline_supported": True,
    "required_privilege": "sudo",
    "entrypoints": {name: f"{name}.sh" for name in ["deploy", "service", "doctor", "rollback", "uninstall"]},
    "mode_payloads": {
        mode: {"path": f"modes/{mode}", "required_files": []}
        for mode in ["vm", "docker", "kubernetes"]
    },
    "persistence_resources": resources,
    "preflight": preflight,
    "files": [],
}

files = []
for path in sorted(root.rglob("*")):
    if path.is_file() and path.name != "package-manifest.json":
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        files.append({"path": str(path.relative_to(root)), "sha256": digest, "required": True})
manifest["files"] = files
manifest_path = Path(manifest_path)
manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
(root / "checksums.sha256").write_text(
    "\n".join(f"{item['sha256']}  {item['path']}" for item in files) + "\n",
    encoding="utf-8",
)
PY
}

expect_fail() {
  local name=$1
  local package_root="$TEMP_ROOT/$name"
  write_package "$package_root" "$name"
  if "$CHECKER" "$package_root" >/dev/null 2>&1; then
    echo "FAIL: $name 应该被拒绝" >&2
    exit 1
  fi
}

expect_pass() {
  local name=$1
  local package_root="$TEMP_ROOT/$name"
  write_package "$package_root" valid
  if ! "$CHECKER" "$package_root" >/dev/null 2>&1; then
    echo "FAIL: $name 应该通过" >&2
    exit 1
  fi
}

expect_pass valid
expect_fail missing-port
expect_fail missing-storage
expect_fail missing-permissions
expect_fail invalid-threshold
expect_fail unknown-check
expect_fail unsafe-path-ref
expect_fail missing-mode-check

echo "preflight contract test passed"
