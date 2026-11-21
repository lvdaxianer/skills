#!/usr/bin/env bash
set -euo pipefail

# 这个脚本只检查交付包，不安装运行时、不连接客户环境、不修改包内容。
usage() {
  echo "用法：$0 <package-root>" >&2
}

if [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

package_root=$(cd "$1" 2>/dev/null && pwd -P) || {
  echo "部署包目录不存在或不可访问" >&2
  exit 1
}

manifest="$package_root/package-manifest.json"
checksums="$package_root/checksums.sha256"
test -f "$manifest" || { echo "缺少 package-manifest.json" >&2; exit 1; }
test -f "$checksums" || { echo "缺少 checksums.sha256" >&2; exit 1; }

# 用 Python 标准库读取清单，避免依赖现场未必安装的 jq 或第三方库。
python3 - "$package_root" "$manifest" <<'PY'
import hashlib
import json
import os
import re
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
manifest_path = Path(sys.argv[2]).resolve()
DEFAULT_PERSISTENCE_RESOURCES = {
    "frontend", "backend", "lib", "conf", "database", "object-storage",
}
REQUIRED_PREFLIGHT_CHECKS = {
    "platform", "privilege", "directories", "ports", "storage", "permissions",
    "resources", "configuration", "dependencies", "conflict", "persistence",
    "lifecycle", "security", "observability", "rollback-space",
}
PREFLIGHT_PATH_REFS = {
    "service_root", "conf", "data", "logs", "backup", "release_root",
    "docker_root", "run", "record_root",
}
MODE_PREFLIGHT_CHECKS = {
    "vm": {"runtime", "process-identity"},
    "docker": {"docker-daemon", "compose", "image", "mounts", "container-identity"},
    "kubernetes": {"kubectl", "cluster", "namespace", "rbac", "pvc", "service-exposure"},
}
PERSISTENCE_RESOURCE_CLASSES = DEFAULT_PERSISTENCE_RESOURCES | {
    "data", "logs", "index", "extension",
}


def fail(message):
    """输出不含敏感值的失败原因并立即终止校验。"""
    print(message, file=sys.stderr)
    raise SystemExit(1)


def relative_path(value, field):
    """校验清单路径为包根目录内的安全相对路径。"""
    if not isinstance(value, str) or not value or "\x00" in value or value.startswith("/"):
        fail(f"{field} 不是安全相对路径")
    parts = Path(value).parts
    if ".." in parts or "" in parts:
        fail(f"{field} 包含越界路径")
    return value


def read_manifest():
    """读取 JSON 清单，只报告异常类型，不输出文件内容。"""
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"无法读取 package-manifest.json：{type(error).__name__}")


def check_identity(manifest):
    """校验包身份、版本格式、来源提交和部署模式。"""
    if not isinstance(manifest, dict):
        fail("package-manifest.json 顶层必须是对象")
    required = {
        "schema_version", "package_name", "package_version", "application_version",
        "build_time", "source_commit", "supported_modes", "supported_os",
        "architectures", "offline_supported", "entrypoints", "mode_payloads",
        "persistence_resources", "preflight", "files",
    }
    missing = sorted(required.difference(manifest))
    if missing:
        fail(f"manifest 缺少字段：{', '.join(missing)}")
    if not isinstance(manifest["package_version"], str) or not isinstance(manifest["source_commit"], str):
        fail("package_version 和 source_commit 必须是字符串")
    if not isinstance(manifest["supported_modes"], list) or not isinstance(manifest["entrypoints"], dict):
        fail("supported_modes 必须是数组，entrypoints 必须是对象")
    if not isinstance(manifest["mode_payloads"], dict) or not isinstance(manifest["files"], list):
        fail("mode_payloads 必须是对象，files 必须是数组")
    version = manifest["package_version"]
    if not re.fullmatch(r"(?!latest$|final$|release$)[A-Za-z0-9][A-Za-z0-9._+~-]{0,63}", version):
        fail("package_version 无效或使用了不可追溯名称")
    if manifest["source_commit"] != "manual" and not re.fullmatch(r"[A-Fa-f0-9]{7,64}", manifest["source_commit"]):
        fail("source_commit 必须是提交号或 manual")
    if not manifest["supported_modes"]:
        fail("supported_modes 不能为空")
    allowed = {"vm", "docker", "kubernetes"}
    if not set(manifest["supported_modes"]).issubset(allowed):
        fail("supported_modes 含未知部署方式")


def check_persistence_catalog(manifest):
    """校验默认资源目录，确保部署前能生成客户确认表。"""
    catalog = manifest["persistence_resources"]
    if not isinstance(catalog, list) or not catalog:
        fail("persistence_resources 必须是非空数组")
    seen = set()
    for item in catalog:
        if not isinstance(item, dict):
            fail("persistence_resources 条目必须是对象")
        resource_class = item.get("resource_class")
        if resource_class not in PERSISTENCE_RESOURCE_CLASSES:
            fail(f"persistence_resources 包含未知资源：{resource_class}")
        if resource_class in seen:
            fail(f"persistence_resources 重复资源：{resource_class}")
        seen.add(resource_class)
        required = {"default_in_image", "required_confirmation", "container_path", "read_only", "override_allowed", "backup"}
        if not required.issubset(item):
            fail(f"{resource_class} 缺少持久化确认字段")
        if item["required_confirmation"] is not True:
            fail(f"{resource_class} 必须要求客户确认")
        path = item["container_path"]
        if not isinstance(path, str) or not path.startswith("/") or ".." in Path(path).parts:
            fail(f"{resource_class} 的 container_path 不安全")
        if item["override_allowed"] and not path.startswith("/app/overrides/"):
            fail(f"{resource_class} 的覆盖必须使用独立 extension point")
    missing = DEFAULT_PERSISTENCE_RESOURCES.difference(seen)
    if missing:
        fail(f"persistence_resources 缺少默认资源：{', '.join(sorted(missing))}")


def positive_integer(value, field):
    """校验 preflight 阈值为正整数且拒绝布尔值。"""
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        fail(f"{field} 必须是正整数")


def check_preflight(manifest):
    """校验端口、容量、权限和模式检查声明，不读取目标机状态。"""
    preflight = manifest.get("preflight")
    if not isinstance(preflight, dict):
        fail("缺少 preflight 契约")
    common_values = preflight.get("common_checks")
    if not isinstance(common_values, list) or not common_values or not all(isinstance(item, str) for item in common_values):
        fail("preflight.common_checks 必须是字符串数组")
    common_checks = set(common_values)
    if not common_checks.issubset(REQUIRED_PREFLIGHT_CHECKS):
        fail("preflight.common_checks 包含未知检查")
    missing_checks = REQUIRED_PREFLIGHT_CHECKS.difference(common_checks)
    if missing_checks:
        fail(f"preflight 缺少必需检查：{', '.join(sorted(missing_checks))}")
    mode_checks = preflight.get("mode_checks")
    if not isinstance(mode_checks, dict):
        fail("preflight.mode_checks 必须是对象")
    for mode in manifest["supported_modes"]:
        validate_mode_checks(mode, mode_checks.get(mode))
    validate_preflight_ports(preflight.get("ports"))
    validate_storage_requirements(preflight.get("storage"))
    validate_permission_requirements(preflight.get("permissions"))
    validate_resource_requirements(preflight.get("resources"))
    validate_dependency_requirements(preflight.get("dependencies"))


def validate_mode_checks(mode, checks):
    """校验每个支持模式声明了对应的环境检查集合。"""
    if not isinstance(checks, list) or not checks or not all(isinstance(item, str) for item in checks):
        fail(f"preflight 缺少模式检查：{mode}")
    expected = MODE_PREFLIGHT_CHECKS[mode]
    check_set = set(checks)
    if not check_set.issubset(expected) or not expected.issubset(check_set):
        fail(f"preflight 模式检查不完整：{mode}")


def validate_preflight_ports(ports):
    """校验端口冲突检查的边界和策略。"""
    if not isinstance(ports, list) or not ports:
        fail("preflight.ports 必须是非空数组")
    required_fields = {
        "name", "port", "protocol", "required", "bind_address", "exposure", "conflict_policy",
    }
    seen_ports = set()
    for port in ports:
        if not isinstance(port, dict) or not required_fields.issubset(port):
            fail("preflight.ports 缺少冲突检查字段")
        if not isinstance(port["name"], str) or not port["name"]:
            fail("preflight.ports.name 无效")
        if isinstance(port["port"], bool) or not isinstance(port["port"], int) or not 1 <= port["port"] <= 65535:
            fail("preflight.ports.port 超出范围")
        if port["protocol"] not in {"tcp", "udp"}:
            fail("preflight.ports.protocol 无效")
        if not isinstance(port["required"], bool) or not isinstance(port["bind_address"], str) or not port["bind_address"]:
            fail("preflight.ports.required 或 bind_address 无效")
        if port["exposure"] not in {"host", "container", "service", "ingress"}:
            fail("preflight.ports.exposure 无效")
        if port["conflict_policy"] not in {"must-be-free", "current-service-only", "cluster-allocated"}:
            fail("preflight.ports.conflict_policy 无效")
        identity = (port["port"], port["protocol"], port["bind_address"], port["exposure"])
        if identity in seen_ports:
            fail("preflight.ports 存在重复端口")
        seen_ports.add(identity)


def validate_storage_requirements(storage):
    """校验空间、inode 和客户目录引用。"""
    if not isinstance(storage, dict):
        fail("preflight.storage 必须是对象")
    for field in ("minimum_free_bytes", "minimum_free_inodes"):
        positive_integer(storage.get(field), f"preflight.storage.{field}")
    margin = storage.get("safety_margin_percent")
    if isinstance(margin, bool) or not isinstance(margin, int) or not 0 <= margin <= 100:
        fail("preflight.storage.safety_margin_percent 必须在 0 到 100 之间")
    paths = storage.get("paths")
    if not isinstance(paths, list) or not paths:
        fail("preflight.storage.paths 必须是非空数组")
    path_refs = set()
    for item in paths:
        if not isinstance(item, dict) or not {"path_ref", "purpose", "required"}.issubset(item):
            fail("preflight.storage.paths 缺少目录字段")
        if item["path_ref"] not in PREFLIGHT_PATH_REFS or not isinstance(item["purpose"], str) or not item["purpose"]:
            fail("preflight.storage.paths 引用或用途无效")
        if item["required"] is not True:
            fail("preflight.storage.paths.required 必须为 true")
        path_refs.add(item["path_ref"])
    required_paths = {"service_root", "conf", "data", "logs", "backup"}
    if not required_paths.issubset(path_refs) or not path_refs.issubset(PREFLIGHT_PATH_REFS):
        fail("preflight.storage.paths 缺少必需目录或包含不安全引用")


def validate_permission_requirements(permissions):
    """校验 owner、group、模式和读写执行能力目标。"""
    if not isinstance(permissions, list) or not permissions:
        fail("preflight.permissions 必须是非空数组")
    required_fields = {"path_ref", "owner_ref", "group_ref", "mode", "access", "required"}
    for item in permissions:
        if not isinstance(item, dict) or not required_fields.issubset(item):
            fail("preflight.permissions 缺少权限字段")
        if item["path_ref"] not in PREFLIGHT_PATH_REFS:
            fail("preflight.permissions.path_ref 不安全")
        if not isinstance(item["owner_ref"], str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_.:-]{0,63}", item["owner_ref"]):
            fail("preflight.permissions.owner_ref 无效")
        if not isinstance(item["group_ref"], str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_.:-]{0,63}", item["group_ref"]):
            fail("preflight.permissions.group_ref 无效")
        if not isinstance(item["mode"], str) or not re.fullmatch(r"[0-7]{3,4}", item["mode"]):
            fail("preflight.permissions.mode 格式无效")
        if not isinstance(item["access"], list) or not item["access"] or not all(isinstance(access, str) for access in item["access"]):
            fail("preflight.permissions.access 无效")
        if not set(item["access"]).issubset({"read", "write", "execute"}) or item["required"] is not True:
            fail("preflight.permissions.access 无效")


def validate_resource_requirements(resources):
    """校验主机内存、CPU、文件描述符和进程数预留。"""
    if not isinstance(resources, dict):
        fail("preflight.resources 必须是对象")
    for field in ("minimum_memory_bytes", "minimum_cpu_cores", "minimum_open_files", "minimum_processes"):
        positive_integer(resources.get(field), f"preflight.resources.{field}")


def validate_dependency_requirements(dependencies):
    """校验依赖名称和类型，不允许把连接凭据写进包清单。"""
    if not isinstance(dependencies, list):
        fail("preflight.dependencies 必须是数组")
    allowed_kinds = {"database", "cache", "object-storage", "dns", "ntp", "proxy", "registry", "other"}
    for item in dependencies:
        if not isinstance(item, dict) or not {"name", "kind", "required"}.issubset(item):
            fail("preflight.dependencies 缺少依赖字段")
        if not isinstance(item["name"], str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_.:-]{0,63}", item["name"]):
            fail("preflight.dependencies.name 无效")
        if item["kind"] not in allowed_kinds:
            fail("preflight.dependencies.kind 无效")
        if not isinstance(item["required"], bool):
            fail("preflight.dependencies.required 无效")


def check_entrypoints(manifest):
    """校验五个实施入口存在且具有执行权限。"""
    required = {"deploy", "service", "doctor", "rollback", "uninstall"}
    entries = manifest["entrypoints"]
    missing = sorted(required.difference(entries))
    if missing:
        fail(f"entrypoints 缺少：{', '.join(missing)}")
    for name in sorted(required):
        path = root / relative_path(entries[name], f"entrypoints.{name}")
        if not path.is_file() or not os.access(path, os.X_OK):
            fail(f"入口不存在或不可执行：{entries[name]}")


def check_modes(manifest):
    """校验每个支持模式的目录和必需材料。"""
    payloads = manifest["mode_payloads"]
    unsupported = manifest.get("unsupported_modes", {})
    for mode in sorted(manifest["supported_modes"]):
        payload = payloads.get(mode)
        if not isinstance(payload, dict):
            fail(f"缺少模式 payload：{mode}")
        payload_path = root / relative_path(payload.get("path", ""), f"mode_payloads.{mode}.path")
        if not payload_path.is_dir():
            fail(f"模式目录不存在：{payload_path.relative_to(root)}")
        for item in payload.get("required_files", []):
            target = root / relative_path(item, f"mode_payloads.{mode}.required_files")
            if not target.is_file():
                fail(f"模式必需文件不存在：{item}")
    for mode in sorted({"vm", "docker", "kubernetes"}.difference(manifest["supported_modes"])):
        if not unsupported.get(mode):
            fail(f"未支持模式缺少原因：{mode}")


def check_files(manifest):
    """校验 manifest 中每个文件的存在性和 SHA-256。"""
    for item in manifest["files"]:
        path = relative_path(item.get("path", ""), "files.path")
        target = root / path
        if not target.is_file():
            fail(f"清单文件不存在：{path}")
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        if digest.lower() != item.get("sha256", "").lower():
            fail(f"文件 SHA-256 不匹配：{path}")


def check_checksum_file():
    """校验 checksums 文件且禁止引用包根目录之外的路径。"""
    checksum_path = root / "checksums.sha256"
    for line_number, line in enumerate(checksum_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        fields = line.split(maxsplit=1)
        if len(fields) != 2 or not re.fullmatch(r"[A-Fa-f0-9]{64}", fields[0]):
            fail(f"checksums.sha256 第 {line_number} 行格式无效")
        path_value = fields[1][1:] if fields[1].startswith("*") else fields[1]
        path_value = relative_path(path_value, "checksums.sha256")
        target = root / path_value
        if not target.is_file():
            fail(f"checksums.sha256 引用了不存在文件：{path_value}")
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        if digest.lower() != fields[0].lower():
            fail(f"checksums.sha256 校验失败：{path_value}")


def check_links_and_secrets():
    """拒绝越界链接、特殊文件和明显敏感文件名。"""
    forbidden_names = {".env", "credentials", "id_rsa"}
    secret_markers = (b"-----BEGIN PRIVATE KEY-----", b"password=", b"token=")
    text_suffixes = {".conf", ".env", ".json", ".md", ".properties", ".sh", ".template", ".txt", ".yaml", ".yml"}
    for path in root.rglob("*"):
        if not path.is_dir() and not path.is_file() and not path.is_symlink():
            fail(f"包内存在非普通文件：{path.relative_to(root)}")
        if path.is_symlink():
            target = path.resolve()
            if root not in target.parents and target != root:
                fail(f"符号链接越界：{path.relative_to(root)}")
        name = path.name.lower()
        if name in forbidden_names or "credentials" in name or any(name.endswith(suffix) for suffix in (".pem", ".key")):
            fail(f"包内疑似敏感文件：{path.relative_to(root)}")
        if path.is_file() and path.suffix.lower() in text_suffixes and any(marker in path.read_bytes() for marker in secret_markers):
            fail(f"包内疑似敏感内容：{path.relative_to(root)}")


def main():
    """按固定顺序执行所有只读包契约检查。"""
    manifest = read_manifest()
    check_identity(manifest)
    check_persistence_catalog(manifest)
    check_preflight(manifest)
    check_entrypoints(manifest)
    check_modes(manifest)
    check_files(manifest)
    check_checksum_file()
    check_links_and_secrets()


main()
PY

echo "部署包契约校验通过：$package_root"
